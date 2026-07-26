import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ALLOW_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice with related data
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("*, clients(name, contact_email, contact_name, phone), projects(name)")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access to this org
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", invoice.organization_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("sort_order");

    const items = lineItems || [];
    const subtotal = Number(invoice.subtotal || 0);
    const discountType = invoice.discount_type || "flat";
    const discountValue = Number(invoice.discount_amount || 0);
    const discountAmt = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;
    const taxRate = Number(invoice.tax_rate || 0);
    const taxAmount = Number(invoice.tax_amount || 0);
    const total = Number(invoice.amount || 0);

    // Build HTML
    const itemsHtml = items.map((li: any) => `
    <tr>
      <td>${esc(li.description)}</td>
      <td class="amt">${esc(li.quantity)}</td>
      <td class="amt">$${Number(li.unit_price).toFixed(2)}</td>
      <td class="amt">$${Number(li.amount).toFixed(2)}</td>
    </tr>`).join("");

    const generatedDate = new Date().toISOString().split("T")[0];

    const html = buildHtml({
      invoiceNumber: invoice.invoice_number,
      status: invoice.status,
      issuedDate: invoice.issued_date,
      dueDate: invoice.due_date,
      clientName: invoice.clients?.name,
      clientContactName: invoice.clients?.contact_name,
      clientEmail: invoice.clients?.contact_email,
      clientPhone: invoice.clients?.phone,
      projectName: invoice.projects?.name,
      itemsHtml,
      subtotal,
      discountAmt,
      discountType,
      discountValue,
      taxRate,
      taxAmount,
      total,
      notes: invoice.notes,
      generatedDate,
    });

    // Upload to storage
    const safeNumber = invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, "_");
    const timestamp = Date.now();
    const fileName = `invoices/${invoice.organization_id}/${safeNumber}_${timestamp}.html`;

    const htmlBlob = new Blob([html], { type: "text/html" });
    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(fileName, htmlBlob, { contentType: "text/html", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ html, url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create signed URL
    const { data: signedData } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(fileName, 3600);

    // Save file record with snapshot data
    const { error: fileRecordError } = await supabase
      .from("invoice_files")
      .insert({
        invoice_id,
        organization_id: invoice.organization_id,
        file_name: `${invoice.invoice_number}_${generatedDate}.html`,
        storage_path: fileName,
        file_size_bytes: new TextEncoder().encode(html).length,
        snapshot_subtotal: subtotal,
        snapshot_tax_amount: taxAmount,
        snapshot_discount_amount: discountAmt,
        snapshot_total: total,
        snapshot_status: invoice.status,
        snapshot_line_item_count: items.length,
        generated_by: userId,
      });

    if (fileRecordError) {
      console.error("File record error:", fileRecordError);
    }

    return new Response(
      JSON.stringify({
        url: signedData?.signedUrl || null,
        html,
        file_path: fileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("PDF generation error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── HTML builder ──────────────────────────────────────────────
const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

interface HtmlParams {
  invoiceNumber: string;
  status: string;
  issuedDate: string | null;
  dueDate: string | null;
  clientName?: string;
  clientContactName?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectName?: string;
  itemsHtml: string;
  subtotal: number;
  discountAmt: number;
  discountType: string;
  discountValue: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  generatedDate: string;
}

function buildHtml(p: HtmlParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(p.invoiceNumber)}</title>
<style>
  @page { margin: 40px; size: letter; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', 'Inter', -apple-system, sans-serif;
    color: #0f0f0f; padding: 48px; max-width: 820px;
    margin: 0 auto; font-size: 14px; line-height: 1.5;
  }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #111; }
  .inv-num { font-size: 32px; font-weight: 300; letter-spacing: -0.03em;
    font-family: 'Courier New', monospace; line-height: 1; }
  .meta { font-size: 12px; color: #555; margin-top: 10px; line-height: 1.7;
    font-family: 'Courier New', monospace; }
  .badge { display: inline-block; margin-top: 10px; font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.14em; padding: 3px 14px;
    border: 1px solid #bbb; font-family: 'Courier New', monospace; }
  .badge.paid { border-color: #16a34a; color: #16a34a; }
  .badge.overdue { border-color: #dc2626; color: #dc2626; }
  .client-block { text-align: right; }
  .client-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
  .project-row { margin-bottom: 28px; font-size: 12px; color: #666;
    font-family: 'Courier New', monospace; }
  .project-row strong { color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.12em; color: #888; padding: 10px 0;
    border-bottom: 1px solid #ddd; font-family: 'Courier New', monospace; }
  th.amt, td.amt { text-align: right; }
  td { padding: 13px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  td.amt { font-family: 'Courier New', monospace; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
  .totals { width: 300px; }
  .totals .row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; }
  .totals .row span:last-child { font-family: 'Courier New', monospace; }
  .totals .discount { color: #dc2626; }
  .totals .grand { font-weight: 600; font-size: 20px; border-top: 2px solid #111;
    padding-top: 12px; margin-top: 8px; }
  .notes { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e5e5;
    font-size: 12px; color: #555; line-height: 1.7; }
  .notes strong { color: #333; }
  .footer { margin-top: 64px; font-size: 10px; color: #aaa; text-align: center;
    font-family: 'Courier New', monospace; letter-spacing: 0.06em; }
  @media print { body { padding: 20px; } .no-print { display: none !important; } }
</style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="inv-num">${esc(p.invoiceNumber)}</div>
    <div class="meta">
      Issued: ${esc(p.issuedDate || "—")}<br>
      Due: ${esc(p.dueDate || "—")}
    </div>
    <div class="badge ${esc(p.status)}">${esc(p.status)}</div>
  </div>
  <div class="client-block">
    ${p.clientName ? `<div class="client-name">${esc(p.clientName)}</div>` : ""}
    <div class="meta">
      ${esc(p.clientContactName || "")}<br>
      ${esc(p.clientEmail || "")}<br>
      ${esc(p.clientPhone || "")}
    </div>
  </div>
</div>

${p.projectName ? `<div class="project-row">Project: <strong>${esc(p.projectName)}</strong></div>` : ""}

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th class="amt">Qty</th>
      <th class="amt">Unit Price</th>
      <th class="amt">Amount</th>
    </tr>
  </thead>
  <tbody>${p.itemsHtml}</tbody>
</table>

<div class="totals-wrap">
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>$${p.subtotal.toFixed(2)}</span></div>
    ${p.discountAmt > 0 ? `<div class="row discount"><span>Discount${p.discountType === "percent" ? ` (${p.discountValue}%)` : ""}</span><span>-$${p.discountAmt.toFixed(2)}</span></div>` : ""}
    <div class="row"><span>Tax (${p.taxRate}%)</span><span>$${p.taxAmount.toFixed(2)}</span></div>
    <div class="row grand"><span>Total</span><span>$${p.total.toFixed(2)}</span></div>
  </div>
</div>

${p.notes ? `<div class="notes"><strong>Notes</strong><br>${esc(p.notes)}</div>` : ""}

<div class="footer">Generated ${p.generatedDate} · Snapshot at time of generation</div>
</body>
</html>`;
}
