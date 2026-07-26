import { Link } from "react-router-dom";
import { Package, ChevronRight } from "lucide-react";
import { useDashboardDeliverables } from "@/hooks/useDashboardData";
import { DELIVERABLE_TYPES, PROJECT_DELIVERABLE_STATUSES } from "@/hooks/useProjectDeliverables";

export function IncompleteDeliverablesWidget() {
  const { data: deliverables = [], isLoading } = useDashboardDeliverables();

  if (isLoading || deliverables.length === 0) return null;

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Package className="w-4 h-4 shrink-0 text-primary" />
        <span className="section-title mb-0">Incomplete Deliverables</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{deliverables.length} items</span>
      </div>
      <div className="divide-y divide-border">
        {(deliverables as any[]).slice(0, 8).map((d) => {
          const typeLabel = DELIVERABLE_TYPES.find((t) => t.value === d.deliverable_type)?.label || d.deliverable_type;
          const statusCfg = PROJECT_DELIVERABLE_STATUSES.find((s) => s.value === d.status) || PROJECT_DELIVERABLE_STATUSES[0];
          return (
            <Link
              key={d.id}
              to={`/projects/${d.project_id}?tab=deliverables`}
              className="px-6 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">
                  {d.label || typeLabel}
                </p>
                <span className="font-mono text-[10px] text-muted-foreground">{d.projects?.name}</span>
              </div>
              <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
