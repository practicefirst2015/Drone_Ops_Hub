import { useFleetStats } from "@/hooks/useFleetManagement";
import { Plane, Battery, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export function FleetAvailabilityWidget() {
  const { stats, isLoading } = useFleetStats();

  if (isLoading || stats.totalDrones === 0) return null;

  const hasAlerts = stats.inMaintenance > 0 || stats.maintenanceDue > 0 || stats.lowHealthBatteries > 0;
  const headerColor = stats.inMaintenance > 0 ? "text-warning" : "text-success";

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Plane className={`w-4 h-4 shrink-0 ${headerColor}`} />
        <span className="section-title mb-0 leading-4">Fleet Status</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{stats.totalDrones} units</span>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-px bg-border">
        <StatusBox label="Available" value={stats.available} color="text-success" />
        <StatusBox label="Assigned" value={stats.assigned} color="text-primary" />
        <StatusBox label="Maintenance" value={stats.inMaintenance} color="text-warning" />
        <StatusBox label="Retired" value={stats.retired} color="text-muted-foreground" />
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="divide-y divide-border border-t border-border">
          {stats.maintenanceDue > 0 && (
            <Link to="/drones?tab=fleet" className="px-6 py-3 flex items-center gap-2 hover:bg-muted/30 transition-colors">
              <Wrench className="w-3.5 h-3.5 text-warning flex-shrink-0" />
              <span className="font-mono text-xs text-foreground">{stats.maintenanceDue} drone{stats.maintenanceDue > 1 ? "s" : ""} due for maintenance</span>
            </Link>
          )}
          {stats.lowHealthBatteries > 0 && (
            <Link to="/drones?tab=fleet" className="px-6 py-3 flex items-center gap-2 hover:bg-muted/30 transition-colors">
              <Battery className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              <span className="font-mono text-xs text-foreground">{stats.lowHealthBatteries} batter{stats.lowHealthBatteries > 1 ? "ies" : "y"} below 50% health</span>
            </Link>
          )}
          {stats.inMaintenance > 0 && (
            <Link to="/drones?tab=fleet" className="px-6 py-3 flex items-center gap-2 hover:bg-muted/30 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
              <span className="font-mono text-xs text-foreground">{stats.inMaintenance} drone{stats.inMaintenance > 1 ? "s" : ""} currently in maintenance</span>
            </Link>
          )}
        </div>
      )}

      {!hasAlerts && (
        <div className="px-6 py-4 border-t border-border text-center">
          <CheckCircle2 className="w-4 h-4 text-success mx-auto mb-1" />
          <p className="font-mono text-[10px] text-muted-foreground">All fleet units operational</p>
        </div>
      )}

      {/* Battery summary */}
      {stats.totalBatteries > 0 && (
        <div className="px-6 py-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-mono text-[10px] text-muted-foreground">Battery Inventory</span>
          </div>
          <span className="font-mono text-xs text-foreground">{stats.availableBatteries}/{stats.totalBatteries} available</span>
        </div>
      )}
    </div>
  );
}

function StatusBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card p-3 text-center">
      <p className={`font-mono text-lg ${value > 0 ? color : "text-muted-foreground"}`}>{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
