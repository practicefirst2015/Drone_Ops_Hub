import { forwardRef, lazy, Suspense } from "react";
import { ArrowLeft, Plus, X, Trash2, Pencil, Save, Clock, Activity, Wrench } from "lucide-react";

const DroneModelViewer = lazy(() => import("./DroneModelViewer"));
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModelPayloads, usePayloads, useDroneModels, useManufacturers } from "@/hooks/useDroneCatalog";
import { useOrgRole } from "@/hooks/useOrgRole";
import { getModelCapabilities, CapabilityBadges } from "@/components/drones/capabilityBadges";
import { useDroneModelStats } from "@/hooks/useUtilization";
import { useMaintenanceTracking } from "@/hooks/useMaintenanceTracking";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Props {
  modelId: string;
  onBack: () => void;
}

const DroneModelDetailInner = forwardRef<HTMLDivElement, Props>(function DroneModelDetail({ modelId, onBack }, ref) {
  const qc = useQueryClient();
  const { canManage, isAdmin } = useOrgRole();
  const { updateModel, deleteModel } = useDroneModels();
  const { confirm, ConfirmationDialog } = useConfirm();
  const { manufacturers: { data: manufacturers = [] } } = useManufacturers();
  const [editing, setEditing] = useState(false);

  const { data: model, isLoading } = useQuery({
    queryKey: ["drone_model", modelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_models")
        .select("*, drone_manufacturers(id, name, country, website)")
        .eq("id", modelId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { modelPayloads, addPayload, removePayload } = useModelPayloads(modelId);
  const { payloads: { data: allPayloads = [] } } = usePayloads();
  const { stats: droneStats } = useDroneModelStats(modelId);
  const { statuses: maintStatuses } = useMaintenanceTracking();
  // Find fleet drones linked to this model that have maintenance tracking
  const linkedMaintenance = maintStatuses.filter(s => {
    // We need to check if any fleet drone is linked to this model
    return (s.intervalHours || s.intervalMissions) && s.status !== "ok";
  });
  const [addingPayload, setAddingPayload] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState("");

  // Edit form state
  const [form, setForm] = useState<Record<string, any>>({});

  const startEdit = () => {
    if (!model) return;
    setForm({
      name: model.name, category: model.category, manufacturer_id: model.manufacturer_id, notes: model.notes || "",
      max_flight_time_min: model.max_flight_time_min ?? "", max_range_km: model.max_range_km ?? "",
      max_speed_ms: model.max_speed_ms ?? "", max_altitude_m: model.max_altitude_m ?? "",
      max_wind_resistance_ms: model.max_wind_resistance_ms ?? "", weight_kg: model.weight_kg ?? "",
      max_payload_kg: model.max_payload_kg ?? "", dimensions: model.dimensions || "",
      folded_dimensions: model.folded_dimensions || "", propeller_count: model.propeller_count ?? "",
      motor_type: model.motor_type || "", gps_type: model.gps_type || "",
      obstacle_avoidance: model.obstacle_avoidance || "", positioning_accuracy: model.positioning_accuracy || "",
      has_built_in_camera: model.has_built_in_camera ?? false, camera_sensor: model.camera_sensor || "",
      camera_resolution: model.camera_resolution || "", video_resolution: model.video_resolution || "",
      gimbal_stabilization: model.gimbal_stabilization || "", ip_rating: model.ip_rating || "",
      operating_temp_range: model.operating_temp_range || "", noise_level_db: model.noise_level_db ?? "",
      faa_category: model.faa_category || "", remote_id_capable: model.remote_id_capable ?? true,
      image_url: model.image_url || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    const payload: Record<string, any> = { name: form.name, category: form.category, manufacturer_id: form.manufacturer_id, notes: form.notes || null };
    const numFields = ["max_flight_time_min", "max_altitude_m", "propeller_count"];
    const floatFields = ["max_range_km", "max_speed_ms", "max_wind_resistance_ms", "weight_kg", "max_payload_kg", "noise_level_db"];
    const strFields = ["dimensions", "folded_dimensions", "motor_type", "gps_type", "obstacle_avoidance", "positioning_accuracy", "camera_sensor", "camera_resolution", "video_resolution", "gimbal_stabilization", "ip_rating", "operating_temp_range", "faa_category", "image_url"];
    numFields.forEach(f => { payload[f] = form[f] !== "" ? parseInt(form[f]) : null; });
    floatFields.forEach(f => { payload[f] = form[f] !== "" ? parseFloat(form[f]) : null; });
    strFields.forEach(f => { payload[f] = form[f] || null; });
    payload.has_built_in_camera = form.has_built_in_camera;
    payload.remote_id_capable = form.remote_id_capable;

    try {
      await updateModel.mutateAsync({ id: modelId, ...payload });
      qc.invalidateQueries({ queryKey: ["drone_model", modelId] });
      setEditing(false);
      toast.success("Model updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = () => {
    confirm({
      title: "Delete Drone Model",
      description: "This will permanently delete this drone model and all its payload associations. This cannot be undone.",
      confirmLabel: "Delete Model",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteModel.mutateAsync(modelId);
          toast.success("Model deleted");
          onBack();
        } catch (err: any) {
          toast.error(err.message);
        }
      },
    });
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center min-h-[50vh]"><div className="w-2 h-2 bg-primary animate-pulse-glow" /></div>;
  }

  if (!model) {
    return <div className="p-8"><p className="font-mono text-sm text-muted-foreground">Model not found.</p></div>;
  }

  const assignedPayloadIds = (modelPayloads.data || []).map((p: any) => p.payload_id);
  const availablePayloads = allPayloads.filter((p: any) => !assignedPayloadIds.includes(p.id));

  const inputCls = "w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary";

  const specs = [
    { section: "Flight Performance", items: [
      { label: "Max Flight Time", value: model.max_flight_time_min ? `${model.max_flight_time_min} min` : null },
      { label: "Max Range", value: model.max_range_km ? `${model.max_range_km} km` : null },
      { label: "Max Speed", value: model.max_speed_ms ? `${model.max_speed_ms} m/s` : null },
      { label: "Max Altitude", value: model.max_altitude_m ? `${model.max_altitude_m} m` : null },
      { label: "Wind Resistance", value: model.max_wind_resistance_ms ? `${model.max_wind_resistance_ms} m/s` : null },
    ]},
    { section: "Physical", items: [
      { label: "Weight", value: model.weight_kg ? `${model.weight_kg} kg` : null },
      { label: "Max Payload", value: model.max_payload_kg ? `${model.max_payload_kg} kg` : null },
      { label: "Dimensions", value: model.dimensions },
      { label: "Folded", value: model.folded_dimensions },
      { label: "Propellers", value: model.propeller_count?.toString() },
      { label: "Motor Type", value: model.motor_type },
    ]},
    { section: "Navigation & Sensors", items: [
      { label: "GPS", value: model.gps_type },
      { label: "Obstacle Avoidance", value: model.obstacle_avoidance },
      { label: "Positioning Accuracy", value: model.positioning_accuracy },
    ]},
    { section: "Imaging", items: [
      { label: "Built-in Camera", value: model.has_built_in_camera ? "Yes" : "No" },
      { label: "Sensor", value: model.camera_sensor },
      { label: "Photo Resolution", value: model.camera_resolution },
      { label: "Video Resolution", value: model.video_resolution },
      { label: "Gimbal", value: model.gimbal_stabilization },
    ]},
    { section: "Operations", items: [
      { label: "IP Rating", value: model.ip_rating },
      { label: "Temp Range", value: model.operating_temp_range },
      { label: "Noise Level", value: model.noise_level_db ? `${model.noise_level_db} dB` : null },
      { label: "FAA Category", value: model.faa_category },
      { label: "Remote ID", value: model.remote_id_capable ? "Yes" : "No" },
    ]},
  ];

  return (
    <div className="p-8">
      <button onClick={onBack} className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors mb-6">
        <ArrowLeft className="w-3 h-3" /> Back to Catalog
      </button>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              {(model as any).drone_manufacturers?.name}
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground">{model.category}</span>
            {(model as any).drone_manufacturers?.country && (
              <span className="font-mono text-[10px] text-muted-foreground">· {(model as any).drone_manufacturers.country}</span>
            )}
          </div>
          <h1 className="page-title">{model.name}</h1>
          {model.notes && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{model.notes}</p>}
          {/* Capability Badges */}
          {(() => {
            const caps = getModelCapabilities(model, modelPayloads.data || []);
            return caps.length > 0 ? <div className="mt-3"><CapabilityBadges capabilities={caps} /></div> : null;
          })()}
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button onClick={startEdit}
              className="h-9 px-4 border border-border text-muted-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:text-foreground hover:border-foreground transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {isAdmin && (
              <button onClick={handleDelete}
                className="h-9 px-4 border border-destructive text-destructive font-mono text-xs tracking-wide flex items-center gap-1.5 hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 overflow-y-auto py-8">
          <div className="surface border border-border w-full max-w-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-mono text-sm font-medium text-foreground">Edit Drone Model</h2>
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="stat-label block mb-1">Manufacturer *</label>
                  <select value={form.manufacturer_id} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value })} className={inputCls}>
                    {manufacturers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="stat-label block mb-1">Model Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="stat-label block mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                    <option value="multirotor">Multirotor</option>
                    <option value="fixed_wing">Fixed Wing</option>
                    <option value="vtol">VTOL</option>
                    <option value="helicopter">Helicopter</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="stat-label block mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="stat-label block mb-1">3D Model / Image URL</label>
                <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://example.com/model.glb or image URL"
                  className={inputCls} />
                <p className="font-mono text-[9px] text-muted-foreground mt-1">
                  Paste a .glb/.gltf URL for 3D preview, or a regular image URL
                </p>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { key: "max_flight_time_min", label: "Flight Time (min)" },
                  { key: "max_range_km", label: "Range (km)" },
                  { key: "max_speed_ms", label: "Speed (m/s)" },
                  { key: "max_altitude_m", label: "Alt (m)" },
                  { key: "max_wind_resistance_ms", label: "Wind (m/s)" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="stat-label block mb-1">{f.label}</label>
                    <input type="number" step="any" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { key: "weight_kg", label: "Weight (kg)" },
                  { key: "max_payload_kg", label: "Payload (kg)" },
                  { key: "dimensions", label: "Dimensions" },
                  { key: "propeller_count", label: "Propellers" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="stat-label block mb-1">{f.label}</label>
                    <input type={f.key === "dimensions" ? "text" : "number"} step="any" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "gps_type", label: "GPS Type" },
                  { key: "obstacle_avoidance", label: "Obstacle Avoidance" },
                  { key: "ip_rating", label: "IP Rating" },
                  { key: "faa_category", label: "FAA Category" },
                  { key: "camera_resolution", label: "Photo Res" },
                  { key: "video_resolution", label: "Video Res" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="stat-label block mb-1">{f.label}</label>
                    <input type="text" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_built_in_camera} onChange={(e) => setForm({ ...form, has_built_in_camera: e.target.checked })}
                    className="accent-[hsl(var(--primary))]" />
                  <span className="font-mono text-xs text-foreground">Built-in Camera</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.remote_id_capable} onChange={(e) => setForm({ ...form, remote_id_capable: e.target.checked })}
                    className="accent-[hsl(var(--primary))]" />
                  <span className="font-mono text-xs text-foreground">Remote ID</span>
                </label>
              </div>
              <button onClick={saveEdit} disabled={updateModel.isPending}
                className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-3.5 h-3.5" /> {updateModel.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Viewer - only when a .glb/.gltf URL exists */}
      {model.image_url && /\.gl(b|tf)$/i.test(model.image_url) && (
        <div className="mb-8">
          <p className="section-title mb-3">3D Preview</p>
          <Suspense fallback={
            <div className="surface border border-border h-64 flex items-center justify-center text-muted-foreground font-mono text-xs">
              Loading viewer…
            </div>
          }>
            <DroneModelViewer modelUrl={model.image_url} modelName={model.name} />
          </Suspense>
        </div>
      )}

      {/* Flight Utilization */}
      {droneStats && (
        <div className="mb-8">
          <p className="section-title mb-3">Flight Utilization</p>
          <div className="surface border border-border">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-border">
              <div className="p-4">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Total Flights</p>
                <p className="font-mono text-sm text-foreground">{droneStats.totalFlights}</p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Flight Hours</p>
                <p className="font-mono text-sm text-foreground">{droneStats.totalFlightHours.toFixed(1)}h</p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Missions</p>
                <p className="font-mono text-sm text-foreground">{droneStats.missionsFlown}</p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
                <p className="font-mono text-sm text-success">{droneStats.completedFlights}</p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[9px] text-primary uppercase tracking-wider mb-1">30d Flights</p>
                <p className="font-mono text-sm text-primary">{droneStats.last30DaysFlights}</p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[9px] text-primary uppercase tracking-wider mb-1">30d Hours</p>
                <p className="font-mono text-sm text-primary">{droneStats.last30DaysHours.toFixed(1)}h</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spec Grid */}
      <div className="space-y-6 mb-8">
        {specs.map((section) => {
          const validItems = section.items.filter((i) => i.value);
          if (validItems.length === 0) return null;
          return (
            <div key={section.section}>
              <p className="section-title mb-3">{section.section}</p>
              <div className="surface border border-border">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-border">
                  {validItems.map((item) => (
                    <div key={item.label} className="p-4">
                      <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="font-mono text-sm text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compatible Payloads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="section-title mb-0">Compatible Payloads</p>
          {canManage && (
            <button
              onClick={() => setAddingPayload(true)}
              className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90"
            >
              <Plus className="w-3 h-3" /> Add Payload
            </button>
          )}
        </div>

        {addingPayload && (
          <div className="surface border border-border p-4 mb-4 flex items-center gap-3">
            <select
              value={selectedPayload}
              onChange={(e) => setSelectedPayload(e.target.value)}
              className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Select payload...</option>
              {availablePayloads.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.type}{p.weight_kg ? ` · ${p.weight_kg}kg` : ""})</option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (selectedPayload) {
                  await addPayload.mutateAsync({ model_id: modelId, payload_id: selectedPayload });
                  setSelectedPayload("");
                  setAddingPayload(false);
                }
              }}
              className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-90"
            >Add</button>
            <button onClick={() => setAddingPayload(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="surface border border-border divide-y divide-border">
          {(modelPayloads.data || []).length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-muted-foreground">No compatible payloads defined yet.</div>
          ) : (
            (modelPayloads.data || []).map((mp: any) => (
              <div key={mp.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">{mp.drone_payloads?.name}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground">{mp.drone_payloads?.type}</span>
                  {mp.drone_payloads?.weight_kg && (
                    <span className="font-mono text-xs text-muted-foreground">{mp.drone_payloads.weight_kg} kg</span>
                  )}
                </div>
                {canManage && (
                  <button onClick={() => removePayload.mutate(mp.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmationDialog />
    </div>
  );
});

export const DroneModelDetail = DroneModelDetailInner;