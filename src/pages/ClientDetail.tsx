import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, AlertCircle, Plus, Pencil, X, FileText,
  DollarSign, FolderOpen, Clock, Building2, Mail, Phone, StickyNote,
} from "lucide-react";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProjects } from "@/hooks/useProjectData";
import { format } from "date-fns";
import { logActivity } from "@/lib/activityLogger";
import { ActivityFeed } from "@/components/ActivityFeed";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useOrg();
  const { canManage } = useOrgRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { createProject } = useProjects();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", contact_name: "", contact_email: "", phone: "", notes: "", status: "active" });
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "", status: "draft", start_date: "", end_date: "" });

  // Client
  const { data: client, isLoading, error } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Projects
  const { data: projects = [] } = useQuery({
    queryKey: ["client_projects", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, progress, start_date, end_date, budget")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["client_invoices", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, issued_date, project_id, projects(name)")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Documents (from linked projects)
  const projectIds = projects.map((p: any) => p.id);
  const { data: documents = [] } = useQuery({
    queryKey: ["client_documents", id, projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("project_documents")
        .select("*, profiles:uploaded_by(full_name), projects:project_id(name)")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  // Notes (from linked projects — last activity)
  const { data: recentNotes = [] } = useQuery({
    queryKey: ["client_activity", id, projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("project_notes")
        .select("*, profiles:user_id(full_name), projects:project_id(name)")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  // Escape key handler for modals
  useEffect(() => {
    if (!editing && !projectDialogOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setEditing(false); setProjectDialogOpen(false); }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [editing, projectDialogOpen]);

  // Update client
  const updateClient = useMutation({
    mutationFn: async () => {
      if (editForm.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.contact_email)) throw new Error("Invalid email address");
      const { error } = await supabase.from("clients").update({
        name: editForm.name,
        contact_name: editForm.contact_name || null,
        contact_email: editForm.contact_email || null,
        phone: editForm.phone || null,
        notes: editForm.notes || null,
        status: editForm.status as any,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEditing(false);
      toast.success("Client updated");
      if (currentOrg && client) logActivity({ organizationId: currentOrg.id, action: "updated", entityType: "client", entityId: id!, entityName: editForm.name });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "text-primary bg-primary/10";
      case "paid": return "text-emerald-400 bg-emerald-400/10";
      case "sent": return "text-primary bg-primary/10";
      case "complete": return "text-emerald-400 bg-emerald-400/10";
      case "overdue": return "text-destructive bg-destructive/10";
      case "draft": return "text-muted-foreground bg-muted";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const openEdit = () => {
    if (!client) return;
    setEditForm({
      name: client.name,
      contact_name: client.contact_name || "",
      contact_email: client.contact_email || "",
      phone: client.phone || "",
      notes: client.notes || "",
      status: client.status,
    });
    setEditing(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProject.mutateAsync({
      name: projectForm.name,
      description: projectForm.description || undefined,
      client_id: id,
      status: projectForm.status,
      start_date: projectForm.start_date || undefined,
      end_date: projectForm.end_date || undefined,
    });
    qc.invalidateQueries({ queryKey: ["client_projects", id] });
    setProjectDialogOpen(false);
    setProjectForm({ name: "", description: "", status: "draft", start_date: "", end_date: "" });
    toast.success("Project created");
  };

  if (isLoading) return <div className="p-8 flex justify-center"><div className="w-2 h-2 bg-primary animate-pulse-glow" /></div>;

  if (error || !client) {
    return (
      <div className="p-8">
        <div className="surface border border-destructive/30 p-4 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <p className="font-mono text-xs text-destructive">Client not found.</p>
        </div>
        <Link to="/clients" className="font-mono text-xs text-primary mt-4 inline-block">← Back to clients</Link>
      </div>
    );
  }

  const totalBilled = invoices.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const pendingAmount = totalBilled - totalPaid;
  const lastActivity = recentNotes.length > 0 ? recentNotes[0] : null;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/clients")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <p className="stat-label mb-1">Client</p>
          <h1 className="page-title">{client.name}</h1>
        </div>
        <span className={`font-mono text-xs px-2 py-1 ${statusColor(client.status)}`}>{client.status}</span>
        {canManage && (
          <button onClick={openEdit} className="h-8 px-3 border border-border text-muted-foreground hover:text-foreground hover:border-foreground font-mono text-xs flex items-center gap-1.5 transition-colors">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border mb-6">
        <div className="surface p-5">
          <p className="stat-label mb-1">Projects</p>
          <p className="font-mono text-lg text-foreground">{projects.length}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label mb-1">Invoices</p>
          <p className="font-mono text-lg text-foreground">{invoices.length}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label mb-1">Total Billed</p>
          <p className="font-mono text-lg text-primary">${totalBilled.toLocaleString()}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label mb-1">Paid</p>
          <p className="font-mono text-lg text-emerald-400">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label mb-1">Outstanding</p>
          <p className={`font-mono text-lg ${pendingAmount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>${pendingAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border mb-6">
        <div className="surface p-5 flex items-start gap-3">
          <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="stat-label mb-1">Contact Person</p>
            <p className="text-sm text-foreground">{client.contact_name || "—"}</p>
          </div>
        </div>
        <div className="surface p-5 flex items-start gap-3">
          <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="stat-label mb-1">Email</p>
            <p className="font-mono text-xs text-foreground">{client.contact_email ? <a href={`mailto:${client.contact_email}`} className="hover:text-primary transition-colors">{client.contact_email}</a> : "—"}</p>
          </div>
        </div>
        <div className="surface p-5 flex items-start gap-3">
          <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="stat-label mb-1">Phone</p>
            <p className="font-mono text-xs text-foreground">{client.phone || "—"}</p>
          </div>
        </div>
      </div>

      {/* Last Activity */}
      {lastActivity && (
        <div className="surface border border-border p-4 mb-6 flex items-start gap-3">
          <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="stat-label mb-1">Last Activity</p>
            <p className="text-sm text-foreground truncate">{lastActivity.content}</p>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              {lastActivity.profiles?.full_name || "Unknown"} · {lastActivity.projects?.name} · {format(new Date(lastActivity.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-0">
          <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-xs px-4 py-3">
            Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-xs px-4 py-3">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-xs px-4 py-3">
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-xs px-4 py-3">
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Linked Projects</p>
            {canManage && (
              <button onClick={() => setProjectDialogOpen(true)} className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                <Plus className="w-3 h-3" /> New Project
              </button>
            )}
          </div>
          <div className="surface border border-border">
            {projects.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-muted-foreground">No projects linked to this client.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left stat-label">Project</th>
                    <th className="px-6 py-3 text-left stat-label">Status</th>
                    <th className="px-6 py-3 text-left stat-label">Progress</th>
                    <th className="px-6 py-3 text-left stat-label">Budget</th>
                    <th className="px-6 py-3 text-left stat-label">Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projects.map((p: any) => (
                    <tr key={p.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/projects/${p.id}`} className="text-sm text-foreground hover:text-primary transition-colors">{p.name}</Link>
                      </td>
                      <td className="px-6 py-4"><span className={`font-mono text-xs px-2 py-1 ${statusColor(p.status)}`}>{p.status}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-border"><div className="h-full bg-primary" style={{ width: `${p.progress}%` }} /></div>
                          <span className="font-mono text-xs text-muted-foreground">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.budget ? `$${Number(p.budget).toLocaleString()}` : "—"}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.start_date || "—"} → {p.end_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Invoices</p>
            {canManage && (
              <button onClick={() => navigate(`/invoices?client_id=${id}`)} className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                <Plus className="w-3 h-3" /> New Invoice
              </button>
            )}
          </div>
          <div className="surface border border-border">
            {invoices.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-muted-foreground">No invoices for this client.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left stat-label">Invoice</th>
                    <th className="px-6 py-3 text-left stat-label">Project</th>
                    <th className="px-6 py-3 text-left stat-label">Amount</th>
                    <th className="px-6 py-3 text-left stat-label">Status</th>
                    <th className="px-6 py-3 text-left stat-label">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td className="px-6 py-4 font-mono text-xs text-primary">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{inv.projects?.name || "—"}</td>
                      <td className="px-6 py-4 font-mono text-sm text-foreground">${Number(inv.amount).toLocaleString()}</td>
                      <td className="px-6 py-4"><span className={`font-mono text-xs px-2 py-1 ${statusColor(inv.status)}`}>{inv.status}</span></td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{inv.due_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentManager
            entityType="client"
            entityId={id!}
            canUpload={canManage}
            userId={user?.id}
            canDelete={canManage}
          />
          {/* Also show linked project documents */}
          {documents.length > 0 && (
            <div className="mt-6">
              <p className="section-title mb-4">From Linked Projects</p>
              <div className="surface border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-left stat-label">File</th>
                      <th className="px-6 py-3 text-left stat-label">Project</th>
                      <th className="px-6 py-3 text-left stat-label">Uploaded By</th>
                      <th className="px-6 py-3 text-left stat-label">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground hover:text-primary transition-colors truncate">{doc.file_name}</a>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{doc.projects?.name || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{doc.profiles?.full_name || "—"}</td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{format(new Date(doc.created_at), "MMM d, yyyy")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <p className="section-title mb-4">Notes & Activity</p>
          {client.notes && (
            <div className="surface border border-border p-5 mb-4 flex items-start gap-3">
              <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="stat-label mb-1">Client Notes</p>
                <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">{client.notes}</p>
              </div>
            </div>
          )}
          <div className="surface border border-border">
            <div className="px-6 py-4 border-b border-border">
              <p className="section-title mb-0">Recent Activity</p>
            </div>
            <ActivityFeed entityType="client" entityId={id!} limit={10} showEntity={false} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Client Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setEditing(false)}>
          <div className="surface border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-mono text-sm font-medium text-foreground">Edit Client</h2>
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateClient.mutate(); }} className="p-6 space-y-4">
              <div>
                <label className="stat-label block mb-2">Company Name *</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="stat-label block mb-2">Contact Name</label>
                  <input type="text" value={editForm.contact_name} onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="stat-label block mb-2">Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="stat-label block mb-2">Email</label>
                  <input type="email" value={editForm.contact_email} onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="stat-label block mb-2">Phone</label>
                  <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="stat-label block mb-2">Notes</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary resize-none" />
              </div>
              <button type="submit" disabled={updateClient.isPending}
                className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
                {updateClient.isPending ? "Saving..." : "Update Client"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {projectDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setProjectDialogOpen(false)}>
          <div className="surface border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-mono text-sm font-medium text-foreground">New Project for {client.name}</h2>
              <button onClick={() => setProjectDialogOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="stat-label block mb-2">Project Name *</label>
                <input type="text" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground" placeholder="Solar Farm Inspection" />
              </div>
              <div>
                <label className="stat-label block mb-2">Description</label>
                <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} rows={3}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary resize-none placeholder:text-muted-foreground" placeholder="Project details..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="stat-label block mb-2">Status</label>
                  <select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="stat-label block mb-2">Start</label>
                  <input type="date" value={projectForm.start_date} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="stat-label block mb-2">End</label>
                  <input type="date" value={projectForm.end_date} onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>
              <button type="submit" disabled={createProject.isPending}
                className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
                {createProject.isPending ? "Creating..." : "Create Project"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
