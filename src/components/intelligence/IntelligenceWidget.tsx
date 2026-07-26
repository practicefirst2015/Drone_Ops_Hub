import { Link } from "react-router-dom";
import { Brain, AlertTriangle, XCircle, Info, Lightbulb, ChevronRight, Sparkles } from "lucide-react";
import type { IntelligenceInsight, InsightSeverity } from "@/hooks/useMissionIntelligence";

const severityConfig: Record<InsightSeverity, { icon: typeof XCircle; color: string; bg: string; label: string }> = {
  critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Critical" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Warning" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10", label: "Info" },
  suggestion: { icon: Lightbulb, color: "text-success", bg: "bg-success/10", label: "Suggestion" },
};

function InsightCard({ insight }: { insight: IntelligenceInsight }) {
  const cfg = severityConfig[insight.severity];
  const Icon = cfg.icon;

  const content = (
    <div className="px-6 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors group">
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm text-foreground font-medium truncate">{insight.title}</p>
          {insight.isRecommendation && (
            <span className="flex items-center gap-0.5 font-mono text-[9px] px-1.5 py-0.5 bg-accent text-accent-foreground shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              REC
            </span>
          )}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">{insight.detail}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`font-mono text-[9px] px-1.5 py-0.5 ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
          <span className="font-mono text-[9px] text-muted-foreground">{insight.entityName}</span>
        </div>
      </div>
      {insight.actionHref && (
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
      )}
    </div>
  );

  if (insight.actionHref) {
    return <Link to={insight.actionHref} className="block">{content}</Link>;
  }
  return content;
}

interface IntelligenceWidgetProps {
  insights: IntelligenceInsight[];
  loading?: boolean;
  title?: string;
  limit?: number;
  compact?: boolean;
}

export function IntelligenceWidget({
  insights,
  loading = false,
  title = "Mission Intelligence",
  limit = 8,
  compact = false,
}: IntelligenceWidgetProps) {
  if (loading) return null;
  if (insights.length === 0) {
    return (
      <div className="surface border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Brain className="w-4 h-4 shrink-0 text-success" />
          <span className="section-title mb-0 leading-4">{title}</span>
        </div>
        <div className="p-6 text-center">
          <Brain className="w-5 h-5 text-success mx-auto mb-2" />
          <p className="font-mono text-xs text-muted-foreground">No issues detected — operations look clear</p>
        </div>
      </div>
    );
  }

  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;
  const displayed = insights.slice(0, limit);
  const remaining = insights.length - displayed.length;
  const headerColor = criticalCount > 0 ? "text-destructive" : warningCount > 0 ? "text-warning" : "text-primary";

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Brain className={`w-4 h-4 shrink-0 ${headerColor}`} />
        <span className="section-title mb-0 leading-4">{title}</span>
        <div className="ml-auto flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="font-mono text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5">{criticalCount} critical</span>
          )}
          {warningCount > 0 && (
            <span className="font-mono text-[10px] text-warning bg-warning/10 px-1.5 py-0.5">{warningCount} warning</span>
          )}
          <span className="font-mono text-[10px] text-muted-foreground">{insights.length} total</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {displayed.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
      {remaining > 0 && (
        <div className="px-6 py-2 border-t border-border">
          <p className="font-mono text-[10px] text-muted-foreground text-center">+{remaining} more insight{remaining > 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline version for project/mission detail pages.
 */
export function IntelligenceBanner({ insights, loading }: { insights: IntelligenceInsight[]; loading?: boolean }) {
  if (loading || insights.length === 0) return null;

  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;
  const topInsight = insights[0];
  const cfg = severityConfig[topInsight.severity];
  const Icon = cfg.icon;

  return (
    <div className={`border ${criticalCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"} p-4`}>
      <div className="flex items-start gap-3">
        <Brain className={`w-4 h-4 flex-shrink-0 mt-0.5 ${criticalCount > 0 ? "text-destructive" : "text-warning"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Intelligence</p>
            {criticalCount > 0 && <span className="font-mono text-[9px] text-destructive bg-destructive/10 px-1.5 py-0.5">{criticalCount} critical</span>}
            {warningCount > 0 && <span className="font-mono text-[9px] text-warning bg-warning/10 px-1.5 py-0.5">{warningCount} warning</span>}
          </div>
          <div className="space-y-1.5">
            {insights.slice(0, 3).map((insight) => {
              const iCfg = severityConfig[insight.severity];
              const IIcon = iCfg.icon;
              return (
                <div key={insight.id} className="flex items-center gap-2">
                  <IIcon className={`w-3 h-3 flex-shrink-0 ${iCfg.color}`} />
                  <span className="font-mono text-[11px] text-foreground truncate">{insight.title}</span>
                  {insight.isRecommendation && (
                    <Sparkles className="w-2.5 h-2.5 text-accent-foreground flex-shrink-0" />
                  )}
                  <span className="font-mono text-[9px] text-muted-foreground flex-shrink-0">{insight.entityName}</span>
                </div>
              );
            })}
            {insights.length > 3 && (
              <p className="font-mono text-[10px] text-muted-foreground">+{insights.length - 3} more</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
