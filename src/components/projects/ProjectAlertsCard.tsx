import { useOperationalAlerts } from "@/hooks/useOperationalAlerts";
import { AlertTriangle, XCircle, Info, ShieldAlert, Wrench } from "lucide-react";
import { format } from "date-fns";

const urgencyConfig = {
  critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-muted" },
};

export function ProjectAlertsCard({
  memberIds,
  droneIds,
}: {
  memberIds: string[];
  droneIds: string[];
}) {
  const { alerts, isLoading } = useOperationalAlerts({
    projectMemberIds: memberIds.length > 0 ? memberIds : undefined,
    droneIds: droneIds.length > 0 ? droneIds : undefined,
  });

  // Only show alerts relevant to this project's members or drones
  const relevant = alerts.filter(
    (a) =>
      (a.type === "certification" && memberIds.includes(a.metadata?.userId)) ||
      (a.type === "maintenance" && droneIds.includes(a.entityId))
  );

  if (isLoading) return null;
  if (relevant.length === 0) return null;

  return (
    <div className="surface border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-warning" />
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Alerts</p>
        <span className="ml-auto font-mono text-[10px] text-warning bg-warning/10 px-2 py-0.5">
          {relevant.length}
        </span>
      </div>
      <div className="space-y-2">
        {relevant.slice(0, 5).map((alert) => {
          const ucfg = urgencyConfig[alert.urgency];
          const UIcon = ucfg.icon;
          return (
            <div key={alert.id} className="flex items-center gap-2">
              <UIcon className={`w-3 h-3 flex-shrink-0 ${ucfg.color}`} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] text-foreground truncate">{alert.title}</p>
                <p className="font-mono text-[10px] text-muted-foreground truncate">{alert.subtitle}</p>
              </div>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 flex-shrink-0 ${ucfg.color} ${ucfg.bg}`}>
                {alert.daysRemaining <= 0 ? `${Math.abs(alert.daysRemaining)}d late` : `${alert.daysRemaining}d`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
