import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import type { RiskLevel } from "@/hooks/useInspectionIntelligence";

const riskConfig: Record<RiskLevel, { icon: typeof Shield; color: string; bg: string; label: string }> = {
  low: { icon: ShieldCheck, color: "text-success", bg: "bg-success/10", label: "Low Risk" },
  moderate: { icon: Shield, color: "text-primary", bg: "bg-primary/10", label: "Moderate" },
  high: { icon: ShieldAlert, color: "text-warning", bg: "bg-warning/10", label: "High Risk" },
  critical: { icon: ShieldX, color: "text-destructive", bg: "bg-destructive/10", label: "Critical" },
};

interface AssetConditionBadgeProps {
  riskLevel: RiskLevel;
  conditionScore?: number;
  compact?: boolean;
}

export function AssetConditionBadge({ riskLevel, conditionScore, compact = false }: AssetConditionBadgeProps) {
  const cfg = riskConfig[riskLevel];
  const Icon = cfg.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 ${cfg.color} ${cfg.bg}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-xs px-2 py-1 ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{cfg.label}</span>
      {conditionScore !== undefined && (
        <span className="text-[10px] opacity-80">{conditionScore}%</span>
      )}
    </div>
  );
}

export function ConditionScoreBar({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-success" : score >= 55 ? "bg-primary" : score >= 30 ? "bg-warning" : "bg-destructive";

  return (
    <div className="flex items-center gap-2">
      <div className="w-full h-1.5 bg-border">
        <div className={`h-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{score}%</span>
    </div>
  );
}
