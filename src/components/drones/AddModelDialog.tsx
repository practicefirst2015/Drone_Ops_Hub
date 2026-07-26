import { useState, useEffect } from "react";
import { useDroneModels, useManufacturers } from "@/hooks/useDroneCatalog";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddModelDialog({ open, onOpenChange }: Props) {
  const { createModel } = useDroneModels();
  const { manufacturers: { data: manufacturers = [] } } = useManufacturers();
  const [form, setForm] = useState({
    manufacturer_id: "",
    name: "",
    category: "multirotor",
    max_flight_time_min: "",
    max_range_km: "",
    max_speed_ms: "",
    max_altitude_m: "",
    max_wind_resistance_ms: "",
    weight_kg: "",
    max_payload_kg: "",
    dimensions: "",
    propeller_count: "",
    gps_type: "",
    obstacle_avoidance: "",
    has_built_in_camera: false,
    camera_sensor: "",
    camera_resolution: "",
    video_resolution: "",
    ip_rating: "",
    operating_temp_range: "",
    faa_category: "",
    remote_id_capable: true,
  });

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  const set = (key: string, value: any) => setForm({ ...form, [key]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = {
      manufacturer_id: form.manufacturer_id,
      name: form.name,
      category: form.category,
      has_built_in_camera: form.has_built_in_camera,
      remote_id_capable: form.remote_id_capable,
    };
    // Only include numeric fields if they have values
    if (form.max_flight_time_min) payload.max_flight_time_min = parseInt(form.max_flight_time_min);
    if (form.max_range_km) payload.max_range_km = parseFloat(form.max_range_km);
    if (form.max_speed_ms) payload.max_speed_ms = parseFloat(form.max_speed_ms);
    if (form.max_altitude_m) payload.max_altitude_m = parseInt(form.max_altitude_m);
    if (form.max_wind_resistance_ms) payload.max_wind_resistance_ms = parseFloat(form.max_wind_resistance_ms);
    if (form.weight_kg) payload.weight_kg = parseFloat(form.weight_kg);
    if (form.max_payload_kg) payload.max_payload_kg = parseFloat(form.max_payload_kg);
    if (form.propeller_count) payload.propeller_count = parseInt(form.propeller_count);
    // String fields
    const strFields = ["dimensions", "gps_type", "obstacle_avoidance", "camera_sensor", "camera_resolution", "video_resolution", "ip_rating", "operating_temp_range", "faa_category"];
    strFields.forEach((f) => { if ((form as any)[f]) payload[f] = (form as any)[f]; });

    await createModel.mutateAsync(payload);
    onOpenChange(false);
  };

  const inputCls = "w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 overflow-y-auto py-8" onClick={() => onOpenChange(false)}>
      <div className="surface border border-border w-full max-w-2xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-medium text-foreground">Add Drone Model</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div>
            <p className="section-title mb-3">Identification</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="stat-label block mb-1">Manufacturer *</label>
                <select value={form.manufacturer_id} onChange={(e) => set("manufacturer_id", e.target.value)} required className={inputCls}>
                  <option value="">Select...</option>
                  {manufacturers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1">Model Name *</label>
                <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required className={inputCls} placeholder="Matrice 300 RTK" />
              </div>
              <div>
                <label className="stat-label block mb-1">Category</label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                  <option value="multirotor">Multirotor</option>
                  <option value="fixed_wing">Fixed Wing</option>
                  <option value="vtol">VTOL</option>
                  <option value="helicopter">Helicopter</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Flight Specs */}
          <div>
            <p className="section-title mb-3">Flight Specifications</p>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="stat-label block mb-1">Flight Time (min)</label>
                <input type="number" value={form.max_flight_time_min} onChange={(e) => set("max_flight_time_min", e.target.value)} className={inputCls} placeholder="55" />
              </div>
              <div>
                <label className="stat-label block mb-1">Range (km)</label>
                <input type="number" step="0.1" value={form.max_range_km} onChange={(e) => set("max_range_km", e.target.value)} className={inputCls} placeholder="15" />
              </div>
              <div>
                <label className="stat-label block mb-1">Max Speed (m/s)</label>
                <input type="number" step="0.1" value={form.max_speed_ms} onChange={(e) => set("max_speed_ms", e.target.value)} className={inputCls} placeholder="23" />
              </div>
              <div>
                <label className="stat-label block mb-1">Max Alt (m)</label>
                <input type="number" value={form.max_altitude_m} onChange={(e) => set("max_altitude_m", e.target.value)} className={inputCls} placeholder="7000" />
              </div>
              <div>
                <label className="stat-label block mb-1">Wind Resist (m/s)</label>
                <input type="number" step="0.1" value={form.max_wind_resistance_ms} onChange={(e) => set("max_wind_resistance_ms", e.target.value)} className={inputCls} placeholder="15" />
              </div>
            </div>
          </div>

          {/* Physical */}
          <div>
            <p className="section-title mb-3">Physical Specifications</p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="stat-label block mb-1">Weight (kg)</label>
                <input type="number" step="0.001" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} className={inputCls} placeholder="6.3" />
              </div>
              <div>
                <label className="stat-label block mb-1">Max Payload (kg)</label>
                <input type="number" step="0.001" value={form.max_payload_kg} onChange={(e) => set("max_payload_kg", e.target.value)} className={inputCls} placeholder="2.7" />
              </div>
              <div>
                <label className="stat-label block mb-1">Dimensions</label>
                <input type="text" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} className={inputCls} placeholder="810×670×430mm" />
              </div>
              <div>
                <label className="stat-label block mb-1">Propellers</label>
                <input type="number" value={form.propeller_count} onChange={(e) => set("propeller_count", e.target.value)} className={inputCls} placeholder="4" />
              </div>
            </div>
          </div>

          {/* Sensors */}
          <div>
            <p className="section-title mb-3">Navigation & Imaging</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="stat-label block mb-1">GPS Type</label>
                <input type="text" value={form.gps_type} onChange={(e) => set("gps_type", e.target.value)} className={inputCls} placeholder="RTK GPS" />
              </div>
              <div>
                <label className="stat-label block mb-1">Obstacle Avoidance</label>
                <input type="text" value={form.obstacle_avoidance} onChange={(e) => set("obstacle_avoidance", e.target.value)} className={inputCls} placeholder="6-directional" />
              </div>
              <div>
                <label className="stat-label block mb-1">Camera Sensor</label>
                <input type="text" value={form.camera_sensor} onChange={(e) => set("camera_sensor", e.target.value)} className={inputCls} placeholder="1/2 inch CMOS" />
              </div>
              <div>
                <label className="stat-label block mb-1">Photo Resolution</label>
                <input type="text" value={form.camera_resolution} onChange={(e) => set("camera_resolution", e.target.value)} className={inputCls} placeholder="48MP" />
              </div>
              <div>
                <label className="stat-label block mb-1">Video Resolution</label>
                <input type="text" value={form.video_resolution} onChange={(e) => set("video_resolution", e.target.value)} className={inputCls} placeholder="4K/60fps" />
              </div>
              <div className="flex items-end pb-1 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_built_in_camera} onChange={(e) => set("has_built_in_camera", e.target.checked)}
                    className="accent-[hsl(180,100%,50%)]" />
                  <span className="font-mono text-xs text-foreground">Built-in Camera</span>
                </label>
              </div>
            </div>
          </div>

          {/* Operations */}
          <div>
            <p className="section-title mb-3">Operations & Compliance</p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="stat-label block mb-1">IP Rating</label>
                <input type="text" value={form.ip_rating} onChange={(e) => set("ip_rating", e.target.value)} className={inputCls} placeholder="IP45" />
              </div>
              <div>
                <label className="stat-label block mb-1">Temp Range</label>
                <input type="text" value={form.operating_temp_range} onChange={(e) => set("operating_temp_range", e.target.value)} className={inputCls} placeholder="-20°C to 50°C" />
              </div>
              <div>
                <label className="stat-label block mb-1">FAA Category</label>
                <input type="text" value={form.faa_category} onChange={(e) => set("faa_category", e.target.value)} className={inputCls} placeholder="Category 2" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.remote_id_capable} onChange={(e) => set("remote_id_capable", e.target.checked)}
                    className="accent-[hsl(180,100%,50%)]" />
                  <span className="font-mono text-xs text-foreground">Remote ID</span>
                </label>
              </div>
            </div>
          </div>

          <button type="submit" disabled={createModel.isPending}
            className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
            {createModel.isPending ? "Adding..." : "Add Model"}
          </button>
        </form>
      </div>
    </div>
  );
}
