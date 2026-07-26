import { Shield, ShieldAlert, TrendingDown, TrendingUp, Minus, HelpCircle, AlertTriangle } from "lucide-react";
import { AssetConditionBadge, ConditionScoreBar } from "./AssetConditionBadge";
import type { InspectionSummary, AssetCondition } from "@/hooks/useInspectionIntelligence";

const trendConfig = {
  improving: { icon: TrendingUp, color: "text-success", label: "Improving" },
  stable: { icon: Minus, color: "text-muted-foreground", label: "Stable" },
  worsening: { icon: TrendingDown, color: "text-destructive", label: "Worsening" },
  insufficient_data: { icon: HelpCircle, color: "text-muted-foreground", label: "Insufficient data" },
};

interface InspectionIntelligencePanelProps {
  data: InspectionSummary | undefined;
  loading?: boolean;
  limit?: number;
}

export function InspectionIntelligencePanel({ data, loading = false, limit = 6 }: InspectionIntelligencePanelProps) {
  if (loading) return null;

  if (!data || data.insufficientData) {
    return (
      <div className="surface border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="section-title mb-0 leading-4">Inspection Intelligence</span>
        </div>
        <div className="p-6 text-center">
          <Shield className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-xs text-muted-foreground">
            No inspection data available — report postflight issues to enable analysis
          </p>
        </div>
      </div>
    );
  }

  const displayed = data.allAssets.slice(0, limit);
  const remaining = data.allAssets.length - displayed.length;
  const headerColor = data.highRiskAssets.length > 0 ? "text-warning" : "text-success";

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Shield className={`w-4 h-4 shrink-0 ${headerColor}`} />
        <span className="section-title mb-0 leading-4">Inspection Intelligence</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            Fleet Health: {data.overallHealthScore}%
          </span>
          {data.assetsAtRisk > 0 && (
            <span className="font-mono text-[10px] text-warning bg-warning/10 px-1.5 py-0.5">
              {data.assetsAtRisk} at risk
            </span>
          )}
        </div>
      </div>

      {/* Recurring defects summary */}
      {data.topRecurringDefects.length > 0 && (
        <div className="px-6 py-3 border-b border-border bg-muted/20">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
            Recurring Defects
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.topRecurringDefects.map((d) => (
              <span
                key={d.category}
                className="font-mono text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning"
              >
                {d.category} ×{d.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Asset list */}
      <div className="divide-y divide-border">
        {displayed.map((asset) => (
          <AssetRow key={asset.droneId} asset={asset} />
        ))}
      </div>

      {remaining > 0 && (
        <div className="px-6 py-2 border-t border-border">
          <p className="font-mono text-[10px] text-muted-foreground text-center">
            +{remaining} more asset{remaining > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function AssetRow({ asset }: { asset: AssetCondition }) {
  const trend = trendConfig[asset.recentTrend];
  const TrendIcon = trend.icon;

  return (
    <div className="px-6 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm text-foreground font-medium truncate">{asset.droneName}</p>
          <AssetConditionBadge riskLevel={asset.riskLevel} compact />
        </div>
        <div className="flex items-center gap-3 mb-1.5">
          <span className="font-mono text-[10px] text-muted-foreground">{asset.droneModel}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {asset.totalIssues} issue{asset.totalIssues !== 1 ? "s" : ""}
          </span>
          {asset.openIssues > 0 && (
            <span className="font-mono text-[10px] text-warning">
              {asset.openIssues} open
            </span>
          )}
          {asset.criticalIssues > 0 && (
            <span className="font-mono text-[10px] text-destructive">
              {asset.criticalIssues} critical
            </span>
          )}
        </div>
        <div className="w-32">
          <ConditionScoreBar score={asset.conditionScore} />
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <TrendIcon className={`w-3 h-3 ${trend.color}`} />
        <span className={`font-mono text-[9px] ${trend.color}`}>{trend.label}</span>
      </div>
    </div>
  );
}

/** Compact banner for project detail pages */
export function InspectionBanner({
  totalIssues,
  openIssues,
  criticalIssues,
  recurringDefects,
  assetBreakdown,
  insufficientData,
}: {
  totalIssues: number;
  openIssues: number;
  criticalIssues: number;
  recurringDefects: { category: string; count: number }[];
  assetBreakdown: { droneId: string; droneName: string; conditionScore: number; riskLevel: string; issueCount: number; openCount: number }[];
  insufficientData: boolean;
}) {
  if (insufficientData) return null;
  if (totalIssues === 0) return null;

  const hasRisk = criticalIssues > 0 || openIssues > 0;

  return (
    <div className={`border ${criticalIssues > 0 ? "border-destructive/30 bg-destructive/5" : hasRisk ? "border-warning/30 bg-warning/5" : "border-border bg-muted/20"} p-4`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className={`w-4 h-4 flex-shrink-0 mt-0.5 ${criticalIssues > 0 ? "text-destructive" : hasRisk ? "text-warning" : "text-muted-foreground"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Inspection Intelligence
            </p>
            <span className="font-mono text-[9px] text-muted-foreground">
              {totalIssues} issue{totalIssues !== 1 ? "s" : ""}
            </span>
            {openIssues > 0 && (
              <span className="font-mono text-[9px] text-warning bg-warning/10 px-1.5 py-0.5">
                {openIssues} open
              </span>
            )}
            {criticalIssues > 0 && (
              <span className="font-mono text-[9px] text-destructive bg-destructive/10 px-1.5 py-0.5">
                {criticalIssues} critical
              </span>
            )}
          </div>
          {recurringDefects.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {recurringDefects.slice(0, 3).map((d) => (
                <span key={d.category} className="font-mono text-[10px] text-warning">
                  <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                  {d.category} ×{d.count}
                </span>
              ))}
            </div>
          )}
          {assetBreakdown.length > 0 && (
            <div className="space-y-1">
              {assetBreakdown.slice(0, 3).map((a) => (
                <div key={a.droneId} className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-foreground">{a.droneName}</span>
                  <ConditionScoreBar score={a.conditionScore} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
