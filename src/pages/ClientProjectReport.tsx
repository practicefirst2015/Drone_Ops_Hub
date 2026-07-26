import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectDeliverablesList, DELIVERABLE_TYPES, PROJECT_DELIVERABLE_STATUSES } from "@/hooks/useProjectDeliverables";
import { format } from "date-fns";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Clock, Package,
  FileText, Calendar, MapPin, Plane, Loader2, CircleCheck, DollarSign, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "text-primary bg-primary/10";
    case "pending": case "draft": return "text-warning bg-warning/10";
    case "complete": return "text-success bg-success/10";
    case "archived": return "text-muted-foreground bg-muted";
    default: return "text-muted-foreground";
  }
};

const invoiceStatusColor = (s: string) => {
  switch (s) {
    case "paid": return "text-success bg-success/10";
    case "issued": case "sent": return "text-primary bg-primary/10";
    case "overdue": return "text-destructive bg-destructive/10";
    case "draft": return "text-muted-foreground bg-muted";
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

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "text-success", icon: CheckCircle2 },
  partial: { label: "Partial", color: "text-warning", icon: AlertTriangle },
  aborted: { label: "Aborted", color: "text-destructive", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-muted-foreground", icon: XCircle },
};

const ClientProjectReport = () => {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ["client_report_project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: deliverables = [] } = useProjectDeliverablesList(id);

  const { data: missions = [] } = useQuery({
    queryKey: ["client_report_missions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("id, title, mission_date, status, objective")
        .eq("project_id", id!)
        .order("mission_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: flightLogs = [] } = useQuery({
    queryKey: ["client_report_flights", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, title, flight_date, outcome, duration_minutes, flight_hours_contribution, missions(title)")
        .eq("project_id", id!)
        .order("flight_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["client_report_invoices", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, issued_date")
        .eq("project_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["client_report_documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("id, file_name, file_url, created_at, mime_type")
        .eq("project_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
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
        <Link to="/projects" className="font-mono text-xs text-primary mt-2 inline-block">← Back to projects</Link>
      </div>
    );
  }

  // Deliverable stats
  const delTotal = deliverables.length;
  const delCompleted = deliverables.filter((d: any) => d.status === "completed" || d.status === "captured").length;
  const delInProgress = deliverables.filter((d: any) => d.status === "in_processing" || d.status === "partial").length;
  const delPending = deliverables.filter((d: any) => d.status === "expected").length;
  const delMissing = deliverables.filter((d: any) => d.status === "not_captured").length;
  const delCompletionPct = delTotal > 0 ? Math.round((delCompleted / delTotal) * 100) : 0;

  // Flight stats
  const totalFlightHours = flightLogs.reduce((s: number, l: any) => s + (Number(l.flight_hours_contribution) || 0), 0);
  const completedFlights = flightLogs.filter((l: any) => l.outcome === "completed").length;

  // Invoice stats
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  // Mission status
  const missionStatusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "text-muted-foreground bg-muted" },
    planned: { label: "Planned", color: "text-primary bg-primary/10" },
    in_progress: { label: "In Progress", color: "text-warning bg-warning/10" },
    completed: { label: "Completed", color: "text-success bg-success/10" },
    cancelled: { label: "Cancelled", color: "text-muted-foreground bg-muted" },
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 no-print">
          <Link to={`/projects/${id}`} className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to Project
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Save as PDF
          </Button>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Client Report</p>
            <h1 className="page-title mb-1">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground max-w-2xl mt-1">{project.description}</p>
            )}
          </div>
          <span className={`font-mono text-xs px-3 py-1.5 ${statusColor(project.status)}`}>
            {project.status}
          </span>
        </div>
        {project.clients && (
          <p className="font-mono text-xs text-muted-foreground mt-2">
            Prepared for <span className="text-foreground">{(project.clients as any).name}</span>
          </p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8">
        <div className="surface p-5 text-center">
          <p className="stat-label mb-1">Progress</p>
          <p className="font-mono text-2xl text-foreground">{project.progress}%</p>
          <div className="w-full h-1 bg-border mt-2">
            <div className="h-full bg-primary transition-all" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div className="surface p-5 text-center">
          <p className="stat-label mb-1">Deliverables</p>
          <p className="font-mono text-2xl text-foreground">{delCompletionPct}%</p>
          <p className="font-mono text-[10px] text-muted-foreground">{delCompleted}/{delTotal} complete</p>
        </div>
        <div className="surface p-5 text-center">
          <p className="stat-label mb-1">Missions</p>
          <p className="font-mono text-2xl text-foreground">{missions.length}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{missions.filter((m: any) => m.status === "completed").length} completed</p>
        </div>
        <div className="surface p-5 text-center">
          <p className="stat-label mb-1">Flight Hours</p>
          <p className="font-mono text-2xl text-foreground">{totalFlightHours.toFixed(1)}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{completedFlights} flights</p>
        </div>
      </div>

      {/* Project Details */}
      <div className="surface border border-border p-6 mb-6">
        <p className="section-title mb-4">Project Details</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
          <InfoRow label="Status" value={<span className={`font-mono text-xs px-2 py-1 ${statusColor(project.status)}`}>{project.status}</span>} />
          {project.start_date && <InfoRow label="Start Date" value={format(new Date(project.start_date), "MMM d, yyyy")} />}
          {project.end_date && <InfoRow label="Target End" value={format(new Date(project.end_date), "MMM d, yyyy")} />}
          {project.location_name && (
            <InfoRow label="Location" value={
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                {project.location_name}
              </span>
            } />
          )}
          {project.budget && <InfoRow label="Budget" value={`$${Number(project.budget).toLocaleString()}`} />}
          <InfoRow label="Overall Progress" value={
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-border">
                <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
              </div>
              <span className="font-mono text-xs">{project.progress}%</span>
            </div>
          } />
        </div>
      </div>

      {/* Deliverables */}
      {delTotal > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Deliverables</p>
            <span className={`font-mono text-[10px] px-2 py-0.5 ml-auto ${delCompletionPct === 100 ? "text-success bg-success/10" : "text-primary bg-primary/10"}`}>
              {delCompletionPct}% complete
            </span>
          </div>
          {/* Summary bar */}
          <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
            <MiniStat icon={CircleCheck} count={delCompleted} label="Complete" color="text-success" />
            <MiniStat icon={Loader2} count={delInProgress} label="In Progress" color="text-primary" />
            <MiniStat icon={Clock} count={delPending} label="Pending" color="text-muted-foreground" />
            <MiniStat icon={XCircle} count={delMissing} label="Missing" color="text-destructive" />
          </div>
          {/* List */}
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

      {/* Mission Activity */}
      {missions.length > 0 && (
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

      {/* Recent Flights - simplified, no pilot/drone details */}
      {flightLogs.length > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Plane className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Flight Activity</p>
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">
              {totalFlightHours.toFixed(1)}h total
            </span>
          </div>
          <div className="divide-y divide-border">
            {flightLogs.slice(0, 10).map((l: any) => {
              const outcome = OUTCOME_CONFIG[l.outcome] || OUTCOME_CONFIG.completed;
              const OIcon = outcome.icon;
              return (
                <div key={l.id} className="px-6 py-3 flex items-center gap-3">
                  <OIcon className={`w-3.5 h-3.5 shrink-0 ${outcome.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{l.title}</p>
                    {l.missions?.title && (
                      <p className="font-mono text-[10px] text-muted-foreground">{l.missions.title}</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(l.flight_date), "MMM d, yyyy")}
                  </span>
                  {l.duration_minutes && (
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {l.duration_minutes}min
                    </span>
                  )}
                  <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${outcome.color}`}>
                    {outcome.label}
                  </span>
                </div>
              );
            })}
            {flightLogs.length > 10 && (
              <div className="px-6 py-2 text-center">
                <span className="font-mono text-[10px] text-muted-foreground">+{flightLogs.length - 10} more flights</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Invoice History</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="px-6 py-3 font-mono text-xs text-foreground">{inv.invoice_number}</td>
                  <td className="px-6 py-3 font-mono text-sm text-foreground">${Number(inv.amount).toLocaleString()}</td>
                  <td className="px-6 py-3"><span className={`font-mono text-[10px] px-2 py-0.5 ${invoiceStatusColor(inv.status)}`}>{inv.status}</span></td>
                  <td className="px-6 py-3 font-mono text-[10px] text-muted-foreground">{inv.issued_date ? format(new Date(inv.issued_date), "MMM d, yyyy") : "—"}</td>
                  <td className="px-6 py-3 font-mono text-[10px] text-muted-foreground">{inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="surface border border-border mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <p className="section-title mb-0">Documents</p>
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">{documents.length} files</span>
          </div>
          <div className="divide-y divide-border">
            {documents.map((doc: any) => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground flex-1 truncate">{doc.file_name}</span>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(doc.created_at), "MMM d, yyyy")}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-6">
        <p className="font-mono text-[10px] text-muted-foreground">
          Report generated {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
        </p>
      </div>
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function MiniStat({ icon: Icon, count, label, color }: { icon: typeof CheckCircle2; count: number; label: string; color: string }) {
  return (
    <div className="p-3 text-center">
      <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
      <p className={`font-mono text-sm ${color}`}>{count}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default ClientProjectReport;
