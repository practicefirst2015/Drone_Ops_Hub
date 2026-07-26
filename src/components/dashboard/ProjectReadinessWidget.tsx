import { useBatchProjectReadiness } from "@/hooks/useProjectReadiness";
import { Link } from "react-router-dom";
import { TrendingUp, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export function ProjectReadinessWidget() {
  const { analysis } = useBatchProjectReadiness();

  // Show projects that aren't fully ready
  const flagged = analysis.filter((p) => p.overall !== "ready");

  if (flagged.length === 0 && analysis.length > 0) {
    return (
      <div className="surface border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="w-4 h-4 shrink-0 text-success" />
          <span className="section-title mb-0">Project Readiness</span>
        </div>
        <div className="p-6 text-center">
          <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-2" />
          <p className="font-mono text-xs text-muted-foreground">All projects are fully ready</p>
        </div>
      </div>
    );
  }

  if (analysis.length === 0) return null;

  const statusConfig = {
    blocked: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Blocked" },
    needs_review: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Review" },
    ready: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Ready" },
  };

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <TrendingUp className="w-4 h-4 shrink-0 text-warning" />
        <span className="section-title mb-0">Project Readiness</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{flagged.length} need attention</span>
      </div>
      <div className="divide-y divide-border">
        {flagged.slice(0, 6).map((p) => {
          const cfg = statusConfig[p.overall];
          const Icon = cfg.icon;
          return (
            <Link
              key={p.projectId}
              to={`/projects/${p.projectId}?tab=readiness`}
              className="px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors block"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{p.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {p.missing.length > 0 ? p.missing.slice(0, 3).join(" · ") : `${p.score}% ready`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-[10px] text-muted-foreground">{p.score}%</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 ${cfg.color} ${cfg.bg}`}>
                  {cfg.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
