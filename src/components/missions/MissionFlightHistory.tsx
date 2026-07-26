import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Calendar, Users, Plane } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "text-success", icon: CheckCircle2 },
  partial: { label: "Partial", color: "text-warning", icon: AlertTriangle },
  aborted: { label: "Aborted", color: "text-destructive", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-muted-foreground", icon: XCircle },
};

interface FlightLog {
  id: string;
  title: string;
  flight_date: string;
  outcome: string;
  duration_minutes: number | null;
  flight_hours_contribution: number | null;
  incidents: string | null;
  pilot_id: string;
  profiles?: { full_name: string | null } | null;
  drone_models?: { name: string; drone_manufacturers?: { name: string } | null } | null;
}

interface MissionFlightHistoryProps {
  flightLogs: FlightLog[];
}

export function MissionFlightHistory({ flightLogs }: MissionFlightHistoryProps) {
  const summary = useMemo(() => {
    const completed = flightLogs.filter(l => l.outcome === "completed").length;
    const totalHours = flightLogs.reduce((s, l) => s + (Number(l.flight_hours_contribution) || 0), 0);
    const hasIncidents = flightLogs.some(l => l.incidents);
    return { completed, totalHours, hasIncidents };
  }, [flightLogs]);

  if (flightLogs.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Flight History</span>
        <span className="font-mono text-[10px] text-foreground bg-secondary px-1.5 py-0.5">
          {flightLogs.length} flight{flightLogs.length !== 1 ? "s" : ""}
        </span>
        <span className="font-mono text-[10px] text-success">
          {summary.completed} completed
        </span>
        {summary.totalHours > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {summary.totalHours.toFixed(1)}h
          </span>
        )}
        {summary.hasIncidents && (
          <span className="font-mono text-[10px] text-warning flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> Incidents reported
          </span>
        )}
      </div>

      {/* Flight log entries */}
      <div className="space-y-1">
        {flightLogs.map(log => {
          const cfg = OUTCOME_CONFIG[log.outcome] || OUTCOME_CONFIG.completed;
          const Icon = cfg.icon;
          return (
            <div key={log.id} className="flex items-center gap-3 px-3 py-1.5 bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <Icon className={`w-3 h-3 shrink-0 ${cfg.color}`} />
              <Link to={`/flight-logs/${log.id}`} className="font-mono text-[11px] text-foreground hover:text-primary truncate min-w-0 flex-1">
                {log.title}
              </Link>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 ${cfg.color}`}>{cfg.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {format(new Date(log.flight_date), "MMM d")}
              </span>
              {log.duration_minutes && (
                <span className="font-mono text-[10px] text-muted-foreground">{log.duration_minutes}min</span>
              )}
              {log.profiles?.full_name && (
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  {log.profiles.full_name.split(" ")[0]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Derive mission flight status from linked logs */
export function getMissionFlightStatus(flightLogs: FlightLog[]): {
  label: string;
  color: string;
  icon: typeof CheckCircle2;
} | null {
  if (flightLogs.length === 0) return null;
  const completed = flightLogs.filter(l => l.outcome === "completed").length;
  const partial = flightLogs.filter(l => l.outcome === "partial").length;
  if (completed > 0 && completed === flightLogs.length) {
    return { label: "Flown ✓", color: "text-success bg-success/10", icon: CheckCircle2 };
  }
  if (completed > 0 || partial > 0) {
    return { label: "Partially Flown", color: "text-warning bg-warning/10", icon: AlertTriangle };
  }
  return { label: "Not Completed", color: "text-destructive bg-destructive/10", icon: XCircle };
}
