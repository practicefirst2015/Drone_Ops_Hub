import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Shield, Plane, Calendar, ChevronDown, ChevronRight, Target, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { usePilotCurrency, type PilotCurrencyStatus } from "@/hooks/usePilotCurrency";

const COMPLIANCE_CONFIG = {
  compliant: { label: "Compliant", color: "text-success bg-success/10", icon: CheckCircle2 },
  warning: { label: "Warning", color: "text-warning bg-warning/10", icon: AlertTriangle },
  non_compliant: { label: "Non-Compliant", color: "text-destructive bg-destructive/10", icon: XCircle },
};

const CURRENCY_CONFIG = {
  current: { label: "Current", color: "text-success" },
  warning: { label: "Lapsing", color: "text-warning" },
  expired: { label: "Expired", color: "text-destructive" },
};

const MISSION_STATUS_COLOR: Record<string, string> = {
  draft: "text-muted-foreground",
  planned: "text-primary",
  in_progress: "text-warning",
  completed: "text-success",
  cancelled: "text-muted-foreground",
};

export function PilotCurrencyPanel() {
  const { pilots, counts, isLoading } = usePilotCurrency();

  if (isLoading) {
    return (
      <div className="surface border border-border p-8 flex justify-center">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        <div className="surface p-5">
          <p className="stat-label">Total Pilots</p>
          <p className="stat-value mt-1">{counts.total}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Compliant</p>
          <p className="stat-value mt-1 text-success">{counts.compliant}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Warning</p>
          <p className={`stat-value mt-1 ${counts.warning > 0 ? "text-warning" : ""}`}>{counts.warning}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Non-Compliant</p>
          <p className={`stat-value mt-1 ${counts.nonCompliant > 0 ? "text-destructive" : ""}`}>{counts.nonCompliant}</p>
        </div>
      </div>

      {/* Pilot list */}
      {pilots.length === 0 ? (
        <div className="surface border border-border p-8 text-center">
          <p className="font-mono text-xs text-muted-foreground">No team members found.</p>
        </div>
      ) : (
        <div className="space-y-px">
          {pilots.map((pilot) => (
            <PilotRow key={pilot.userId} pilot={pilot} />
          ))}
        </div>
      )}
    </div>
  );
}

function PilotRow({ pilot }: { pilot: PilotCurrencyStatus }) {
  const [expanded, setExpanded] = useState(false);
  const compliance = COMPLIANCE_CONFIG[pilot.complianceStatus];
  const currency = CURRENCY_CONFIG[pilot.currencyStatus];
  const CompIcon = compliance.icon;

  return (
    <div className="surface border border-border">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-secondary/20 transition-colors"
      >
        <CompIcon className={`w-4 h-4 shrink-0 ${compliance.color.split(" ")[0]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-foreground">{pilot.fullName}</p>
          <div className="flex items-center gap-3 mt-1 font-mono text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Plane className="w-2.5 h-2.5" />
              {pilot.totalFlights} flights · {pilot.totalHours.toFixed(1)}h total
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {pilot.flightsLast90Days} flights · {pilot.hoursLast90Days.toFixed(1)}h last 90d
            </span>
            {pilot.lastFlightDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                Last: {format(new Date(pilot.lastFlightDate), "MMM d, yyyy")}
                {pilot.daysSinceLastFlight !== null && (
                  <span className={currency.color}> ({pilot.daysSinceLastFlight}d ago)</span>
                )}
              </span>
            )}
            {!pilot.lastFlightDate && (
              <span className="text-destructive">No flights recorded</span>
            )}
          </div>
          {/* Compliance reasons */}
          {pilot.complianceReasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {pilot.complianceReasons.map((reason, i) => (
                <span
                  key={i}
                  className={`font-mono text-[10px] px-1.5 py-0.5 ${
                    pilot.complianceStatus === "non_compliant"
                      ? "text-destructive bg-destructive/10"
                      : "text-warning bg-warning/10"
                  }`}
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-mono text-[10px] px-2 py-0.5 ${currency.color}`}>
            {currency.label}
          </span>
          <span className={`font-mono text-[10px] px-2 py-0.5 ${compliance.color}`}>
            {compliance.label}
          </span>
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border">
          {/* Certifications */}
          {pilot.certifications.length > 0 && (
            <div className="px-6 py-3 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Certifications</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pilot.certifications.map((cert) => (
                  <span
                    key={cert.id}
                    className={`font-mono text-[10px] px-2 py-0.5 ${
                      cert.isExpired
                        ? "text-destructive bg-destructive/10"
                        : cert.isExpiringSoon
                          ? "text-warning bg-warning/10"
                          : "text-success bg-success/10"
                    }`}
                  >
                    {cert.skillName}
                    {cert.daysUntilExpiry !== null && (
                      <span className="ml-1">
                        {cert.isExpired
                          ? `(${Math.abs(cert.daysUntilExpiry)}d overdue)`
                          : cert.isExpiringSoon
                            ? `(${cert.daysUntilExpiry}d left)`
                            : `(valid)`}
                      </span>
                    )}
                    {cert.expiryDate === null && <span className="ml-1">(no expiry)</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {pilot.certifications.length === 0 && (
            <div className="px-6 py-3 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-[10px] text-muted-foreground">No certifications on file</span>
              </div>
            </div>
          )}

          {/* Mission cert gaps */}
          {pilot.missionCertGaps.length > 0 && (
            <div className="px-6 py-3 border-b border-border bg-destructive/5">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3 h-3 text-destructive" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">Missing Mission Certifications</span>
              </div>
              <div className="space-y-1">
                {pilot.missionCertGaps.map((gap, i) => (
                  <div key={i} className="font-mono text-[10px] text-foreground flex items-center gap-2">
                    <span className="text-destructive">✕</span>
                    <span className="text-muted-foreground">{gap.missionTitle}:</span>
                    <span>{gap.requiredSkillName}</span>
                    {gap.missionDate && (
                      <span className="text-muted-foreground">({format(new Date(gap.missionDate), "MMM d")})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent missions */}
          {pilot.recentMissions.length > 0 && (
            <div className="px-6 py-3 bg-secondary/10">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Assigned Missions ({pilot.recentMissions.length})
                </span>
              </div>
              <div className="space-y-1">
                {pilot.recentMissions.slice(0, 5).map((mission) => (
                  <div key={mission.missionId} className="font-mono text-[10px] flex items-center gap-2">
                    <span className={MISSION_STATUS_COLOR[mission.missionStatus] || "text-muted-foreground"}>●</span>
                    <span className="text-foreground truncate">{mission.missionTitle}</span>
                    <span className="text-muted-foreground">({mission.role})</span>
                    {mission.missionDate && (
                      <span className="text-muted-foreground ml-auto shrink-0">
                        {format(new Date(mission.missionDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                ))}
                {pilot.recentMissions.length > 5 && (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    +{pilot.recentMissions.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
          {pilot.recentMissions.length === 0 && (
            <div className="px-6 py-3 bg-secondary/10">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-[10px] text-muted-foreground">No mission assignments</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
