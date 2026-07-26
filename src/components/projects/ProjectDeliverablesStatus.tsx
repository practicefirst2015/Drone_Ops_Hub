import { Package, CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import { useProjectDeliverables, DELIVERABLE_TYPES } from "@/hooks/useFlightDeliverables";

export function ProjectDeliverablesStatus({ projectId }: { projectId: string }) {
  const { data: deliverables = [], isLoading } = useProjectDeliverables(projectId);

  if (isLoading || deliverables.length === 0) return null;

  const captured = deliverables.filter((d: any) => d.status === "captured").length;
  const partial = deliverables.filter((d: any) => d.status === "partial").length;
  const notCaptured = deliverables.filter((d: any) => d.status === "not_captured").length;
  const expected = deliverables.filter((d: any) => d.status === "expected").length;
  const total = deliverables.length;
  const completionPct = total > 0 ? Math.round((captured / total) * 100) : 0;

  // Group by type
  const byType = deliverables.reduce((acc: Record<string, { captured: number; total: number }>, d: any) => {
    const t = d.deliverable_type;
    if (!acc[t]) acc[t] = { captured: 0, total: 0 };
    acc[t].total++;
    if (d.status === "captured") acc[t].captured++;
    return acc;
  }, {});

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <p className="section-title mb-0">Deliverables</p>
        <span className={`font-mono text-[10px] px-1.5 py-0.5 ml-auto ${completionPct === 100 ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
          {completionPct}% captured
        </span>
      </div>

      <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
        <StatusCell icon={CheckCircle2} count={captured} label="Captured" color="text-success" />
        <StatusCell icon={AlertTriangle} count={partial} label="Partial" color="text-warning" />
        <StatusCell icon={XCircle} count={notCaptured} label="Missing" color="text-destructive" />
        <StatusCell icon={Clock} count={expected} label="Pending" color="text-muted-foreground" />
      </div>

      <div className="px-6 py-3 space-y-2">
        {Object.entries(byType).map(([type, counts]) => {
          const label = DELIVERABLE_TYPES.find((t) => t.value === type)?.label || type;
          const pct = counts.total > 0 ? Math.round((counts.captured / counts.total) * 100) : 0;
          return (
            <div key={type} className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground w-32 truncate">{label}</span>
              <div className="flex-1 h-1.5 bg-secondary overflow-hidden">
                <div
                  className={`h-full transition-all ${pct === 100 ? "bg-success" : pct > 0 ? "bg-warning" : "bg-muted-foreground/30"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">
                {counts.captured}/{counts.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusCell({ icon: Icon, count, label, color }: { icon: typeof CheckCircle2; count: number; label: string; color: string }) {
  return (
    <div className="p-3 text-center">
      <div className="flex items-center justify-center gap-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <p className={`font-mono text-lg ${color}`}>{count}</p>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
