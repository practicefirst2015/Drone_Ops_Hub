/**
 * Generates a standalone HTML document string for invoice printing/PDF export.
 * Used by both the browser print flow and the server-side edge function.
 */

export interface InvoicePrintData {
  invoice_number: string;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  notes: string | null;
  subtotal: number;
  discount_type: string;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  client_name?: string;
  client_contact_name?: string;
  client_email?: string;
  client_phone?: string;
  project_name?: string;
  line_items: {
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }[];
}

export function buildInvoiceHtml(data: InvoicePrintData): string {
  const {
    invoice_number, status, issued_date, due_date, notes,
    subtotal, discount_type, discount_amount, tax_rate, tax_amount, amount,
    client_name, client_contact_name, client_email, client_phone,
    project_name, line_items,
  } = data;

  const discountAmt = discount_type === "percent"
    ? subtotal * (discount_amount / 100)
    : discount_amount;

  const itemsHtml = line_items.map(li => `
    <tr>
      <td>${li.description}</td>
      <td class="amt">${li.quantity}</td>
      <td class="amt">$${Number(li.unit_price).toFixed(2)}</td>
      <td class="amt">$${Number(li.amount).toFixed(2)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${invoice_number}</title>
<style>
  @page { margin: 40px; size: letter; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', 'Inter', -apple-system, sans-serif;
    color: #0f0f0f;
    padding: 48px;
    max-width: 820px;
    margin: 0 auto;
    font-size: 14px;
    line-height: 1.5;
  }

  /* Header */
  .hdr {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 48px;
    padding-bottom: 24px;
    border-bottom: 2px solid #111;
  }
  .inv-num {
    font-size: 32px;
    font-weight: 300;
    letter-spacing: -0.03em;
    font-family: 'Courier New', monospace;
    line-height: 1;
  }
  .meta {
    font-size: 12px;
    color: #555;
    margin-top: 10px;
    line-height: 1.7;
    font-family: 'Courier New', monospace;
  }
  .badge {
    display: inline-block;
    margin-top: 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    padding: 3px 14px;
    border: 1px solid #bbb;
    font-family: 'Courier New', monospace;
  }
  .badge.paid { border-color: #16a34a; color: #16a34a; }
  .badge.overdue { border-color: #dc2626; color: #dc2626; }
  .client-block { text-align: right; }
  .client-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }

  /* Project */
  .project-row {
    margin-bottom: 28px;
    font-size: 12px;
    color: #666;
    font-family: 'Courier New', monospace;
  }
  .project-row strong { color: #111; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #888;
    padding: 10px 0;
    border-bottom: 1px solid #ddd;
    font-family: 'Courier New', monospace;
  }
  th.amt, td.amt { text-align: right; }
  td {
    padding: 13px 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
  }
  td.amt { font-family: 'Courier New', monospace; }

  /* Totals */
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
  .totals { width: 300px; }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    font-size: 13px;
  }
  .totals .row span:last-child { font-family: 'Courier New', monospace; }
  .totals .discount { color: #dc2626; }
  .totals .grand {
    font-weight: 600;
    font-size: 20px;
    border-top: 2px solid #111;
    padding-top: 12px;
    margin-top: 8px;
  }

  /* Notes */
  .notes {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid #e5e5e5;
    font-size: 12px;
    color: #555;
    line-height: 1.7;
  }
  .notes strong { color: #333; }

  /* Footer */
  .footer {
    margin-top: 64px;
    font-size: 10px;
    color: #aaa;
    text-align: center;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.06em;
  }

  @media print {
    body { padding: 20px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="inv-num">${invoice_number}</div>
    <div class="meta">
      Issued: ${issued_date || "—"}<br>
      Due: ${due_date || "—"}
    </div>
    <div class="badge ${status}">${status}</div>
  </div>
  <div class="client-block">
    ${client_name ? `<div class="client-name">${client_name}</div>` : ""}
    <div class="meta">
      ${client_contact_name || ""}<br>
      ${client_email || ""}<br>
      ${client_phone || ""}
    </div>
  </div>
</div>

${project_name ? `<div class="project-row">Project: <strong>${project_name}</strong></div>` : ""}

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th class="amt">Qty</th>
      <th class="amt">Unit Price</th>
      <th class="amt">Amount</th>
    </tr>
  </thead>
  <tbody>${itemsHtml}</tbody>
</table>

<div class="totals-wrap">
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    ${discountAmt > 0 ? `<div class="row discount"><span>Discount${discount_type === "percent" ? ` (${discount_amount}%)` : ""}</span><span>-$${discountAmt.toFixed(2)}</span></div>` : ""}
    <div class="row"><span>Tax (${tax_rate}%)</span><span>$${tax_amount.toFixed(2)}</span></div>
    <div class="row grand"><span>Total</span><span>$${amount.toFixed(2)}</span></div>
  </div>
</div>

${notes ? `<div class="notes"><strong>Notes</strong><br>${notes}</div>` : ""}

<div class="footer">Generated ${new Date().toISOString().split("T")[0]}</div>
</body>
</html>`;
}

/**
 * Extracts InvoicePrintData from the invoice query result and line items.
 */
export function toInvoicePrintData(invoice: any, lineItems: any[]): InvoicePrintData {
  return {
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    issued_date: invoice.issued_date,
    due_date: invoice.due_date,
    notes: invoice.notes,
    subtotal: Number(invoice.subtotal || 0),
    discount_type: invoice.discount_type || "flat",
    discount_amount: Number(invoice.discount_amount || 0),
    tax_rate: Number(invoice.tax_rate || 0),
    tax_amount: Number(invoice.tax_amount || 0),
    amount: Number(invoice.amount || 0),
    client_name: invoice.clients?.name,
    client_contact_name: invoice.clients?.contact_name,
    client_email: invoice.clients?.contact_email,
    client_phone: invoice.clients?.phone,
    project_name: invoice.projects?.name,
    line_items: (lineItems || []).map((li: any) => ({
      description: li.description,
      quantity: Number(li.quantity),
      unit_price: Number(li.unit_price),
      amount: Number(li.amount),
    })),
  };
}
