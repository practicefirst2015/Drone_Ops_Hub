import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, isBefore } from "date-fns";
import { Search, FileText, DollarSign, Download, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

const statusColor = (s: string, dueDate?: string | null) => {
  const now = new Date();
  const effective = s === "issued" && dueDate && isBefore(new Date(dueDate), now) ? "overdue" : s;
  switch (effective) {
    case "paid": return "text-success bg-success/10";
    case "issued": return "text-primary bg-primary/10";
    case "overdue": return "text-destructive bg-destructive/10";
    default: return "text-muted-foreground bg-muted";
  }
};

const getDisplayStatus = (s: string, dueDate?: string | null) => {
  const now = new Date();
  if (s === "issued" && dueDate && isBefore(new Date(dueDate), now)) return "overdue";
  return s;
};

function useDownloadInvoicePdf(invoiceId: string) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      const html = data?.html;
      if (html) {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          setTimeout(() => w.print(), 600);
        }
      } else {
        toast.error("Could not generate PDF");
      }
    } catch {
      toast.error("PDF generation failed");
    } finally {
      setLoading(false);
    }
  };

  return { download, loading };
}

function DownloadPdfButton({ invoiceId }: { invoiceId: string }) {
  const { download, loading } = useDownloadInvoicePdf(invoiceId);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); download(); }}
      disabled={loading}
      title="Open printable invoice"
      className="p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
    </button>
  );
}

const PortalInvoices = () => {
  const { currentOrg } = useOrg();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["portal_all_invoices", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, issued_date, projects(name)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const filtered = invoices.filter((inv: any) => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.projects?.name?.toLowerCase().includes(search.toLowerCase());
    const displayStatus = getDisplayStatus(inv.status, inv.due_date);
    const matchStatus = !statusFilter || displayStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAmount = invoices.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const paidAmount = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount), 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="stat-label mb-1">Client Portal</p>
        <h1 className="page-title">Invoices</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-px bg-border mb-6">
        <div className="surface p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="stat-label">Total Billed</p>
          </div>
          <p className="font-mono text-lg text-foreground">${totalAmount.toLocaleString()}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label mb-1">Paid</p>
          <p className="font-mono text-lg text-success">${paidAmount.toLocaleString()}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label mb-1">Outstanding</p>
          <p className="font-mono text-lg text-warning">${(totalAmount - paidAmount).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 surface border border-border flex items-center px-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-3 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border px-3 py-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="surface border border-border">
        {isLoading ? (
          <div className="p-8 text-center"><div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search || statusFilter ? "No invoices match your filters" : "No invoices yet"}
            description="Your invoices will appear here."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left stat-label">Invoice</th>
                <th className="px-6 py-3 text-left stat-label">Project</th>
                <th className="px-6 py-3 text-left stat-label">Amount</th>
                <th className="px-6 py-3 text-left stat-label">Issued</th>
                <th className="px-6 py-3 text-left stat-label">Due</th>
                <th className="px-6 py-3 text-left stat-label">Status</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv: any) => {
                const displayStatus = getDisplayStatus(inv.status, inv.due_date);
                return (
                  <tr key={inv.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-foreground">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inv.projects?.name || "—"}</td>
                    <td className="px-6 py-4 font-mono text-sm text-foreground">${Number(inv.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {inv.issued_date ? format(new Date(inv.issued_date), "MMM d") : "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {inv.due_date ? format(new Date(inv.due_date), "MMM d") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-xs px-2 py-1 ${statusColor(inv.status, inv.due_date)}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <DownloadPdfButton invoiceId={inv.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PortalInvoices;
