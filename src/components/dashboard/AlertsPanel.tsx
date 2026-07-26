import { useState } from "react";
import { useOperationalAlerts, type AlertType, type AlertUrgency } from "@/hooks/useOperationalAlerts";
import { AlertTriangle, ShieldAlert, Wrench, XCircle, Info, FileWarning, Users } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const urgencyConfig = {
  critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Critical" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Warning" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-muted", label: "Info" },
};

const typeConfig: Record<string, { icon: typeof ShieldAlert; label: string }> = {
  certification: { icon: ShieldAlert, label: "Certifications" },
  maintenance: { icon: Wrench, label: "Maintenance" },
  postflight_issue: { icon: FileWarning, label: "Issues" },
  pilot_currency: { icon: Users, label: "Pilot Currency" },
};

export function AlertsPanel({ limit = 12 }: { limit?: number }) {
  const [filterType, setFilterType] = useState<AlertType | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<AlertUrgency | null>(null);

  const { alerts, isLoading, counts } = useOperationalAlerts({ filterType, filterUrgency });

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
        <span className="section-title mb-0">Operational Alerts</span>
        {counts.critical > 0 && (
          <span className="ml-auto font-mono text-[10px] text-destructive bg-destructive/10 px-2 py-0.5">
            {counts.critical} critical
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2">
        <FilterChip active={!filterType} onClick={() => setFilterType(null)} label={`All (${counts.total})`} />
        <FilterChip
          active={filterType === "certification"}
          onClick={() => setFilterType(filterType === "certification" ? null : "certification")}
          label={`Certs (${counts.certification})`}
        />
        <FilterChip
          active={filterType === "maintenance"}
          onClick={() => setFilterType(filterType === "maintenance" ? null : "maintenance")}
          label={`Maint (${counts.maintenance})`}
        />
        <FilterChip
          active={filterType === "postflight_issue"}
          onClick={() => setFilterType(filterType === "postflight_issue" ? null : "postflight_issue")}
          label={`Issues (${counts.postflight_issue})`}
        />
        <FilterChip
          active={filterType === "pilot_currency"}
          onClick={() => setFilterType(filterType === "pilot_currency" ? null : "pilot_currency")}
          label={`Pilots (${counts.pilot_currency})`}
        />
        <span className="w-px h-5 bg-border mx-1" />
        <FilterChip
          active={filterUrgency === "critical"}
          onClick={() => setFilterUrgency(filterUrgency === "critical" ? null : "critical")}
          label="Critical"
          className="text-destructive"
        />
        <FilterChip
          active={filterUrgency === "warning"}
          onClick={() => setFilterUrgency(filterUrgency === "warning" ? null : "warning")}
          label="Warning"
          className="text-warning"
        />
        <FilterChip
          active={filterUrgency === "info"}
          onClick={() => setFilterUrgency(filterUrgency === "info" ? null : "info")}
          label="Info"
        />
      </div>

      {/* Alert List */}
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-muted-foreground">
            {counts.total === 0 ? "No active alerts — all clear" : "No alerts match filter"}
          </div>
        ) : (
          alerts.slice(0, limit).map((alert) => {
            const ucfg = urgencyConfig[alert.urgency];
            const UIcon = ucfg.icon;
            const tcfg = typeConfig[alert.type];
            const TypeIcon = tcfg?.icon || Info;

            const linkTo = alert.type === "postflight_issue" && alert.metadata?.flightLogId
              ? `/flight-logs/${alert.metadata.flightLogId}`
              : undefined;

            const content = (
              <div className={`px-6 py-3 flex items-center gap-3 ${linkTo ? "hover:bg-secondary/30 transition-colors" : ""}`}>
                <UIcon className={`w-4 h-4 flex-shrink-0 ${ucfg.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground truncate">{alert.title}</p>
                    <TypeIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground truncate">{alert.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-mono text-[10px] px-2 py-0.5 ${ucfg.color} ${ucfg.bg}`}>
                    {alert.type === "postflight_issue"
                      ? `${Math.abs(alert.daysRemaining)}d open`
                      : alert.type === "pilot_currency"
                        ? `${Math.abs(alert.daysRemaining)}d since flight`
                        : alert.daysRemaining <= 0
                          ? `${Math.abs(alert.daysRemaining)}d overdue`
                          : `${alert.daysRemaining}d left`}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                    {format(alert.dueDate, "MMM d")}
                  </span>
                </div>
              </div>
            );

            return linkTo ? (
              <Link key={alert.id} to={linkTo} className="block">
                {content}
              </Link>
            ) : (
              <div key={alert.id}>{content}</div>
            );
          })
        )}
      </div>

      {alerts.length > limit && (
        <div className="px-6 py-2 border-t border-border text-center">
          <span className="font-mono text-[10px] text-muted-foreground">
            +{alerts.length - limit} more alerts
          </span>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
      } ${className}`}
    >
      {label}
    </button>
  );
}
