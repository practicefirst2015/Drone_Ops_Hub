import { CheckCircle2, AlertTriangle, XCircle, Crosshair, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { MissionReadinessResult, MissionReadinessDimension } from "@/hooks/useMissionReadiness";
import { Link } from "react-router-dom";

const statusConfig = {
  ready: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Ready" },
  needs_review: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Needs Review" },
  blocked: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Blocked" },
};

const DIMENSION_ACTIONS: Record<string, { label: string; href: string }> = {
  operators: { label: "Assign Operators →", href: "#mission-operators" },
  skills: { label: "Manage Skills →", href: "/skills" },
  certifications: { label: "View Certs →", href: "/skills" },
  drones: { label: "Add Drone →", href: "/drones" },
  project: { label: "Update Project →", href: "#" },
  location: { label: "Set Location →", href: "#mission-location" },
  planning: { label: "Complete Planning →", href: "#mission-notes" },
};

interface Props {
  readiness: MissionReadinessResult;
  compact?: boolean;
  title?: string;
}

function BlockerDetail({ dimension }: { dimension: MissionReadinessDimension }) {
  const action = DIMENSION_ACTIONS[dimension.key];
  return (
    <div className="flex items-start gap-2 py-1.5 pl-5">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] text-muted-foreground">{dimension.detail}</p>
      </div>
      {action && (
        <a
          href={action.href}
          className="font-mono text-[10px] text-primary hover:underline whitespace-nowrap flex items-center gap-0.5"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}

export function MissionReadinessPanel({ readiness, compact = false, title = "Mission Readiness" }: Props) {
  const [showBlockers, setShowBlockers] = useState(true);

  if (readiness.loading) return null;
  if (readiness.dimensions.length === 0) return null;

  const overallCfg = statusConfig[readiness.overall];
  const OverallIcon = overallCfg.icon;
  const blockers = readiness.dimensions.filter((d) => d.status === "blocked" || d.status === "needs_review");

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <OverallIcon className={`w-3.5 h-3.5 ${overallCfg.color}`} />
        <span className={`font-mono text-[10px] px-1.5 py-0.5 ${overallCfg.color} ${overallCfg.bg}`}>
          {readiness.score}% {overallCfg.label}
        </span>
      </div>
    );
  }

  return (
    <div className="surface border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title || "Mission Readiness"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm font-medium ${overallCfg.color}`}>{readiness.score}%</span>
          <span className={`font-mono text-[10px] px-2 py-0.5 ${overallCfg.color} ${overallCfg.bg}`}>
            {overallCfg.label}
          </span>
        </div>
      </div>

      {/* Dimension rows */}
      <div className="space-y-1.5">
        {readiness.dimensions.map((d) => {
          const cfg = statusConfig[d.status];
          const Icon = cfg.icon;
          return (
            <div key={d.key}>
              <div className="flex items-center gap-2">
                <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.color}`} />
                <span className="font-mono text-xs text-foreground flex-1">{d.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[160px]" title={d.detail}>
                  {d.detail}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Blockers section */}
      {blockers.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            onClick={() => setShowBlockers(!showBlockers)}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {showBlockers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {blockers.length} {blockers.length === 1 ? "Issue" : "Issues"} — What's blocking this mission?
          </button>
          {showBlockers && (
            <div className="mt-2 space-y-0.5">
              {blockers.map((d) => (
                <BlockerDetail key={d.key} dimension={d} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
