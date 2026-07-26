import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "invoices@droneops.app";

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured. Set RESEND_API_KEY secret." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = await req.json();
    const { invoice_id } = body;
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice with related data
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("*, clients(name, contact_email, contact_name, phone), projects(name), organizations(name)")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access
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

    const clientEmail = (invoice as any).clients?.contact_email;
    if (!clientEmail) {
      return new Response(JSON.stringify({ error: "Client has no contact email" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: debounce accidental duplicate sends (e.g. double-clicks or
    // client retries). Reject a resend of the same invoice within 30 seconds.
    const { force } = body;
    const lastSentAt = (invoice as any).last_sent_at ? new Date((invoice as any).last_sent_at).getTime() : 0;
    if (!force && lastSentAt && Date.now() - lastSentAt < 30_000) {
      return new Response(
        JSON.stringify({ error: "This invoice was just sent. Try again in a moment, or pass force to resend." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate PDF URL by calling generate-invoice-pdf internally
    let pdfUrl: string | null = null;
    try {
      const pdfResp = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id },
      });
      pdfUrl = pdfResp.data?.url || null;
    } catch {
      // Non-fatal — email will still send without PDF link
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

    const orgName = (invoice as any).organizations?.name || "Drone Operations";
    const clientName = (invoice as any).clients?.name || "Valued Client";
    const contactName = (invoice as any).clients?.contact_name || clientName;
    const projectName = (invoice as any).projects?.name;

    // Build email HTML
    const itemsHtml = items.map((li: any) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;">${esc(li.description)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-family:monospace;">${esc(li.quantity)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-family:monospace;">$${Number(li.unit_price).toFixed(2)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-family:monospace;">$${Number(li.amount).toFixed(2)}</td>
      </tr>`).join("");

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#0f0f0f;padding:32px 40px;">
            <p style="margin:0;color:#aaaaaa;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-family:monospace;">${esc(orgName)}</p>
            <p style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:300;letter-spacing:-0.02em;font-family:monospace;">Invoice ${esc(invoice.invoice_number)}</p>
          </td>
        </tr>
        <!-- Greeting -->
        <tr>
          <td style="padding:32px 40px 16px;">
            <p style="margin:0;color:#333;font-size:15px;">Dear ${esc(contactName)},</p>
            <p style="margin:16px 0 0;color:#555;font-size:14px;line-height:1.6;">
              Please find your invoice from <strong>${esc(orgName)}</strong> below.
              ${invoice.due_date ? `Payment is due by <strong>${esc(invoice.due_date)}</strong>.` : ""}
            </p>
            ${projectName ? `<p style="margin:8px 0 0;color:#888;font-size:13px;font-family:monospace;">Project: ${esc(projectName)}</p>` : ""}
          </td>
        </tr>
        <!-- Line Items -->
        <tr>
          <td style="padding:0 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="border-bottom:2px solid #111;">
                  <th style="padding:8px 0;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#888;font-family:monospace;font-weight:500;">Description</th>
                  <th style="padding:8px 0;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#888;font-family:monospace;font-weight:500;">Qty</th>
                  <th style="padding:8px 0;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#888;font-family:monospace;font-weight:500;">Unit Price</th>
                  <th style="padding:8px 0;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#888;font-family:monospace;font-weight:500;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <!-- Totals -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr>
                <td width="60%"></td>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#555;">Subtotal</td>
                      <td style="padding:6px 0;font-size:13px;text-align:right;font-family:monospace;">$${subtotal.toFixed(2)}</td>
                    </tr>
                    ${discountAmt > 0 ? `<tr>
                      <td style="padding:6px 0;font-size:13px;color:#dc2626;">Discount</td>
                      <td style="padding:6px 0;font-size:13px;text-align:right;font-family:monospace;color:#dc2626;">-$${discountAmt.toFixed(2)}</td>
                    </tr>` : ""}
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#555;">Tax (${taxRate}%)</td>
                      <td style="padding:6px 0;font-size:13px;text-align:right;font-family:monospace;">$${taxAmount.toFixed(2)}</td>
                    </tr>
                    <tr style="border-top:2px solid #111;">
                      <td style="padding:12px 0 4px;font-size:16px;font-weight:600;">Total</td>
                      <td style="padding:12px 0 4px;font-size:20px;font-weight:600;text-align:right;font-family:monospace;">$${total.toFixed(2)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${pdfUrl ? `<!-- PDF Link -->
        <tr>
          <td style="padding:0 40px 32px;">
            <a href="${pdfUrl}" style="display:inline-block;background:#0f0f0f;color:#ffffff;padding:12px 24px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-family:monospace;text-decoration:none;">
              View Invoice
            </a>
          </td>
        </tr>` : ""}
        ${invoice.notes ? `<!-- Notes -->
        <tr>
          <td style="padding:0 40px 32px;">
            <div style="background:#f9f9f9;border-left:3px solid #ddd;padding:16px;">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888;font-family:monospace;">Notes</p>
              <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">${esc(invoice.notes)}</p>
            </div>
          </td>
        </tr>` : ""}
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #eee;background:#fafafa;">
            <p style="margin:0;font-size:11px;color:#aaa;font-family:monospace;text-align:center;">
              ${esc(orgName)} · Invoice ${esc(invoice.invoice_number)}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [clientEmail],
        subject: `Invoice ${invoice.invoice_number} from ${orgName} — $${total.toFixed(2)} due`,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: `Email delivery failed: ${errBody}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendRes.json();

    // Record the send and transition a draft invoice to 'issued'. Non-fatal:
    // the email already went out, so a bookkeeping failure shouldn't 500.
    const nextStatus = invoice.status === "draft" ? "issued" : invoice.status;
    const { error: updateErr } = await supabase
      .from("invoices")
      .update({
        status: nextStatus,
        last_sent_at: new Date().toISOString(),
        sent_count: Number((invoice as any).sent_count || 0) + 1,
        issued_date: invoice.issued_date || (nextStatus === "issued" ? new Date().toISOString().split("T")[0] : invoice.issued_date),
      })
      .eq("id", invoice_id);
    if (updateErr) console.error("Invoice send-status update failed:", updateErr);

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id, sentTo: clientEmail, status: nextStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-invoice-email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
