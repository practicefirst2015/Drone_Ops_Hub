import { CheckCircle2, AlertTriangle, XCircle, Calendar, Clock, Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useDashboardFlightLogs } from "@/hooks/useDashboardData";

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "text-success", icon: CheckCircle2 },
  partial: { label: "Partial", color: "text-warning", icon: AlertTriangle },
  aborted: { label: "Aborted", color: "text-destructive", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-muted-foreground", icon: XCircle },
};

export function RecentFlightsWidget() {
  const { data: logs = [], isLoading } = useDashboardFlightLogs();
  const recent = (logs as any[]).slice(0, 5);

  if (isLoading) {
    return (
      <div className="surface border border-border">
        <div className="px-6 py-4 border-b border-border">
          <span className="section-title mb-0">Recent Flights</span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-2 h-2 bg-primary animate-pulse-glow" />
        </div>
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <div className="surface border border-border">
        <div className="px-6 py-4 border-b border-border">
          <span className="section-title mb-0">Recent Flights</span>
        </div>
        <div className="px-6 py-12 text-center">
          <Calendar className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
          <p className="font-mono text-xs text-muted-foreground">No flight logs recorded yet.</p>
        </div>
      </div>
    );
  }

  const outcomes = (logs as any[]).reduce((acc, l) => {
    acc[l.outcome] = (acc[l.outcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="section-title mb-0">Recent Flights</span>
        <Link to="/flight-logs" className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Outcome summary bar */}
      <div className="px-6 py-3 border-b border-border flex items-center gap-4">
        {Object.entries(outcomes).map(([outcome, count]) => {
          const cfg = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.completed;
          return (
            <span key={outcome} className={`font-mono text-[10px] ${cfg.color} flex items-center gap-1`}>
              {count as number} {cfg.label.toLowerCase()}
            </span>
          );
        })}
      </div>

      {/* Recent flights list */}
      <div className="divide-y divide-border">
        {recent.map((log: any) => {
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
                <p className="font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">
                  {log.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-muted-foreground font-mono text-[10px]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {format(new Date(log.flight_date), "MMM d")}
                  </span>
                  {log.profiles?.full_name && (
                    <span className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />
                      {(log.profiles as any).full_name.split(" ")[0]}
                    </span>
                  )}
                  {log.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {log.duration_minutes}min
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
