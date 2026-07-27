import { useParams, useNavigate } from "react-router-dom";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Trash2, Printer, Send, CheckCircle, Clock, X, Pencil, Download, FileText, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, formatDistanceToNow } from "date-fns";
import { buildInvoiceHtml, toInvoicePrintData } from "@/components/invoices/InvoicePrintLayout";
import { STORAGE_BUCKET, SIGNED_URL_LONG } from "@/lib/constants";
import { logActivity } from "@/lib/activityLogger";

type LineItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
  created_at: string;
};

const STATUS_FLOW: Record<string, { next: string; label: string; icon: any; color: string }> = {
  draft: { next: "issued", label: "Issue Invoice", icon: Send, color: "text-primary" },
  issued: { next: "paid", label: "Mark as Paid", icon: CheckCircle, color: "text-success" },
  paid: { next: "paid", label: "Paid", icon: CheckCircle, color: "text-success" },
  overdue: { next: "paid", label: "Mark as Paid", icon: CheckCircle, color: "text-success" },
};

const statusColor = (s: string) => {
  switch (s) {
    case "paid": return "text-success bg-success/10";
    case "issued": return "text-primary bg-primary/10";
    case "overdue": return "text-destructive bg-destructive/10";
    default: return "text-muted-foreground bg-muted";
  }
};

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const { canManage } = useOrgRole();
  const qc = useQueryClient();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", quantity: "", unit_price: "" });
  const [newItem, setNewItem] = useState({ description: "", quantity: "1", unit_price: "0" });
  const [addingItem, setAddingItem] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(name, contact_email, contact_name, phone), projects(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Auto-detect overdue — runs once when invoice loads, not inside query
  const overdueCheckedRef = useRef<string | null>(null);
  useEffect(() => {
    if (invoice && invoice.status === "issued" && invoice.due_date && isBefore(new Date(invoice.due_date), new Date()) && overdueCheckedRef.current !== invoice.id) {
      overdueCheckedRef.current = invoice.id;
      supabase.from("invoices").update({ status: "overdue" }).eq("id", invoice.id).then(() => {
        qc.invalidateQueries({ queryKey: ["invoice", id] });
      });
    }
  }, [invoice]);

  const { data: lineItems = [] } = useQuery({
    queryKey: ["invoice_line_items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data as LineItem[];
    },
    enabled: !!id,
  });

  const { data: invoiceFiles = [], refetch: refetchFiles } = useQuery({
    queryKey: ["invoice_files", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_files")
        .select("*")
        .eq("invoice_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const recalcTotals = async () => {
    const { data: items } = await supabase.from("invoice_line_items").select("amount").eq("invoice_id", id!);
    const subtotal = (items || []).reduce((sum, i) => sum + Number(i.amount), 0);
    const taxRate = Number(invoice?.tax_rate || 0);
    const discountType = (invoice as any)?.discount_type || "flat";
    const discountValue = Number((invoice as any)?.discount_amount || 0);
    const discountAmt = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;
    const afterDiscount = Math.max(0, subtotal - discountAmt);
    const taxAmount = afterDiscount * (taxRate / 100);
    await supabase.from("invoices").update({
      subtotal,
      tax_amount: taxAmount,
      amount: afterDiscount + taxAmount,
    }).eq("id", id!);
    qc.invalidateQueries({ queryKey: ["invoice", id] });
  };

  const addLineItem = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(newItem.quantity) || 0;
      const price = parseFloat(newItem.unit_price) || 0;
      const { error } = await supabase.from("invoice_line_items").insert({
        invoice_id: id!,
        description: newItem.description,
        quantity: qty,
        unit_price: price,
        amount: qty * price,
        sort_order: lineItems.length,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["invoice_line_items", id] });
      setNewItem({ description: "", quantity: "1", unit_price: "0" });
      setAddingItem(false);
      await recalcTotals();
      toast.success("Line item added");
    },
  });

  const updateLineItem = useMutation({
    mutationFn: async (itemId: string) => {
      const qty = parseFloat(editForm.quantity) || 0;
      const price = parseFloat(editForm.unit_price) || 0;
      const { error } = await supabase.from("invoice_line_items").update({
        description: editForm.description,
        quantity: qty,
        unit_price: price,
        amount: qty * price,
      }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["invoice_line_items", id] });
      setEditingItem(null);
      await recalcTotals();
      toast.success("Line item updated");
    },
  });

  const deleteLineItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("invoice_line_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["invoice_line_items", id] });
      await recalcTotals();
      toast.success("Line item removed");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const updates: Record<string, any> = { status };
      if (status === "issued") updates.issued_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("invoices").update(updates).eq("id", id!);
      if (error) throw error;
      return status;
    },
    onSuccess: async (newStatus) => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status updated");
      if (currentOrg) logActivity({ organizationId: currentOrg.id, action: "status_changed", entityType: "invoice", entityId: id, entityName: invoice?.invoice_number, metadata: { new_status: newStatus } });

      if (newStatus === "issued") {
        const clientEmail = (invoice as any)?.clients?.contact_email;
        if (clientEmail) {
          try {
            const { data, error } = await supabase.functions.invoke("send-invoice-email", {
              body: { invoice_id: id },
            });
            if (error) throw error;
            toast.success(`Invoice emailed to ${data?.sentTo}`);
          } catch (err: any) {
            toast.warning("Invoice issued, but email delivery failed. Check email configuration.");
            console.error("Email error:", err);
          }
        } else {
          toast.info("Invoice issued. No client email on file — email not sent.");
        }
      }
    },
  });

  const updateInvoiceField = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase.from("invoices").update(fields).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const handleDiscountChange = async (field: string, value: string) => {
    const updates: Record<string, any> = {};
    if (field === "discount_type") updates.discount_type = value;
    if (field === "discount_amount") updates.discount_amount = parseFloat(value) || 0;
    await supabase.from("invoices").update(updates).eq("id", id!);
    await recalcTotals();
  };

  const startEdit = (li: LineItem) => {
    setEditingItem(li.id);
    setEditForm({ description: li.description, quantity: String(li.quantity), unit_price: String(li.unit_price) });
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id: id },
      });
      if (error) throw error;
      const html = data?.html;
      if (html) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 600);
        }
        toast.success("Invoice generated — use Save as PDF in the print dialog");
        qc.invalidateQueries({ queryKey: ["invoice", id] });
        refetchFiles();
        if (currentOrg) logActivity({ organizationId: currentOrg.id, action: "generated", entityType: "invoice_file", entityId: id, entityName: invoice?.invoice_number });
      }
    } catch (err: any) {
      handleBrowserPrint();
      toast.info("Using browser print as fallback");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleOpenFile = async (storagePath: string) => {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_LONG);
    if (!data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    // Storage serves HTML as plain text; fetch and render via a blob URL instead.
    if (storagePath.endsWith(".html")) {
      try {
        const response = await fetch(data.signedUrl);
        const html = await response.text();
        const blob = new Blob([html], { type: "text/html" });
        window.open(URL.createObjectURL(blob), "_blank");
        return;
      } catch {
        // Fall through to direct open
      }
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_LONG);
    if (!data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    // For HTML files, render and trigger print-to-PDF instead of raw download
    if (fileName.endsWith(".html")) {
      try {
        const response = await fetch(data.signedUrl);
        const html = await response.text();
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 600);
          return;
        }
      } catch {
        // Fall through to direct open
      }
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleBrowserPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const printData = toInvoicePrintData(invoice, lineItems);
    const html = buildInvoiceHtml(printData);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><div className="w-2 h-2 bg-primary animate-pulse-glow" /></div>;
  }
  if (!invoice) {
    return <div className="p-8 font-mono text-sm text-muted-foreground">Invoice not found.</div>;
  }

  const isDraft = invoice.status === "draft";
  const statusAction = STATUS_FLOW[invoice.status] || STATUS_FLOW.draft;
  const StatusIcon = statusAction.icon;

  const discountType = (invoice as any)?.discount_type || "flat";
  const discountValue = Number((invoice as any)?.discount_amount || 0);
  const subtotal = Number(invoice.subtotal || 0);
  const discountAmt = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/invoices")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <p className="stat-label mb-1">Invoice</p>
          <h1 className="page-title">{invoice.invoice_number}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleBrowserPrint}
            className="h-9 px-4 bg-secondary text-secondary-foreground font-mono text-xs tracking-wide flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button onClick={handleGeneratePdf} disabled={generatingPdf}
            className="h-9 px-4 bg-secondary text-secondary-foreground font-mono text-xs tracking-wide flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> {generatingPdf ? "Generating..." : "PDF"}
          </button>
          {invoice.status !== "paid" && canManage && (
            <button onClick={() => updateStatus.mutate(statusAction.next)}
              disabled={updateStatus.isPending}
              className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              <StatusIcon className="w-3.5 h-3.5" /> {statusAction.label}
            </button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="surface border border-border p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="stat-label mb-1">Status</p>
            <span className={`font-mono text-xs px-2 py-1 ${statusColor(invoice.status)}`}>{invoice.status}</span>
          </div>
          <div>
            <p className="stat-label mb-1">Client</p>
            <p className="text-sm text-foreground">{(invoice as any).clients?.name || "—"}</p>
            {(invoice as any).clients?.contact_email && (
              <p className="font-mono text-[10px] text-muted-foreground">{(invoice as any).clients.contact_email}</p>
            )}
          </div>
          <div>
            <p className="stat-label mb-1">Issued</p>
            <p className="font-mono text-xs text-muted-foreground">{invoice.issued_date || "—"}</p>
          </div>
          <div>
            <p className="stat-label mb-1">Due Date</p>
            {isDraft ? (
              <input type="date" value={invoice.due_date || ""}
                onChange={(e) => updateInvoiceField.mutate({ due_date: e.target.value || null })}
                className="bg-background border border-border px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:border-primary" />
            ) : (
              <p className="font-mono text-xs text-muted-foreground">{invoice.due_date || "—"}</p>
            )}
          </div>
        </div>
        {(invoice as any).projects?.name && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="stat-label mb-1">Project</p>
            <p className="text-sm text-foreground">{(invoice as any).projects.name}</p>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="surface border border-border mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-medium text-foreground">Line Items</h2>
          {isDraft && canManage && (
            <button onClick={() => setAddingItem(true)}
              className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-mono text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          )}
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-3 text-left stat-label">Description</th>
              <th className="px-6 py-3 text-right stat-label w-24">Qty</th>
              <th className="px-6 py-3 text-right stat-label w-32">Unit Price</th>
              <th className="px-6 py-3 text-right stat-label w-32">Amount</th>
              {isDraft && canManage && <th className="px-4 py-3 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineItems.map((li) => (
              editingItem === li.id ? (
                <tr key={li.id} className="bg-secondary/30">
                  <td className="px-6 py-3">
                    <input autoFocus type="text" value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
                  </td>
                  <td className="px-6 py-3">
                    <input type="number" value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      className="w-full bg-transparent font-mono text-xs text-right text-foreground focus:outline-none" />
                  </td>
                  <td className="px-6 py-3">
                    <input type="number" step="0.01" value={editForm.unit_price}
                      onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                      className="w-full bg-transparent font-mono text-xs text-right text-foreground focus:outline-none" />
                  </td>
                  <td className="px-6 py-3 font-mono text-sm text-right text-foreground">
                    ${((parseFloat(editForm.quantity) || 0) * (parseFloat(editForm.unit_price) || 0)).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-1">
                    <button onClick={() => updateLineItem.mutate(li.id)} disabled={!editForm.description}
                      className="text-primary hover:text-primary/80 disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingItem(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={li.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-foreground">{li.description}</td>
                  <td className="px-6 py-4 font-mono text-xs text-right text-muted-foreground">{li.quantity}</td>
                  <td className="px-6 py-4 font-mono text-xs text-right text-muted-foreground">${Number(li.unit_price).toFixed(2)}</td>
                  <td className="px-6 py-4 font-mono text-sm text-right text-foreground">${Number(li.amount).toFixed(2)}</td>
                  {isDraft && canManage && (
                    <td className="px-4 py-4 flex items-center gap-1">
                      <button onClick={() => startEdit(li)} className="text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteLineItem.mutate(li.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            ))}
            {lineItems.length === 0 && !addingItem && (
              <tr>
                <td colSpan={isDraft && canManage ? 5 : 4} className="px-6 py-8 text-center font-mono text-sm text-muted-foreground">
                  No line items yet. {isDraft && "Click \"Add Item\" to get started."}
                </td>
              </tr>
            )}
            {addingItem && (
              <tr className="bg-secondary/30">
                <td className="px-6 py-3">
                  <input autoFocus type="text" value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Description"
                    className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground" />
                </td>
                <td className="px-6 py-3">
                  <input type="number" value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="w-full bg-transparent font-mono text-xs text-right text-foreground focus:outline-none" />
                </td>
                <td className="px-6 py-3">
                  <input type="number" step="0.01" value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                    className="w-full bg-transparent font-mono text-xs text-right text-foreground focus:outline-none" />
                </td>
                <td className="px-6 py-3 font-mono text-sm text-right text-foreground">
                  ${((parseFloat(newItem.quantity) || 0) * (parseFloat(newItem.unit_price) || 0)).toFixed(2)}
                </td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <button onClick={() => { if (newItem.description) addLineItem.mutate(); }}
                    disabled={!newItem.description || addLineItem.isPending}
                    className="text-primary hover:text-primary/80 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => setAddingItem(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex items-center justify-between">
                <span className="stat-label">Subtotal</span>
                <span className="font-mono text-sm text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              
              {/* Discount */}
              <div className="flex items-center justify-between">
                <span className="stat-label flex items-center gap-2">
                  Discount
                  {isDraft && canManage ? (
                    <>
                      <select value={discountType}
                        onChange={(e) => handleDiscountChange("discount_type", e.target.value)}
                        className="bg-background border border-border px-1 py-0.5 font-mono text-[10px] text-foreground focus:outline-none">
                        <option value="flat">$</option>
                        <option value="percent">%</option>
                      </select>
                      <input type="number" step="0.01" value={discountValue || ""}
                        onChange={(e) => handleDiscountChange("discount_amount", e.target.value)}
                        placeholder="0"
                        className="w-16 bg-background border border-border px-2 py-0.5 font-mono text-xs text-foreground focus:outline-none focus:border-primary text-right" />
                    </>
                  ) : discountAmt > 0 ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      ({discountType === "percent" ? `${discountValue}%` : "flat"})
                    </span>
                  ) : null}
                </span>
                <span className="font-mono text-sm text-destructive">
                  {discountAmt > 0 ? `-$${discountAmt.toFixed(2)}` : "$0.00"}
                </span>
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between">
                <span className="stat-label flex items-center gap-2">
                  Tax
                  {isDraft && canManage ? (
                    <input type="number" step="0.1" value={invoice.tax_rate || 0}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0;
                        const afterDisc = Math.max(0, subtotal - discountAmt);
                        const taxAmt = afterDisc * (rate / 100);
                        updateInvoiceField.mutate({ tax_rate: rate, tax_amount: taxAmt, amount: afterDisc + taxAmt });
                      }}
                      className="w-14 bg-background border border-border px-2 py-0.5 font-mono text-xs text-foreground focus:outline-none focus:border-primary text-right" />
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">({invoice.tax_rate || 0}%)</span>
                  )}
                </span>
                <span className="font-mono text-sm text-foreground">${Number(invoice.tax_amount || 0).toFixed(2)}</span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-mono text-xs font-medium text-foreground uppercase tracking-widest">Total</span>
                <span className="font-mono text-lg text-primary glow-text-cyan">${Number(invoice.amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Files */}
      <div className="surface border border-border mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-medium text-foreground flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Generated Files
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground">{invoiceFiles.length} file{invoiceFiles.length !== 1 ? "s" : ""}</span>
        </div>
        {invoiceFiles.length === 0 ? (
          <div className="px-6 py-8 text-center font-mono text-sm text-muted-foreground">
            No files generated yet. Click "PDF" to generate a snapshot.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invoiceFiles.map((f: any) => (
              <div key={f.id} className="px-6 py-3 flex items-center gap-4 hover:bg-secondary/50 transition-colors">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{f.file_name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                    {" · "}Snapshot: ${Number(f.snapshot_total).toFixed(2)} ({f.snapshot_status}) · {f.snapshot_line_item_count} items
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleOpenFile(f.storage_path)}
                    title="Open in new tab"
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDownloadFile(f.storage_path, f.file_name)}
                    title="Download"
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <InvoiceNotes invoice={invoice} isDraft={isDraft} canManage={canManage} updateField={updateInvoiceField} />
    </div>
  );
};

// Notes component with save-on-blur to avoid per-keystroke mutations
function InvoiceNotes({ invoice, isDraft, canManage, updateField }: { invoice: any; isDraft: boolean; canManage: boolean; updateField: any }) {
  const [localNotes, setLocalNotes] = useState(invoice.notes || "");
  const initialRef = useRef(invoice.notes || "");

  useEffect(() => {
    setLocalNotes(invoice.notes || "");
    initialRef.current = invoice.notes || "";
  }, [invoice.notes]);

  const handleBlur = () => {
    if (localNotes !== initialRef.current) {
      updateField.mutate({ notes: localNotes });
      initialRef.current = localNotes;
    }
  };

  return (
    <div className="surface border border-border p-6">
      <p className="stat-label mb-2">Notes</p>
      {isDraft && canManage ? (
        <textarea value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={handleBlur}
          placeholder="Add payment terms, notes, or special instructions..."
          className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary min-h-[80px] resize-none" />
      ) : (
        <p className="text-sm text-muted-foreground font-mono">{invoice.notes || "No notes."}</p>
      )}
    </div>
  );
}

export default InvoiceDetail;
