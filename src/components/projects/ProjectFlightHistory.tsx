import { CheckCircle2, AlertTriangle, XCircle, Calendar, Clock, Users, Plane, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "text-success", icon: CheckCircle2 },
  partial: { label: "Partial", color: "text-warning", icon: AlertTriangle },
  aborted: { label: "Aborted", color: "text-destructive", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-muted-foreground", icon: XCircle },
};

export function ProjectFlightHistory({ projectId }: { projectId: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["project_flight_logs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, title, flight_date, outcome, duration_minutes, flight_hours_contribution, incidents, pilot_id, mission_id, profiles!flight_logs_pilot_id_fkey(full_name), drone_models(name, drone_manufacturers(name)), missions(title)")
        .eq("project_id", projectId)
        .order("flight_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  if (isLoading) return null;

  const totalHours = logs.reduce((s: number, l: any) => s + (Number(l.flight_hours_contribution) || 0), 0);
  const completed = logs.filter((l: any) => l.outcome === "completed").length;
  const withIncidents = logs.filter((l: any) => l.incidents).length;

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <p className="section-title mb-0">Flight History</p>
        <Link to="/flight-logs" className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
          All Logs <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="p-6 text-center">
          <p className="font-mono text-xs text-muted-foreground">No flight logs recorded for this project.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
            <div className="p-3 text-center">
              <p className="font-mono text-lg text-foreground">{logs.length}</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Flights</p>
            </div>
            <div className="p-3 text-center">
              <p className="font-mono text-lg text-success">{completed}</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Completed</p>
            </div>
            <div className="p-3 text-center">
              <p className="font-mono text-lg text-foreground">{totalHours.toFixed(1)}</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Hours</p>
            </div>
            <div className="p-3 text-center">
              <p className={`font-mono text-lg ${withIncidents > 0 ? "text-warning" : "text-foreground"}`}>{withIncidents}</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Incidents</p>
            </div>
          </div>

          {/* Log list */}
          <div className="divide-y divide-border">
            {logs.slice(0, 8).map((log: any) => {
              const cfg = OUTCOME_CONFIG[log.outcome] || OUTCOME_CONFIG.completed;
              const Icon = cfg.icon;
              return (
                <Link
                  key={log.id}
                  to={`/flight-logs/${log.id}`}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-secondary/30 transition-colors group"
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">{log.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-muted-foreground font-mono text-[10px]">
                      <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{format(new Date(log.flight_date), "MMM d, yyyy")}</span>
                      {log.profiles?.full_name && <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{(log.profiles as any).full_name}</span>}
                      {log.missions?.title && <span className="truncate max-w-[120px]">↗ {(log.missions as any).title}</span>}
                    </div>
                  </div>
                  {log.duration_minutes && <span className="font-mono text-[10px] text-muted-foreground">{log.duration_minutes}min</span>}
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 ${cfg.color}`}>{cfg.label}</span>
                </Link>
              );
            })}
          </div>
          {logs.length > 8 && (
            <div className="px-6 py-3 border-t border-border">
              <Link to="/flight-logs" className="font-mono text-[10px] text-primary hover:underline">
                +{logs.length - 8} more flights →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
