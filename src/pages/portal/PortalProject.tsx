import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientVisibility } from "@/hooks/useClientVisibility";
import { useProjectDeliverablesList, DELIVERABLE_TYPES, PROJECT_DELIVERABLE_STATUSES } from "@/hooks/useProjectDeliverables";
import { format } from "date-fns";
import { downloadStoredFile } from "@/hooks/useExportedFiles";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, MapPin, Package, FileText, DollarSign,
  CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, CircleCheck,
  Download, Plane,
} from "lucide-react";
import { useState as useStatePortal } from "react";

function InvoiceDownloadBtn({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useStatePortal(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", { body: { invoice_id: invoiceId } });
      if (error) throw error;
      const html = data?.html;
      if (html) {
        const w = window.open("", "_blank");
        if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 600); }
      }
    } catch { toast.error("Could not generate PDF"); }
    finally { setLoading(false); }
  };
  return (
    <button onClick={handleDownload} disabled={loading} title="Open printable invoice" className="p-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
    </button>
  );
}

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "text-primary bg-primary/10";
    case "pending": case "draft": return "text-warning bg-warning/10";
    case "complete": return "text-success bg-success/10";
    default: return "text-muted-foreground bg-muted";
  }
};

const invoiceStatusColor = (s: string) => {
  switch (s) {
    case "paid": return "text-success bg-success/10";
    case "issued": return "text-primary bg-primary/10";
    case "overdue": return "text-destructive bg-destructive/10";
    default: return "text-muted-foreground bg-muted";
  }
};

const DELIVERABLE_STATUS_ICON: Record<string, typeof CheckCircle2> = {
  expected: Clock,
  captured: CheckCircle2,
  partial: AlertTriangle,
  not_captured: XCircle,
  in_processing: Loader2,
  completed: CircleCheck,
};

const missionStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-muted-foreground bg-muted" },
  planned: { label: "Planned", color: "text-primary bg-primary/10" },
  approved: { label: "Approved", color: "text-primary bg-primary/10" },
  in_progress: { label: "In Progress", color: "text-warning bg-warning/10" },
  completed: { label: "Completed", color: "text-success bg-success/10" },
  cancelled: { label: "Cancelled", color: "text-muted-foreground bg-muted" },
};

const PortalProject = () => {
  const { id } = useParams<{ id: string }>();
  const visibility = useClientVisibility();

  const { data: project, isLoading } = useQuery({
    queryKey: ["portal_project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, status, progress, start_date, end_date, location_name, budget, clients(id, name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: deliverables = [] } = useProjectDeliverablesList(
    visibility.canViewDeliverables ? id : undefined
  );

  const { data: missions = [] } = useQuery({
    queryKey: ["portal_missions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("id, title, mission_date, status, objective")
        .eq("project_id", id!)
        .order("mission_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && visibility.canViewMissionStatus,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["portal_invoices", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, issued_date")
        .eq("project_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && visibility.canViewInvoices,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["portal_documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("id, file_name, file_url, created_at, mime_type, storage_path")
        .eq("project_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ingestionFiles = [] } = useQuery({
    queryKey: ["portal_ingestion", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingestion_files")
        .select("id, file_name, file_category, created_at, storage_path, file_size_bytes")
        .eq("project_id", id!)
        .eq("processing_status", "uploaded")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && visibility.canViewDeliverables,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="font-mono text-sm text-muted-foreground">Project not found.</p>
        <Link to="/portal" className="font-mono text-xs text-primary mt-2 inline-block">← Back to portal</Link>
      </div>
    );
  }

  const delTotal = deliverables.length;
  const delCompleted = deliverables.filter((d: any) => d.status === "completed" || d.status === "captured").length;
  const delCompletionPct = delTotal > 0 ? Math.round((delCompleted / delTotal) * 100) : 0;

  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  const handleDownloadDocument = async (doc: any) => {
    try {
      if (doc.storage_path) {
        await downloadStoredFile(doc.storage_path, doc.file_name);
      } else if (doc.file_url) {
        window.open(doc.file_url, "_blank");
      }
    } catch {
      toast.error("Failed to download file");
    }
  };

  const categoryLabel = (cat: string) =>
    cat.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/portal/projects"
          className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-3 h-3" />
          Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title mb-1">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
            )}
          </div>
          <span className={`font-mono text-xs px-2 py-1 ${statusColor(project.status)}`}>
            {project.status}
          </span>
        </div>
        <div className="flex items-center gap-6 mt-3 font-mono text-xs text-muted-foreground flex-wrap">
          {project.location_name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {project.location_name}
            </span>
          )}
          {project.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {project.start_date}
            </span>
          )}
          {project.end_date && <span>End: {project.end_date}</span>}
        </div>
      </div>

      {/* Progress + Budget */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8">
        <div className="surface p-5 text-center">
          <p className="stat-label mb-1">Progress</p>
          <p className="font-mono text-2xl text-foreground">{project.progress}%</p>
          <div className="w-full h-1 bg-border mt-2">
            <div className="h-full bg-primary transition-all" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        {visibility.canViewDeliverables && delTotal > 0 && (
          <div className="surface p-5 text-center">
            <p className="stat-label mb-1">Deliverables</p>
            <p className="font-mono text-2xl text-foreground">{delCompletionPct}%</p>
            <p className="font-mono text-[10px] text-muted-foreground">{delCompleted}/{delTotal} complete</p>
          </div>
        )}
        {visibility.canViewMissionStatus && (
          <div className="surface p-5 text-center">
            <p className="stat-label mb-1">Missions</p>
            <p className="font-mono text-2xl text-foreground">{missions.length}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {missions.filter((m: any) => m.status === "completed").length} completed
            </p>
          </div>
        )}
        {visibility.canViewInvoices && (
          <div className="surface p-5 text-center">
            <p className="stat-label mb-1">Invoiced</p>
            <p className="font-mono text-2xl text-foreground">${totalInvoiced.toLocaleString()}</p>
            <p className="font-mono text-[10px] text-success">${totalPaid.toLocaleString()} paid</p>
          </div>
        )}
      </div>

      {/* Deliverables */}
      {visibility.canViewDeliverables && delTotal > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Deliverables</p>
            <span className={`font-mono text-[10px] px-2 py-0.5 ml-auto ${delCompletionPct === 100 ? "text-success bg-success/10" : "text-primary bg-primary/10"}`}>
              {delCompletionPct}% complete
            </span>
          </div>
          <div className="divide-y divide-border">
            {deliverables.map((d: any) => {
              const statusCfg = PROJECT_DELIVERABLE_STATUSES.find((s) => s.value === d.status);
              const typeCfg = DELIVERABLE_TYPES.find((t) => t.value === d.deliverable_type);
              const SIcon = DELIVERABLE_STATUS_ICON[d.status] || Clock;
              return (
                <div key={d.id} className="px-6 py-3 flex items-center gap-3">
                  <SIcon className={`w-3.5 h-3.5 shrink-0 ${statusCfg?.color.split(" ")[0] || "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{d.label || typeCfg?.label || d.deliverable_type}</p>
                    {d.description && <p className="font-mono text-[10px] text-muted-foreground truncate">{d.description}</p>}
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${statusCfg?.color || "text-muted-foreground bg-muted"}`}>
                    {statusCfg?.label || d.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Uploaded Imagery / Ingestion Files */}
      {visibility.canViewDeliverables && ingestionFiles.length > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Uploaded Files</p>
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">{ingestionFiles.length} files</span>
          </div>
          <div className="divide-y divide-border">
            {ingestionFiles.slice(0, 20).map((f: any) => (
              <div key={f.id} className="px-6 py-3 flex items-center gap-3">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{f.file_name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {categoryLabel(f.file_category)}
                    {f.file_size_bytes && ` · ${(f.file_size_bytes / 1024 / 1024).toFixed(1)} MB`}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(f.created_at), "MMM d, yyyy")}
                </span>
              </div>
            ))}
            {ingestionFiles.length > 20 && (
              <div className="px-6 py-2 text-center">
                <span className="font-mono text-[10px] text-muted-foreground">+{ingestionFiles.length - 20} more files</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mission Status */}
      {visibility.canViewMissionStatus && missions.length > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Mission Activity</p>
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">{missions.length} total</span>
          </div>
          <div className="divide-y divide-border">
            {missions.map((m: any) => {
              const mCfg = missionStatusConfig[m.status] || { label: m.status, color: "text-muted-foreground bg-muted" };
              return (
                <div key={m.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{m.title}</p>
                    {m.objective && <p className="font-mono text-[10px] text-muted-foreground truncate">{m.objective}</p>}
                  </div>
                  {m.mission_date && (
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(m.mission_date), "MMM d, yyyy")}
                    </span>
                  )}
                  <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${mCfg.color}`}>
                    {mCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoices */}
      {visibility.canViewInvoices && invoices.length > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Invoices</p>
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">
              ${totalInvoiced.toLocaleString()} billed · ${totalPaid.toLocaleString()} paid
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-2 text-left stat-label">Invoice</th>
                <th className="px-6 py-2 text-left stat-label">Amount</th>
                <th className="px-6 py-2 text-left stat-label">Status</th>
                <th className="px-6 py-2 text-left stat-label">Issued</th>
                <th className="px-6 py-2 text-left stat-label">Due</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="px-6 py-3 font-mono text-xs text-foreground">{inv.invoice_number}</td>
                  <td className="px-6 py-3 font-mono text-sm text-foreground">${Number(inv.amount).toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span className={`font-mono text-[10px] px-2 py-0.5 ${invoiceStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-[10px] text-muted-foreground">
                    {inv.issued_date ? format(new Date(inv.issued_date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-6 py-3 font-mono text-[10px] text-muted-foreground">
                    {inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceDownloadBtn invoiceId={inv.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Documents & Reports */}
      {documents.length > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Documents & Reports</p>
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">{documents.length} files</span>
          </div>
          <div className="divide-y divide-border">
            {documents.map((doc: any) => (
              <div key={doc.id} className="px-6 py-3 flex items-center gap-3">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{doc.file_name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {format(new Date(doc.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadDocument(doc)}
                  className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalProject;
