import { useState } from "react";
import { Wrench, Settings, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { useMaintenanceTracking, useRecordMaintenance, useUpdateMaintenanceIntervals, type MaintenanceStatus } from "@/hooks/useMaintenanceTracking";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

const statusConfig = {
  ok: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", label: "OK" },
  approaching: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Approaching" },
  due: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Due" },
  overdue: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Overdue" },
};

export function MaintenancePanel() {
  const { statuses, isLoading, counts } = useMaintenanceTracking();
  const { canManage } = useOrgRole();
  const recordMaint = useRecordMaintenance();
  const updateIntervals = useUpdateMaintenanceIntervals();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [intervalForm, setIntervalForm] = useState({ hours: "", missions: "" });

  const withIntervals = statuses.filter(s => s.intervalHours || s.intervalMissions);
  const needsAttention = withIntervals.filter(s => s.status !== "ok");

  const handleRecordMaintenance = (drone: MaintenanceStatus) => {
    confirm({
      title: "Record Maintenance",
      description: `Mark "${drone.droneName}" as maintenance complete? This resets utilization counters.`,
      confirmLabel: "Complete Maintenance",
      variant: "default",
      onConfirm: async () => {
        try {
          await recordMaint.mutateAsync({ droneId: drone.droneId });
          toast.success(`Maintenance recorded for ${drone.droneName}`);
        } catch (err: any) {
          toast.error(err.message);
        }
      },
    });
  };

  const startEditIntervals = (s: MaintenanceStatus) => {
    setEditingId(s.droneId);
    setIntervalForm({
      hours: s.intervalHours?.toString() || "",
      missions: s.intervalMissions?.toString() || "",
    });
  };

  const saveIntervals = async (droneId: string) => {
    try {
      await updateIntervals.mutateAsync({
        droneId,
        intervalHours: intervalForm.hours ? parseFloat(intervalForm.hours) : null,
        intervalMissions: intervalForm.missions ? parseInt(intervalForm.missions) : null,
      });
      setEditingId(null);
      toast.success("Maintenance intervals updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return null;
  if (statuses.length === 0) return null;

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Wrench className="w-4 h-4 text-muted-foreground" />
        <p className="section-title mb-0">Maintenance Tracking</p>
        {needsAttention.length > 0 && (
          <span className="ml-auto font-mono text-[10px] text-warning bg-warning/10 px-2 py-0.5">
            {needsAttention.length} need attention
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {statuses.map((s) => {
          const cfg = statusConfig[s.status];
          const StatusIcon = cfg.icon;
          const hasIntervals = s.intervalHours || s.intervalMissions;

          return (
            <div key={s.droneId} className="px-6 py-3">
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground truncate">{s.droneName}</p>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
                  </div>

                  {hasIntervals ? (
                    <div className="flex items-center gap-4 mt-1">
                      {s.intervalHours && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1 bg-border">
                            <div
                              className={`h-full transition-all ${
                                (s.hoursProgress ?? 0) >= 1 ? "bg-destructive" :
                                (s.hoursProgress ?? 0) >= 0.75 ? "bg-warning" : "bg-success"
                              }`}
                              style={{ width: `${Math.min(100, (s.hoursProgress ?? 0) * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {s.hoursSinceMaintenance.toFixed(1)}/{s.intervalHours}h
                          </span>
                        </div>
                      )}
                      {s.intervalMissions && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1 bg-border">
                            <div
                              className={`h-full transition-all ${
                                (s.missionsProgress ?? 0) >= 1 ? "bg-destructive" :
                                (s.missionsProgress ?? 0) >= 0.75 ? "bg-warning" : "bg-success"
                              }`}
                              style={{ width: `${Math.min(100, (s.missionsProgress ?? 0) * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {s.missionsSinceMaintenance}/{s.intervalMissions} missions
                          </span>
                        </div>
                      )}
                      {s.lastMaintenanceDate && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Last: {s.lastMaintenanceDate}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">No intervals configured</p>
                  )}

                  {/* Inline edit intervals */}
                  {editingId === s.droneId && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number" step="any" placeholder="Hours interval"
                        value={intervalForm.hours}
                        onChange={(e) => setIntervalForm({ ...intervalForm, hours: e.target.value })}
                        className="w-28 bg-background border border-border px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                      />
                      <input
                        type="number" placeholder="Mission interval"
                        value={intervalForm.missions}
                        onChange={(e) => setIntervalForm({ ...intervalForm, missions: e.target.value })}
                        className="w-28 bg-background border border-border px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                      />
                      <button onClick={() => saveIntervals(s.droneId)}
                        className="font-mono text-[10px] text-primary hover:underline">Save</button>
                      <button onClick={() => setEditingId(null)}
                        className="font-mono text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  )}
                </div>

                {canManage && editingId !== s.droneId && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => startEditIntervals(s)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Set intervals">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    {hasIntervals && s.status !== "ok" && (
                      <button onClick={() => handleRecordMaintenance(s)}
                        className="font-mono text-[10px] px-2 py-1 border border-primary text-primary hover:bg-primary/10 transition-colors">
                        Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationDialog />
    </div>
  );
}
