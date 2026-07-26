import { Link } from "react-router-dom";
import { XCircle, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useDashboardMissions } from "@/hooks/useDashboardData";

export function BlockedMissionsWidget() {
  const { data: missions = [], isLoading } = useDashboardMissions();
  const blocked = missions.filter((m: any) => m.go_status === "no_go");

  if (isLoading || blocked.length === 0) return null;

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <XCircle className="w-4 h-4 shrink-0 text-destructive" />
        <span className="section-title mb-0">Blocked Missions</span>
        <span className="ml-auto font-mono text-[10px] text-destructive bg-destructive/10 px-2 py-0.5">
          {blocked.length}
        </span>
      </div>
      <div className="divide-y divide-border">
        {blocked.slice(0, 5).map((m: any) => (
          <Link
            key={m.id}
            to={`/projects/${m.project_id}`}
            className="px-6 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors group"
          >
            <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
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
            <span className="font-mono text-[10px] px-2 py-0.5 text-destructive bg-destructive/10 shrink-0">NO-GO</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
