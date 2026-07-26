import { useOperationsAnalytics, useFleetAnalytics, useProjectAnalytics } from "@/hooks/useAnalytics";
import { BarChart3, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export function AnalyticsSummaryWidget() {
  const ops = useOperationsAnalytics();
  const fleet = useFleetAnalytics();
  const proj = useProjectAnalytics();

  const loading = ops.isLoading || fleet.isLoading || proj.isLoading;

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="section-title mb-0">Analytics Overview</span>
        <Link to="/analytics" className="flex items-center gap-1 font-mono text-xs text-primary hover:underline">
          Full Analytics <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-2 h-2 bg-primary animate-pulse-glow" />
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Operations */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Mission Success</span>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={ops.data?.successRate ?? 0} className="h-1.5 flex-1 bg-secondary" />
              <span className="font-mono text-sm font-medium text-foreground">{ops.data?.successRate ?? 0}%</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              {ops.data?.totalFlights ?? 0} flights · {ops.data?.avgReadinessDelay ?? 0}d avg readiness
            </p>
          </div>

          {/* Fleet */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Fleet Utilization</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-mono text-lg font-semibold text-foreground">{fleet.data?.totalDrones ?? 0}</p>
                <p className="font-mono text-[10px] text-muted-foreground">Drones</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold text-foreground">{fleet.data?.avgFlightHours ?? 0}h</p>
                <p className="font-mono text-[10px] text-muted-foreground">Avg Hours</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold text-foreground">{fleet.data?.totalMaintenanceEvents ?? 0}</p>
                <p className="font-mono text-[10px] text-muted-foreground">Maint. Events</p>
              </div>
            </div>
          </div>

          {/* Projects */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Project Delivery</span>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={proj.data?.deliverableRate ?? 0} className="h-1.5 flex-1 bg-secondary" />
              <span className="font-mono text-sm font-medium text-foreground">{proj.data?.deliverableRate ?? 0}%</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              {proj.data?.collectionRate ?? 0}% collection · ${proj.data?.totalPaid?.toLocaleString() ?? 0} received
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
