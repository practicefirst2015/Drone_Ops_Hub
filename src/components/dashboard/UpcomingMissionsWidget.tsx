import { Link } from "react-router-dom";
import { Crosshair, ChevronRight, Calendar, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useDashboardMissions } from "@/hooks/useDashboardData";

const GO_CONFIG: Record<string, { color: string; label: string }> = {
  go: { color: "text-success bg-success/10", label: "GO" },
  no_go: { color: "text-destructive bg-destructive/10", label: "NO-GO" },
  pending: { color: "text-warning bg-warning/10", label: "Pending" },
};

export function UpcomingMissionsWidget() {
  const { data: missions = [], isLoading } = useDashboardMissions();
  const upcoming = missions.filter((m: any) => m.go_status !== "no_go");

  if (isLoading || upcoming.length === 0) return null;

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 shrink-0 text-primary" />
          <span className="section-title mb-0">Upcoming Missions</span>
        </div>
        <Link to="/missions" className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {upcoming.slice(0, 6).map((m: any) => {
          const goCfg = GO_CONFIG[m.go_status] || GO_CONFIG.pending;
          return (
            <Link
              key={m.id}
              to={`/projects/${m.project_id}`}
              className="px-6 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">{m.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="font-mono text-[10px] text-muted-foreground truncate">{(m.projects as any)?.name}</span>
                  {m.mission_date && (
                    <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <Calendar className="w-2.5 h-2.5" />
                      {format(new Date(m.mission_date), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
              <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${goCfg.color}`}>{goCfg.label}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
