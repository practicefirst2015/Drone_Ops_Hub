import { useState } from "react";
import { ArrowLeft, Wrench, Battery, Activity, MapPin, Calendar, Plus, X, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useBatteries, useCreateBattery, useUpdateBattery, useDeleteBattery, useMaintenanceEvents, useCreateMaintenanceEvent, useDroneFlightHistory } from "@/hooks/useFleetManagement";
import { useDroneMaintenanceStatus, useRecordMaintenance } from "@/hooks/useMaintenanceTracking";
import { toast } from "sonner";
import { DroneInspectionTab } from "@/components/inspection/DroneInspectionTab";
import { useDroneInspectionIntelligence } from "@/hooks/useInspectionIntelligence";
import { AssetConditionBadge } from "@/components/inspection/AssetConditionBadge";
import { format } from "date-fns";

interface Props {
  droneId: string;
  onBack: () => void;
}

const statusColor = (s: string) => {
  switch (s) {
    case "available": return "text-success bg-success/10";
    case "assigned": case "in_flight": return "text-primary bg-primary/10";
    case "maintenance": case "charging": return "text-warning bg-warning/10";
    case "retired": return "text-muted-foreground bg-muted";
    default: return "text-muted-foreground bg-muted";
  }
};

const maintStatusColor = (s: string) => {
  switch (s) {
    case "ok": return "text-success";
    case "approaching": return "text-warning";
    case "due": case "overdue": return "text-destructive";
    default: return "text-muted-foreground";
  }
};

export function DroneUnitDetail({ droneId, onBack }: Props) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const { canManage } = useOrgRole();
  const orgId = currentOrg?.id;
  const [activeTab, setActiveTab] = useState<"overview" | "maintenance" | "batteries" | "flights" | "inspection">("overview");

  const { data: drone, isLoading } = useQuery({
    queryKey: ["fleet_drone_detail", droneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drones")
        .select("*, drone_models:drone_model_id(id, name, category, drone_manufacturers(name))")
        .eq("id", droneId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!droneId,
  });

  const { data: batteries = [] } = useBatteries(droneId);
  const { data: allBatteries = [] } = useBatteries();
  const { data: maintenanceEvents = [] } = useMaintenanceEvents(droneId);
  const { data: flights = [] } = useDroneFlightHistory(droneId);
  const { status: maintStatus } = useDroneMaintenanceStatus(droneId);
  const { data: droneIntel } = useDroneInspectionIntelligence(droneId);
  const recordMaintenance = useRecordMaintenance();
  const createBattery = useCreateBattery();
  const updateBattery = useUpdateBattery();
  const deleteBattery = useDeleteBattery();
  const createMaintenanceEvent = useCreateMaintenanceEvent();

  const [addBatteryOpen, setAddBatteryOpen] = useState(false);
  const [batteryForm, setBatteryForm] = useState({ name: "", serial_number: "", type: "LiPo", capacity_mah: "", notes: "" });
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ event_type: "routine", description: "", performed_at: new Date().toISOString().split("T")[0], cost: "", parts_replaced: "", notes: "" });

  const inputCls = "w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary";
  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "inspection" as const, label: "Inspection" },
    { key: "maintenance" as const, label: "Maintenance" },
    { key: "batteries" as const, label: "Batteries" },
    { key: "flights" as const, label: "Flight History" },
  ];

  if (isLoading || !drone) {
    return (
      <div className="p-8">
        <button onClick={onBack} className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-3 h-3" /> Fleet
        </button>
        <div className="flex items-center justify-center py-16"><div className="w-2 h-2 bg-primary animate-pulse-glow" /></div>
      </div>
    );
  }

  const droneModel = drone.drone_models as any;

  return (
    <div>
      {/* Header */}
      <button onClick={onBack} className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" /> Fleet Registry
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="page-title mb-1">{drone.name}</h2>
          <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
            <span>{drone.model}</span>
            {drone.serial_number && <span>SN: {drone.serial_number}</span>}
            {droneModel && <span>{droneModel.drone_manufacturers?.name} {droneModel.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs px-2 py-1 ${statusColor(drone.status)}`}>{drone.status}</span>
          {maintStatus && (
            <span className={`font-mono text-xs px-2 py-1 ${maintStatusColor(maintStatus.status)} bg-background border border-border`}>
              {maintStatus.status === "ok" ? "Maint. OK" : maintStatus.status}
            </span>
          )}
          {droneIntel && droneIntel.totalIssues > 0 && (
            <AssetConditionBadge riskLevel={droneIntel.riskLevel} conditionScore={droneIntel.conditionScore} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6 flex gap-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-3 font-mono text-xs tracking-wide transition-colors border-b-2 -mb-px ${
              activeTab === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox label="Flight Hours" value={Number(drone.flight_hours || 0).toFixed(1)} icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />} />
              <StatBox label="Battery Level" value={`${drone.battery_level ?? 100}%`} icon={<Battery className="w-3.5 h-3.5 text-muted-foreground" />} />
              <StatBox label="Total Flights" value={String(flights.length)} icon={<Activity className="w-3.5 h-3.5 text-muted-foreground" />} />
              <StatBox label="Batteries" value={String(batteries.length)} icon={<Battery className="w-3.5 h-3.5 text-muted-foreground" />} />
            </div>

            {/* Details */}
            <div className="surface border border-border p-6">
              <p className="section-title mb-4">Unit Details</p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                <InfoRow label="Name" value={drone.name} />
                <InfoRow label="Model" value={drone.model} />
                <InfoRow label="Serial Number" value={drone.serial_number || "—"} />
                <InfoRow label="Status" value={<span className={`font-mono text-xs px-2 py-0.5 ${statusColor(drone.status)}`}>{drone.status}</span>} />
                <InfoRow label="Acquisition Date" value={drone.acquisition_date || "—"} />
                <InfoRow label="Catalog Model" value={droneModel ? `${droneModel.drone_manufacturers?.name} ${droneModel.name}` : "—"} />
                <InfoRow label="Flight Hours" value={`${Number(drone.flight_hours || 0).toFixed(1)} hrs`} />
                <InfoRow label="Last Maintenance" value={drone.last_maintenance_date || "Never"} />
              </div>
            </div>

            {/* Recent Flights */}
            <div className="surface border border-border">
              <div className="px-6 py-4 border-b border-border">
                <p className="section-title mb-0">Recent Flights</p>
              </div>
              {flights.length === 0 ? (
                <div className="p-6 text-center font-mono text-xs text-muted-foreground">No flight history for this unit</div>
              ) : (
                <div className="divide-y divide-border">
                  {flights.slice(0, 5).map((f: any) => (
                    <div key={f.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">{f.title}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {f.projects?.name} · {f.flight_date} · {f.profiles?.full_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.duration_minutes && <span className="font-mono text-[10px] text-muted-foreground">{f.duration_minutes}m</span>}
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 ${f.outcome === "completed" ? "text-success bg-success/10" : f.outcome === "aborted" ? "text-destructive bg-destructive/10" : "text-warning bg-warning/10"}`}>
                          {f.outcome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Maintenance Status */}
            {maintStatus && (maintStatus.intervalHours || maintStatus.intervalMissions) && (
              <div className="surface border border-border p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Maintenance Status</p>
                <div className="space-y-3">
                  {maintStatus.intervalHours && (
                    <div>
                      <div className="flex justify-between font-mono text-[10px] text-muted-foreground mb-1">
                        <span>Hours: {maintStatus.hoursSinceMaintenance.toFixed(1)} / {maintStatus.intervalHours}</span>
                        <span>{((maintStatus.hoursProgress ?? 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-border">
                        <div
                          className={`h-full transition-all ${maintStatus.hoursProgress && maintStatus.hoursProgress >= 0.9 ? "bg-destructive" : maintStatus.hoursProgress && maintStatus.hoursProgress >= 0.75 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${Math.min(100, (maintStatus.hoursProgress ?? 0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {maintStatus.intervalMissions && (
                    <div>
                      <div className="flex justify-between font-mono text-[10px] text-muted-foreground mb-1">
                        <span>Missions: {maintStatus.missionsSinceMaintenance} / {maintStatus.intervalMissions}</span>
                        <span>{((maintStatus.missionsProgress ?? 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-border">
                        <div
                          className={`h-full transition-all ${maintStatus.missionsProgress && maintStatus.missionsProgress >= 0.9 ? "bg-destructive" : maintStatus.missionsProgress && maintStatus.missionsProgress >= 0.75 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${Math.min(100, (maintStatus.missionsProgress ?? 0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {canManage && (
                    <button
                      onClick={async () => {
                        await recordMaintenance.mutateAsync({ droneId });
                        toast.success("Maintenance recorded");
                      }}
                      className="w-full h-8 border border-border text-muted-foreground font-mono text-xs hover:text-foreground hover:border-foreground transition-colors mt-2"
                    >
                      <Wrench className="w-3 h-3 inline mr-1" /> Record Service
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Batteries */}
            <div className="surface border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Assigned Batteries</p>
                <span className="font-mono text-[10px] text-muted-foreground">{batteries.length}</span>
              </div>
              {batteries.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No batteries assigned</p>
              ) : (
                <div className="space-y-2">
                  {batteries.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-foreground">{b.name}</p>
                        <p className="font-mono text-[9px] text-muted-foreground">{b.type} · {b.capacity_mah ? `${b.capacity_mah}mAh` : "—"} · {b.cycle_count} cycles</p>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{b.health_percent}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          {canManage && (
            <div className="flex justify-end">
              <button onClick={() => setAddEventOpen(true)} className="h-9 px-3 bg-primary text-primary-foreground font-mono text-xs flex items-center gap-1.5 hover:opacity-90">
                <Plus className="w-3 h-3" /> Log Service Event
              </button>
            </div>
          )}

          {addEventOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setAddEventOpen(false)}>
              <div className="surface border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="font-mono text-sm font-medium text-foreground">Log Maintenance Event</h2>
                  <button onClick={() => setAddEventOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await createMaintenanceEvent.mutateAsync({
                      organization_id: orgId,
                      drone_id: droneId,
                      event_type: eventForm.event_type,
                      description: eventForm.description,
                      performed_by: user?.id,
                      performed_at: eventForm.performed_at,
                      cost: eventForm.cost ? parseFloat(eventForm.cost) : null,
                      parts_replaced: eventForm.parts_replaced || null,
                      flight_hours_at_service: drone.flight_hours || 0,
                      notes: eventForm.notes || null,
                    });
                    toast.success("Maintenance event logged");
                    setAddEventOpen(false);
                    setEventForm({ event_type: "routine", description: "", performed_at: new Date().toISOString().split("T")[0], cost: "", parts_replaced: "", notes: "" });
                  } catch (err: any) { toast.error(err.message); }
                }} className="p-6 space-y-4">
                  <div>
                    <label className="stat-label block mb-1">Type</label>
                    <select value={eventForm.event_type} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })} className={inputCls}>
                      <option value="routine">Routine</option>
                      <option value="repair">Repair</option>
                      <option value="inspection">Inspection</option>
                      <option value="firmware_update">Firmware Update</option>
                      <option value="calibration">Calibration</option>
                      <option value="overhaul">Overhaul</option>
                    </select>
                  </div>
                  <div>
                    <label className="stat-label block mb-1">Description *</label>
                    <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className={`${inputCls} h-20 resize-none`} required placeholder="What was done" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="stat-label block mb-1">Date</label>
                      <input type="date" value={eventForm.performed_at} onChange={(e) => setEventForm({ ...eventForm, performed_at: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="stat-label block mb-1">Cost</label>
                      <input type="number" step="0.01" value={eventForm.cost} onChange={(e) => setEventForm({ ...eventForm, cost: e.target.value })} className={inputCls} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="stat-label block mb-1">Parts Replaced</label>
                    <input value={eventForm.parts_replaced} onChange={(e) => setEventForm({ ...eventForm, parts_replaced: e.target.value })} className={inputCls} placeholder="e.g. Propellers, ESC" />
                  </div>
                  <div>
                    <label className="stat-label block mb-1">Notes</label>
                    <textarea value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} className={`${inputCls} h-16 resize-none`} />
                  </div>
                  <button type="submit" disabled={createMaintenanceEvent.isPending} className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm hover:opacity-90 disabled:opacity-50">
                    {createMaintenanceEvent.isPending ? "Saving..." : "Log Event"}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="surface border border-border">
            <div className="px-6 py-4 border-b border-border">
              <p className="section-title mb-0">Service History</p>
            </div>
            {maintenanceEvents.length === 0 ? (
              <div className="p-6 text-center font-mono text-xs text-muted-foreground">No maintenance events recorded</div>
            ) : (
              <div className="divide-y divide-border">
                {maintenanceEvents.map((e: any) => (
                  <div key={e.id} className="px-6 py-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground">{e.event_type}</span>
                        <p className="text-sm text-foreground">{e.description}</p>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{e.performed_at}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground mt-1">
                      {e.profiles?.full_name && <span>By: {e.profiles.full_name}</span>}
                      {e.cost && <span>Cost: ${Number(e.cost).toFixed(2)}</span>}
                      {e.parts_replaced && <span>Parts: {e.parts_replaced}</span>}
                      {e.flight_hours_at_service != null && <span>@ {Number(e.flight_hours_at_service).toFixed(1)} hrs</span>}
                    </div>
                    {e.notes && <p className="font-mono text-[10px] text-muted-foreground mt-1">{e.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batteries Tab */}
      {activeTab === "batteries" && (
        <div className="space-y-6">
          {canManage && (
            <div className="flex justify-end">
              <button onClick={() => setAddBatteryOpen(true)} className="h-9 px-3 bg-primary text-primary-foreground font-mono text-xs flex items-center gap-1.5 hover:opacity-90">
                <Plus className="w-3 h-3" /> Add Battery
              </button>
            </div>
          )}

          {addBatteryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setAddBatteryOpen(false)}>
              <div className="surface border border-border w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="font-mono text-sm font-medium text-foreground">Add Battery</h2>
                  <button onClick={() => setAddBatteryOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await createBattery.mutateAsync({
                      organization_id: orgId,
                      drone_id: droneId,
                      name: batteryForm.name,
                      serial_number: batteryForm.serial_number || null,
                      type: batteryForm.type,
                      capacity_mah: batteryForm.capacity_mah ? parseInt(batteryForm.capacity_mah) : null,
                      notes: batteryForm.notes || null,
                    });
                    toast.success("Battery added");
                    setAddBatteryOpen(false);
                    setBatteryForm({ name: "", serial_number: "", type: "LiPo", capacity_mah: "", notes: "" });
                  } catch (err: any) { toast.error(err.message); }
                }} className="p-6 space-y-4">
                  <div>
                    <label className="stat-label block mb-1">Name *</label>
                    <input value={batteryForm.name} onChange={(e) => setBatteryForm({ ...batteryForm, name: e.target.value })} className={inputCls} required placeholder="Battery #1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="stat-label block mb-1">Type</label>
                      <select value={batteryForm.type} onChange={(e) => setBatteryForm({ ...batteryForm, type: e.target.value })} className={inputCls}>
                        <option value="LiPo">LiPo</option>
                        <option value="Li-Ion">Li-Ion</option>
                        <option value="LiHV">LiHV</option>
                        <option value="NiMH">NiMH</option>
                      </select>
                    </div>
                    <div>
                      <label className="stat-label block mb-1">Capacity (mAh)</label>
                      <input type="number" value={batteryForm.capacity_mah} onChange={(e) => setBatteryForm({ ...batteryForm, capacity_mah: e.target.value })} className={inputCls} placeholder="5000" />
                    </div>
                  </div>
                  <div>
                    <label className="stat-label block mb-1">Serial Number</label>
                    <input value={batteryForm.serial_number} onChange={(e) => setBatteryForm({ ...batteryForm, serial_number: e.target.value })} className={inputCls} placeholder="Optional" />
                  </div>
                  <button type="submit" disabled={createBattery.isPending} className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm hover:opacity-90 disabled:opacity-50">
                    {createBattery.isPending ? "Adding..." : "Add Battery"}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="surface border border-border">
            <div className="px-6 py-4 border-b border-border">
              <p className="section-title mb-0">Battery Inventory</p>
            </div>
            {batteries.length === 0 ? (
              <div className="p-6 text-center font-mono text-xs text-muted-foreground">No batteries registered for this drone</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left stat-label">Name</th>
                    <th className="px-6 py-3 text-left stat-label">Type</th>
                    <th className="px-6 py-3 text-left stat-label">Capacity</th>
                    <th className="px-6 py-3 text-left stat-label">Cycles</th>
                    <th className="px-6 py-3 text-left stat-label">Health</th>
                    <th className="px-6 py-3 text-left stat-label">Status</th>
                    {canManage && <th className="px-6 py-3 w-20" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {batteries.map((b: any) => (
                    <tr key={b.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-foreground">{b.name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{b.type}</td>
                      <td className="px-6 py-3 font-mono text-xs text-foreground">{b.capacity_mah ? `${b.capacity_mah}mAh` : "—"}</td>
                      <td className="px-6 py-3 font-mono text-xs text-foreground">{b.cycle_count}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-border">
                            <div className={`h-full ${b.health_percent >= 70 ? "bg-success" : b.health_percent >= 40 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${b.health_percent}%` }} />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">{b.health_percent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3"><span className={`font-mono text-[10px] px-1.5 py-0.5 ${statusColor(b.status)}`}>{b.status}</span></td>
                      {canManage && (
                        <td className="px-6 py-3">
                          <button
                            onClick={async () => {
                              await deleteBattery.mutateAsync(b.id);
                              toast.success("Battery removed");
                            }}
                            className="font-mono text-[10px] text-muted-foreground hover:text-destructive"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Inspection Tab */}
      {activeTab === "inspection" && <DroneInspectionTab droneId={droneId} />}

      {/* Flights Tab */}
      {activeTab === "flights" && (
        <div className="surface border border-border">
          <div className="px-6 py-4 border-b border-border">
            <p className="section-title mb-0">Flight History</p>
          </div>
          {flights.length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-muted-foreground">No flights recorded with this drone unit</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left stat-label">Flight</th>
                  <th className="px-6 py-3 text-left stat-label">Date</th>
                  <th className="px-6 py-3 text-left stat-label">Project</th>
                  <th className="px-6 py-3 text-left stat-label">Pilot</th>
                  <th className="px-6 py-3 text-left stat-label">Duration</th>
                  <th className="px-6 py-3 text-left stat-label">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flights.map((f: any) => (
                  <tr key={f.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-foreground">{f.title}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{f.flight_date}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{f.projects?.name || "—"}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{f.profiles?.full_name || "—"}</td>
                    <td className="px-6 py-3 font-mono text-xs text-foreground">{f.duration_minutes ? `${f.duration_minutes}m` : "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 ${f.outcome === "completed" ? "text-success bg-success/10" : f.outcome === "aborted" ? "text-destructive bg-destructive/10" : "text-warning bg-warning/10"}`}>
                        {f.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="surface border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="font-mono text-lg text-foreground">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}
