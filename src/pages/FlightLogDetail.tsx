import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Calendar, Clock, Users, Plane, MapPin, ClipboardList, Crosshair, FileText, Shield, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useFlightLog, useFlightCrew, useDeleteFlightLog } from "@/hooks/useFlightLogs";
import { PostflightDebrief } from "@/components/flightlogs/PostflightDebrief";
import { FlightDeliverablesPanel } from "@/components/flightlogs/FlightDeliverablesPanel";
import { PostflightReportExport } from "@/components/flightlogs/PostflightReportExport";
import { ExportedFilesPanel } from "@/components/exports/ExportedFilesPanel";
import { useFlightLogFiles } from "@/hooks/useExportedFiles";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useOrg } from "@/contexts/OrgContext";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "text-success bg-success/10", icon: CheckCircle2 },
  partial: { label: "Partial", color: "text-warning bg-warning/10", icon: AlertTriangle },
  aborted: { label: "Aborted", color: "text-destructive bg-destructive/10", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-muted-foreground bg-muted", icon: XCircle },
};

export default function FlightLogDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: log, isLoading } = useFlightLog(id);
  const { data: crew = [] } = useFlightCrew(id);
  const { data: exportedFiles = [], isLoading: filesLoading } = useFlightLogFiles(id);
  const { canManage, canContribute, isAdmin } = useOrgRole();
  const { currentOrg } = useOrg();
  const deleteLog = useDeleteFlightLog();
  const { confirm, ConfirmationDialog } = useConfirm();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="p-8">
        <p className="font-mono text-sm text-muted-foreground">Flight log not found.</p>
        <Link to="/flight-logs" className="font-mono text-xs text-primary mt-2 inline-block">← Back to flight logs</Link>
      </div>
    );
  }

  const cfg = OUTCOME_CONFIG[log.outcome] || OUTCOME_CONFIG.completed;
  const OutcomeIcon = cfg.icon;
  const pilot = log.profiles as any;
  const project = log.projects as any;
  const mission = log.missions as any;
  const droneModel = log.drone_models as any;

  return (
    <div className="p-8">
      <ConfirmationDialog />
      <Link to="/flight-logs" className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors mb-6">
        <ArrowLeft className="w-3 h-3" /> Flight Logs
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="stat-label mb-1">Flight Record</p>
          <h1 className="page-title mb-2">{log.title}</h1>
          <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(log.flight_date), "MMMM d, yyyy")}
            </span>
            {log.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {log.duration_minutes} min
              </span>
            )}
            {pilot?.full_name && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {pilot.full_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => confirm({
                title: "Delete Flight Log",
                description: `Permanently delete "${log.title}"? This will also remove associated deliverables, crew records, and exported files. This action cannot be undone.`,
                confirmLabel: "Delete",
                variant: "destructive",
                onConfirm: async () => {
                  await deleteLog.mutateAsync(log.id);
                  toast.success("Flight log deleted");
                  navigate("/flight-logs");
                },
              })}
              className="h-8 px-3 border border-destructive/30 text-destructive font-mono text-xs hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
          <PostflightReportExport flightLogId={log.id} flightLogTitle={log.title} />
          <span className={`font-mono text-xs px-3 py-1.5 flex items-center gap-1.5 ${cfg.color}`}>
            <OutcomeIcon className="w-3.5 h-3.5" /> {cfg.label}
          </span>
          {log.preflight_completed && (
            <span className="font-mono text-[10px] px-2 py-1 text-success bg-success/10 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Preflight ✓
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Flight metrics */}
          <div className="surface border border-border">
            <div className="px-6 py-4 border-b border-border">
              <p className="section-title mb-0">Flight Metrics</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
              <MetricCell label="Duration" value={log.duration_minutes ? `${log.duration_minutes} min` : "—"} />
              <MetricCell label="Flight Hours" value={log.flight_hours_contribution ? `${Number(log.flight_hours_contribution).toFixed(2)}h` : "—"} />
              <MetricCell label="Drone Util." value={log.drone_utilization_contribution ? `${Number(log.drone_utilization_contribution).toFixed(2)}` : "—"} />
              <MetricCell label="Preflight" value={log.preflight_completed ? "Completed" : "Skipped"} valueColor={log.preflight_completed ? "text-success" : "text-warning"} />
            </div>
          </div>

          {/* Times */}
          {(log.launch_time || log.landing_time) && (
            <div className="surface border border-border p-6">
              <p className="section-title mb-4">Timeline</p>
              <div className="grid grid-cols-2 gap-6">
                <InfoRow label="Launch Time" value={log.launch_time ? format(new Date(log.launch_time), "MMM d, yyyy HH:mm") : "—"} />
                <InfoRow label="Landing Time" value={log.landing_time ? format(new Date(log.landing_time), "MMM d, yyyy HH:mm") : "—"} />
              </div>
            </div>
          )}

          {/* Operational notes */}
          <div className="surface border border-border p-6">
            <p className="section-title mb-4">Operational Notes</p>
            <div className="space-y-4">
              {log.objective && <NoteBlock label="Objective" value={log.objective} />}
              {log.launch_location && <NoteBlock label="Launch Location" value={log.launch_location} />}
              {log.flight_area_summary && <NoteBlock label="Flight Area" value={log.flight_area_summary} />}
              {log.weather_summary && <NoteBlock label="Weather" value={log.weather_summary} />}
              {log.airspace_notes && <NoteBlock label="Airspace" value={log.airspace_notes} />}
              {log.battery_equipment_notes && <NoteBlock label="Battery & Equipment" value={log.battery_equipment_notes} />}
              {log.deliverables_summary && <NoteBlock label="Deliverables" value={log.deliverables_summary} />}
              {log.postflight_notes && <NoteBlock label="Post-Flight Notes" value={log.postflight_notes} />}
              {!log.objective && !log.launch_location && !log.weather_summary && !log.postflight_notes && (
                <p className="font-mono text-xs text-muted-foreground">No operational notes recorded.</p>
              )}
            </div>
          </div>

          {/* Incidents */}
          {log.incidents && (
            <div className="surface border border-warning/30 p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <p className="section-title mb-0 text-warning">Incident Report</p>
              </div>
              <p className="font-mono text-sm text-foreground whitespace-pre-wrap">{log.incidents}</p>
            </div>
          )}

          {/* Deliverables */}
          {currentOrg && (
            <FlightDeliverablesPanel
              flightLogId={log.id}
              organizationId={currentOrg.id}
              canEdit={canManage || canContribute}
            />
          )}

          {/* Postflight Debrief */}
          <PostflightDebrief
            flightLogId={log.id}
            missionId={log.mission_id}
            droneModelId={log.drone_model_id}
            pilotId={log.pilot_id}
            canEdit={canManage || canContribute}
          />

          {/* Exported Reports */}
          <ExportedFilesPanel
            files={exportedFiles as any[]}
            isLoading={filesLoading}
            entityType="flight_log"
          />
        </div>

        {/* Right column: linked data */}
        <div className="space-y-6">
          {/* Project */}
          <div className="surface border border-border p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Project</p>
            {project ? (
              <Link to={`/projects/${project.id}`} className="font-mono text-sm text-primary hover:underline flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> {project.name}
              </Link>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">Not linked</p>
            )}
          </div>

          {/* Mission */}
          <div className="surface border border-border p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Mission Plan</p>
            {mission ? (
              <div>
                <Link to="/missions" className="font-mono text-sm text-primary hover:underline flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5" /> {mission.title}
                </Link>
                {mission.go_status && (
                  <span className={`font-mono text-[10px] mt-2 inline-block px-2 py-0.5 ${
                    mission.go_status === "go" ? "text-success bg-success/10" :
                    mission.go_status === "no_go" ? "text-destructive bg-destructive/10" :
                    "text-warning bg-warning/10"
                  }`}>
                    {mission.go_status === "go" ? "GO" : mission.go_status === "no_go" ? "NO-GO" : "PENDING"}
                  </span>
                )}
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">Manual entry (no mission plan)</p>
            )}
          </div>

          {/* Drone */}
          <div className="surface border border-border p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Aircraft</p>
            {droneModel ? (
              <div className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-sm text-foreground">
                  {droneModel.drone_manufacturers?.name} {droneModel.name}
                </span>
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">Not specified</p>
            )}
          </div>

          {/* Pilot */}
          <div className="surface border border-border p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Pilot in Command</p>
            {pilot?.full_name ? (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-sm text-foreground">{pilot.full_name}</span>
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">Unknown</p>
            )}
          </div>

          {/* Crew */}
          {crew.length > 0 && (
            <div className="surface border border-border p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Flight Crew</p>
              <div className="space-y-2">
                {crew.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-foreground">{c.profiles?.full_name || "Unknown"}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono text-lg ${valueColor || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
