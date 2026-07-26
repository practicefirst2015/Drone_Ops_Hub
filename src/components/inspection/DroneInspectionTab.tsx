import { Shield, TrendingDown, TrendingUp, Minus, HelpCircle } from "lucide-react";
import { AssetConditionBadge, ConditionScoreBar } from "./AssetConditionBadge";
import { useDroneInspectionIntelligence } from "@/hooks/useInspectionIntelligence";
import { format } from "date-fns";

const trendConfig = {
  improving: { icon: TrendingUp, color: "text-success", label: "Improving" },
  stable: { icon: Minus, color: "text-muted-foreground", label: "Stable" },
  worsening: { icon: TrendingDown, color: "text-destructive", label: "Worsening" },
  insufficient_data: { icon: HelpCircle, color: "text-muted-foreground", label: "Insufficient data" },
};

const severityColor: Record<string, string> = {
  critical: "text-destructive bg-destructive/10",
  high: "text-warning bg-warning/10",
  medium: "text-primary bg-primary/10",
  low: "text-muted-foreground bg-muted",
};

const statusColor: Record<string, string> = {
  open: "text-warning bg-warning/10",
  investigating: "text-primary bg-primary/10",
  resolved: "text-success bg-success/10",
  dismissed: "text-muted-foreground bg-muted",
};

export function DroneInspectionTab({ droneId }: { droneId: string }) {
  const { data: intel, isLoading } = useDroneInspectionIntelligence(droneId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (!intel || intel.totalIssues === 0) {
    return (
      <div className="surface border border-border p-8 text-center">
        <Shield className="w-6 h-6 text-success mx-auto mb-3" />
        <p className="text-sm text-foreground font-medium mb-1">No Inspection Issues</p>
        <p className="font-mono text-xs text-muted-foreground">
          No postflight issues have been reported for this drone
        </p>
      </div>
    );
  }

  const trend = trendConfig[intel.recentTrend];
  const TrendIcon = trend.icon;

  return (
    <div className="space-y-6">
      {/* Condition Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="surface border border-border p-5 text-center">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Condition Score</p>
          <p className="font-mono text-2xl text-foreground mb-1">{intel.conditionScore}%</p>
          <AssetConditionBadge riskLevel={intel.riskLevel} compact />
        </div>
        <div className="surface border border-border p-5 text-center">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Total Issues</p>
          <p className="font-mono text-2xl text-foreground">{intel.totalIssues}</p>
          {intel.openIssues > 0 && (
            <p className="font-mono text-[10px] text-warning mt-1">{intel.openIssues} open</p>
          )}
        </div>
        <div className="surface border border-border p-5 text-center">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Critical Issues</p>
          <p className={`font-mono text-2xl ${intel.criticalIssues > 0 ? "text-destructive" : "text-foreground"}`}>
            {intel.criticalIssues}
          </p>
        </div>
        <div className="surface border border-border p-5 text-center">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Trend</p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <TrendIcon className={`w-5 h-5 ${trend.color}`} />
            <span className={`font-mono text-sm ${trend.color}`}>{trend.label}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recurring Defects */}
        <div className="surface border border-border">
          <div className="px-6 py-4 border-b border-border">
            <p className="section-title mb-0">Recurring Defects</p>
          </div>
          {intel.recurringCategories.length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-muted-foreground">
              No recurring patterns detected
            </div>
          ) : (
            <div className="divide-y divide-border">
              {intel.recurringCategories.map((rc) => (
                <div key={rc.category} className="px-6 py-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-foreground">{rc.category}</span>
                  <span className="font-mono text-[10px] text-warning bg-warning/10 px-1.5 py-0.5">
                    ×{rc.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Issue Timeline */}
        <div className="lg:col-span-2 surface border border-border">
          <div className="px-6 py-4 border-b border-border">
            <p className="section-title mb-0">Issue History</p>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {intel.issueHistory.map((issue, i) => (
              <div key={i} className="px-6 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{issue.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {format(new Date(issue.date), "MMM d, yyyy")}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">{issue.category}</span>
                  </div>
                </div>
                <span className={`font-mono text-[9px] px-1.5 py-0.5 shrink-0 ${severityColor[issue.severity] || "text-muted-foreground bg-muted"}`}>
                  {issue.severity}
                </span>
                <span className={`font-mono text-[9px] px-1.5 py-0.5 shrink-0 ${statusColor[issue.status] || "text-muted-foreground bg-muted"}`}>
                  {issue.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
