import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, X, AlertCircle, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { logActivity } from "@/lib/activityLogger";

const Clients = () => {
  const { currentOrg } = useOrg();
  const { canManage, isAdmin } = useOrgRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contact_name: "", contact_email: "", phone: "", notes: "", status: "active" });
  const { confirm, ConfirmationDialog } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      openCreate();
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ["clients", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, projects:projects(id)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const upsertClient = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Company name is required");
      if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) throw new Error("Invalid email address");
      if (editing) {
        const { error } = await supabase.from("clients").update({
          name: form.name.trim(), contact_name: form.contact_name.trim() || null, contact_email: form.contact_email.trim() || null,
          phone: form.phone.trim() || null, notes: form.notes.trim() || null, status: form.status as any,
        }).eq("id", editing.id);
        if (error) throw error;
        return { id: editing.id, name: form.name.trim(), isEdit: true };
      } else {
        const { data, error } = await supabase.from("clients").insert({
          organization_id: currentOrg!.id, name: form.name.trim(),
          contact_name: form.contact_name.trim() || null, contact_email: form.contact_email.trim() || null,
          phone: form.phone.trim() || null, notes: form.notes.trim() || null, status: form.status as any,
        }).select("id").single();
        if (error) throw error;
        return { id: data.id, name: form.name.trim(), isEdit: false };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      closeForm();
      toast.success(result.isEdit ? "Client updated" : "Client created");
      logActivity({ organizationId: currentOrg!.id, action: result.isEdit ? "updated" : "created", entityType: "client", entityId: result.id, entityName: result.name });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteClient = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client_projects", result.id] });
      qc.invalidateQueries({ queryKey: ["client_invoices", result.id] });
      qc.invalidateQueries({ queryKey: ["client_documents", result.id] });
      qc.invalidateQueries({ queryKey: ["client_activity", result.id] });
      toast.success("Client deleted");
      logActivity({ organizationId: currentOrg!.id, action: "deleted", entityType: "client", entityId: result.id, entityName: result.name });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", contact_name: "", contact_email: "", phone: "", notes: "", status: "active" });
    setFormOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, contact_name: c.contact_name || "", contact_email: c.contact_email || "", phone: c.phone || "", notes: c.notes || "", status: c.status });
    setFormOpen(true);
  };

  const closeForm = useCallback(() => { setFormOpen(false); setEditing(null); }, []);

  // Escape key handler for modal
  useEffect(() => {
    if (!formOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closeForm(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [formOpen, closeForm]);

  const filtered = clients.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">Operations</p>
          <h1 className="page-title">Clients</h1>
        </div>
        {canManage && (
          <button onClick={openCreate} className="h-10 px-4 bg-primary text-primary-foreground font-mono text-sm tracking-wide flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        )}
      </div>

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={closeForm}>
          <div className="surface border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-mono text-sm font-medium text-foreground">{editing ? "Edit Client" : "New Client"}</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); upsertClient.mutate(); }} className="p-6 space-y-4">
              <div>
                <label className="stat-label block mb-2">Company Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="stat-label block mb-2">Contact Name</label>
                  <input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="John Doe" />
                </div>
                <div>
                  <label className="stat-label block mb-2">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="stat-label block mb-2">Email</label>
                  <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="john@acme.com" />
                </div>
                <div>
                  <label className="stat-label block mb-2">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="+1 555 0123" />
                </div>
              </div>
              <div>
                <label className="stat-label block mb-2">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary resize-none" placeholder="Internal notes..." />
              </div>
              <button type="submit" disabled={upsertClient.isPending}
                className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
                {upsertClient.isPending ? "Saving..." : editing ? "Update Client" : "Create Client"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="surface border border-border mb-6 flex items-center px-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent px-3 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none" />
      </div>

      {/* Error state */}
      {error && (
        <div className="surface border border-destructive/30 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="font-mono text-xs text-destructive">Failed to load clients. Please try again.</p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="p-8 text-center"><div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No clients match your search" : "No clients yet"}
          description={search
            ? "Try a different search term."
            : "Clients represent the companies or individuals you do work for. Add a client to start linking projects and invoices."}
          action={!search && canManage ? { label: "Add Client", onClick: openCreate } : undefined}
        />
      ) : (
        <div className="surface border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left stat-label">Client</th>
                <th className="px-6 py-3 text-left stat-label">Contact</th>
                <th className="px-6 py-3 text-left stat-label">Email</th>
                <th className="px-6 py-3 text-left stat-label">Projects</th>
                <th className="px-6 py-3 text-left stat-label">Status</th>
                <th className="px-6 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/clients/${c.id}`} className="text-sm text-foreground hover:text-primary transition-colors">{c.name}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.contact_name || "—"}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.contact_email || "—"}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.projects?.length || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`font-mono text-xs px-2 py-1 ${c.status === "active" ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => confirm({
                          title: "Delete Client",
                          description: `Delete "${c.name}"? This will also remove linked projects and invoices. This cannot be undone.`,
                          confirmLabel: "Delete Client",
                          variant: "destructive",
                          onConfirm: async () => { await deleteClient.mutateAsync({ id: c.id, name: c.name }); },
                        })}
                          className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmationDialog />
    </div>
  );
};

export default Clients;
