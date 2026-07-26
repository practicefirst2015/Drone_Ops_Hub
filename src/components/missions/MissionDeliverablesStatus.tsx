import { Package, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, CircleCheck } from "lucide-react";
import { useMissionDeliverables, DELIVERABLE_TYPES, DELIVERABLE_STATUSES } from "@/hooks/useFlightDeliverables";

interface Props {
  missionId: string;
  deliverables?: any[];
}

export function MissionDeliverablesStatus({ missionId, deliverables: propDeliverables }: Props) {
  const { data: fetchedDeliverables = [], isLoading } = useMissionDeliverables(
    propDeliverables ? undefined : missionId
  );

  const deliverables = propDeliverables ?? fetchedDeliverables;

  if ((!propDeliverables && isLoading) || deliverables.length === 0) return null;

  const captured = deliverables.filter((d: any) => d.status === "captured").length;
  const total = deliverables.length;

  const STATUS_ICON: Record<string, typeof CheckCircle2> = {
    expected: Clock,
    captured: CheckCircle2,
    partial: AlertTriangle,
    not_captured: XCircle,
    in_processing: Loader2,
    completed: CircleCheck,
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-3 h-3 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Deliverables</span>
        <span className={`font-mono text-[10px] px-1.5 py-0.5 ${captured === total ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
          {captured}/{total} captured
        </span>
      </div>
      <div className="space-y-1">
        {deliverables.map((d: any) => {
          const typeLabel = DELIVERABLE_TYPES.find((t) => t.value === d.deliverable_type)?.label || d.deliverable_type;
          const statusCfg = DELIVERABLE_STATUSES.find((s) => s.value === d.status) || DELIVERABLE_STATUSES[0];
          const Icon = STATUS_ICON[d.status] || Clock;
          return (
            <div key={d.id} className="flex items-center gap-2 px-3 py-1 bg-secondary/30">
              <Icon className={`w-2.5 h-2.5 shrink-0 ${statusCfg.color.split(" ")[0]}`} />
              <span className="font-mono text-[10px] text-foreground flex-1 truncate">{d.label || typeLabel}</span>
              <span className={`font-mono text-[10px] px-1 py-0.5 ${statusCfg.color}`}>{statusCfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
