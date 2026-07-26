import { Plus, Search, Trash2, AlertCircle, FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { isBefore } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { logActivity } from "@/lib/activityLogger";

const Invoices = () => {
  const { currentOrg } = useOrg();
  const { canManage, isAdmin } = useOrgRole();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    invoice_number: "",
    client_id: searchParams.get("client_id") || "",
    project_id: searchParams.get("project_id") || "",
    due_date: "",
  });
  const { confirm, ConfirmationDialog } = useConfirm();

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setAddOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("action");
      // preserve client_id/project_id params
      navigate(`?${newParams.toString()}`, { replace: true });
    }
  }, [searchParams]);

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ["invoices", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(name), projects(name)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients_list", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("organization_id", currentOrg!.id).order("name");
      return data || [];
    },
    enabled: !!currentOrg && addOpen,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_list", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", currentOrg!.id).order("name");
      return data || [];
    },
    enabled: !!currentOrg && addOpen,
  });

  const nextInvoiceNumber = `INV-${String((invoices.length || 0) + 1).padStart(4, "0")}`;

  const createInvoice = useMutation({
    mutationFn: async () => {
      const num = form.invoice_number || nextInvoiceNumber;
      const { data, error } = await supabase.from("invoices").insert({
        organization_id: currentOrg!.id,
        invoice_number: num,
        amount: 0,
        subtotal: 0,
        client_id: form.client_id || null,
        project_id: form.project_id || null,
        due_date: form.due_date || null,
        status: "draft",
      }).select().single();
      if (error) throw error;
      return { ...data, invoice_number: num };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setAddOpen(false);
      setForm({ invoice_number: "", client_id: "", project_id: "", due_date: "" });
      navigate(`/invoices/${data.id}`);
      toast.success("Invoice created — add line items to build your total");
      logActivity({ organizationId: currentOrg!.id, action: "created", entityType: "invoice", entityId: data.id, entityName: data.invoice_number });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteInvoice = useMutation({
    mutationFn: async ({ id, number }: { id: string; number: string }) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      return { id, number };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
      logActivity({ organizationId: currentOrg!.id, action: "deleted", entityType: "invoice", entityId: result.id, entityName: result.number });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const now = new Date();
  const filtered = invoices.filter((inv: any) => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.clients?.name?.toLowerCase().includes(search.toLowerCase());
    // Auto-detect overdue for display
    const displayStatus = inv.status === "issued" && inv.due_date && isBefore(new Date(inv.due_date), now) ? "overdue" : inv.status;
    const matchesStatus = !statusFilter || displayStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColor = (s: string, dueDate?: string | null) => {
    const effective = s === "issued" && dueDate && isBefore(new Date(dueDate), now) ? "overdue" : s;
    switch (effective) {
      case "paid": return "text-success bg-success/10";
      case "issued": return "text-primary bg-primary/10";
      case "overdue": return "text-destructive bg-destructive/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getDisplayStatus = (s: string, dueDate?: string | null) => {
    if (s === "issued" && dueDate && isBefore(new Date(dueDate), now)) return "overdue";
    return s;
  };

  const totalAmount = invoices.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const paidAmount = invoices.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + Number(i.amount), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">Finance</p>
          <h1 className="page-title">Invoices</h1>
        </div>
        {canManage && (
          <button onClick={() => setAddOpen(true)}
            className="h-10 px-4 bg-primary text-primary-foreground font-mono text-sm tracking-wide flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-px bg-border mb-6">
        <div className="surface p-5">
          <p className="stat-label mb-1">Total Invoiced</p>
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

      {/* Create Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">New Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createInvoice.mutate(); }} className="space-y-4">
            <div>
              <label className="stat-label block mb-2">Invoice #</label>
              <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                placeholder={nextInvoiceNumber} className="font-mono text-sm" />
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Leave blank to auto-generate</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="stat-label block mb-2">Client</label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">None</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-2">Project</label>
                <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">None</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="stat-label block mb-2">Due Date</label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="font-mono text-sm" />
            </div>
            <button type="submit" disabled={createInvoice.isPending}
              className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50 rounded-md">
              {createInvoice.isPending ? "Creating..." : "Create Invoice"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 surface border border-border flex items-center px-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-3 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border px-3 py-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {error && (
        <div className="surface border border-destructive/30 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <p className="font-mono text-xs text-destructive">Failed to load invoices.</p>
        </div>
      )}

      <div className="surface border border-border">
        {isLoading ? (
          <div className="p-8 text-center"><div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search || statusFilter ? "No invoices match your filters" : "No invoices yet"}
            description={search || statusFilter
              ? "Try adjusting your search or filter criteria."
              : "Create your first invoice to start tracking payments. Link invoices to clients and projects for organized billing."}
            action={!search && !statusFilter && canManage ? { label: "New Invoice", onClick: () => setAddOpen(true) } : undefined}
            hints={!search && !statusFilter ? [{ label: "Add a client first", href: "/clients" }] : undefined}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left stat-label">Invoice</th>
                <th className="px-6 py-3 text-left stat-label">Client</th>
                <th className="px-6 py-3 text-left stat-label">Project</th>
                <th className="px-6 py-3 text-left stat-label">Amount</th>
                <th className="px-6 py-3 text-left stat-label">Due</th>
                <th className="px-6 py-3 text-left stat-label">Status</th>
                <th className="px-6 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv: any) => {
                const displayStatus = getDisplayStatus(inv.status, inv.due_date);
                return (
                  <tr key={inv.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td className="px-6 py-4 font-mono text-xs text-primary">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inv.clients?.name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inv.projects?.name || "—"}</td>
                    <td className="px-6 py-4 font-mono text-sm text-foreground">${Number(inv.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{inv.due_date || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-xs px-2 py-1 ${statusColor(inv.status, inv.due_date)}`}>{displayStatus}</span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {inv.status === "draft" && isAdmin && (
                        <button onClick={() => confirm({
                          title: "Delete Invoice",
                          description: `Delete invoice ${inv.invoice_number}? This will also remove all line items. This cannot be undone.`,
                          confirmLabel: "Delete Invoice",
                          variant: "destructive",
                          onConfirm: async () => { await deleteInvoice.mutateAsync({ id: inv.id, number: inv.invoice_number }); },
                        })}
                          className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmationDialog />
    </div>
  );
};

export default Invoices;
