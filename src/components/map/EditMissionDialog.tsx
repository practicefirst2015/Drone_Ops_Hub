import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MissionMapItem } from "./mapTypes";
import { MISSION_STATUS_OPTIONS } from "./mapConstants";
import { AddressSearch } from "./AddressSearch";

type Props = {
  mission: MissionMapItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const EditMissionDialog = ({ mission, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    status: "draft",
    objective: "",
    mission_date: "",
    launch_location: "",
    target_area: "",
    latitude: "",
    longitude: "",
    planned_flight_zone: "",
    altitude_notes: "",
    flight_duration_estimate_min: "",
    risk_notes: "",
    weather_notes: "",
    airspace_notes: "",
    readiness_notes: "",
    go_status: "pending",
    preflight_status: "not_started",
    postflight_notes: "",
  });

  useEffect(() => {
    if (open && mission) {
      setErrors({});
      setForm({
        title: mission.title || "",
        status: mission.status || "draft",
        objective: mission.objective || "",
        mission_date: mission.mission_date || "",
        launch_location: mission.launch_location || "",
        target_area: mission.target_area || "",
        latitude: mission.latitude?.toString() || "",
        longitude: mission.longitude?.toString() || "",
        planned_flight_zone: mission.planned_flight_zone || "",
        altitude_notes: mission.altitude_notes || "",
        flight_duration_estimate_min: mission.flight_duration_estimate_min?.toString() || "",
        risk_notes: mission.risk_notes || "",
        weather_notes: mission.weather_notes || "",
        airspace_notes: mission.airspace_notes || "",
        readiness_notes: mission.readiness_notes || "",
        go_status: mission.go_status || "pending",
        preflight_status: mission.preflight_status || "not_started",
        postflight_notes: mission.postflight_notes || "",
      });
    }
  }, [open, mission]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = "Mission title is required";
    }

    const hasLat = form.latitude.trim() !== "";
    const hasLng = form.longitude.trim() !== "";
    if (hasLat !== hasLng) {
      newErrors.latitude = "Both latitude and longitude are required";
      newErrors.longitude = "Both latitude and longitude are required";
    }

    if (hasLat) {
      const latVal = parseFloat(form.latitude);
      if (isNaN(latVal) || latVal < -90 || latVal > 90) {
        newErrors.latitude = "Must be between -90 and 90";
      }
    }
    if (hasLng) {
      const lngVal = parseFloat(form.longitude);
      if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
        newErrors.longitude = "Must be between -180 and 180";
      }
    }

    if (form.flight_duration_estimate_min) {
      const dur = parseInt(form.flight_duration_estimate_min);
      if (isNaN(dur) || dur < 1 || dur > 480) {
        newErrors.flight_duration_estimate_min = "Must be 1–480 minutes";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!mission) return;
    if (!validate()) return;

    const latVal = form.latitude ? parseFloat(form.latitude) : null;
    const lngVal = form.longitude ? parseFloat(form.longitude) : null;

    setSaving(true);
    const { error } = await supabase.from("missions").update({
      title: form.title.trim(),
      status: form.status as any,
      objective: form.objective || null,
      mission_date: form.mission_date || null,
      launch_location: form.launch_location || null,
      target_area: form.target_area || null,
      latitude: latVal,
      longitude: lngVal,
      planned_flight_zone: form.planned_flight_zone || null,
      altitude_notes: form.altitude_notes || null,
      flight_duration_estimate_min: form.flight_duration_estimate_min ? parseInt(form.flight_duration_estimate_min) : null,
      risk_notes: form.risk_notes || null,
      weather_notes: form.weather_notes || null,
      airspace_notes: form.airspace_notes || null,
      readiness_notes: form.readiness_notes || null,
      go_status: form.go_status as any,
      preflight_status: form.preflight_status as any,
      postflight_notes: form.postflight_notes || null,
    }).eq("id", mission.id);

    setSaving(false);
    if (error) { toast.error("Failed to update mission"); return; }
    toast.success("Mission updated");
    // Invalidate all mission-related queries
    qc.invalidateQueries({ queryKey: ["map_missions"] });
    qc.invalidateQueries({ queryKey: ["missions"] });
    qc.invalidateQueries({ queryKey: ["mission", mission.id] });
    qc.invalidateQueries({ queryKey: ["upcoming_missions"] });
    qc.invalidateQueries({ queryKey: ["mission_readiness_project"] });
    qc.invalidateQueries({ queryKey: ["preflight_checklist", mission.id] });
    qc.invalidateQueries({ queryKey: ["batch_mission_readiness_missions"] });
    onOpenChange(false);
  };

  const ic = "h-8 text-xs font-mono bg-background border-border";
  const tac = "h-16 text-xs font-mono bg-background border-border resize-none";

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const fieldError = (key: string) =>
    errors[key] ? <p className="font-mono text-[10px] text-destructive mt-0.5">{errors[key]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wide">Edit Mission Plan</DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {mission?.projects?.name} · {mission?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="stat-label block mb-1.5">Mission Title <span className="text-destructive">*</span></label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} className={`${ic} ${errors.title ? "border-destructive" : ""}`} />
            {fieldError("title")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value)} className={`w-full ${ic} px-2 border rounded-md`}>
                {MISSION_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1.5">Mission Date</label>
              <Input type="date" value={form.mission_date} onChange={(e) => update("mission_date", e.target.value)} className={ic} />
            </div>
          </div>

          <div>
            <label className="stat-label block mb-1.5">Objective</label>
            <textarea value={form.objective} onChange={(e) => update("objective", e.target.value)} className={`w-full ${tac} p-2 border rounded-md`} placeholder="Mission objective..." />
          </div>

          <AddressSearch
            onSelect={(r) => {
              update("latitude", r.lat.toFixed(6));
              update("longitude", r.lon.toFixed(6));
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1.5">Latitude</label>
              <Input type="number" step="any" value={form.latitude} onChange={(e) => update("latitude", e.target.value)} placeholder="33.9534" className={`${ic} ${errors.latitude ? "border-destructive" : ""}`} />
              {fieldError("latitude")}
            </div>
            <div>
              <label className="stat-label block mb-1.5">Longitude</label>
              <Input type="number" step="any" value={form.longitude} onChange={(e) => update("longitude", e.target.value)} placeholder="-117.3962" className={`${ic} ${errors.longitude ? "border-destructive" : ""}`} />
              {fieldError("longitude")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1.5">Launch Location</label>
              <Input value={form.launch_location} onChange={(e) => update("launch_location", e.target.value)} placeholder="NW corner of site" className={ic} />
            </div>
            <div>
              <label className="stat-label block mb-1.5">Target Area</label>
              <Input value={form.target_area} onChange={(e) => update("target_area", e.target.value)} placeholder="Solar panel array B" className={ic} />
            </div>
          </div>

          <div>
            <label className="stat-label block mb-1.5">Planned Flight Zone</label>
            <Input value={form.planned_flight_zone} onChange={(e) => update("planned_flight_zone", e.target.value)} placeholder="200m radius from launch" className={ic} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1.5">Altitude Notes</label>
              <Input value={form.altitude_notes} onChange={(e) => update("altitude_notes", e.target.value)} placeholder="120m AGL" className={ic} />
            </div>
            <div>
              <label className="stat-label block mb-1.5">Duration (min)</label>
              <Input type="number" min="1" max="480" value={form.flight_duration_estimate_min} onChange={(e) => update("flight_duration_estimate_min", e.target.value)} placeholder="25" className={`${ic} ${errors.flight_duration_estimate_min ? "border-destructive" : ""}`} />
              {fieldError("flight_duration_estimate_min")}
            </div>
          </div>

          <div>
            <label className="stat-label block mb-1.5">Risk Notes</label>
            <textarea value={form.risk_notes} onChange={(e) => update("risk_notes", e.target.value)} className={`w-full ${tac} p-2 border rounded-md`} placeholder="Power lines on east boundary..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1.5">Weather Notes</label>
              <Input value={form.weather_notes} onChange={(e) => update("weather_notes", e.target.value)} placeholder="Check wind forecast" className={ic} />
            </div>
            <div>
              <label className="stat-label block mb-1.5">Airspace Notes</label>
              <Input value={form.airspace_notes} onChange={(e) => update("airspace_notes", e.target.value)} placeholder="Class G uncontrolled" className={ic} />
            </div>
          </div>

          <div>
            <label className="stat-label block mb-1.5">Readiness Notes</label>
            <textarea value={form.readiness_notes} onChange={(e) => update("readiness_notes", e.target.value)} className={`w-full ${tac} p-2 border rounded-md`} placeholder="All equipment staged..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1.5">Go/No-Go</label>
              <select value={form.go_status} onChange={(e) => update("go_status", e.target.value)} className={`w-full ${ic} px-2 border rounded-md`}>
                <option value="pending">Pending</option>
                <option value="go">GO</option>
                <option value="no_go">NO-GO</option>
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1.5">Preflight Check</label>
              <select value={form.preflight_status} onChange={(e) => update("preflight_status", e.target.value)} className={`w-full ${ic} px-2 border rounded-md`}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="stat-label block mb-1.5">Postflight Notes</label>
            <textarea value={form.postflight_notes} onChange={(e) => update("postflight_notes", e.target.value)} className={`w-full ${tac} p-2 border rounded-md`} placeholder="Mission debrief..." />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-8 font-mono text-xs">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-8 font-mono text-xs">{saving ? "Saving…" : "Save Mission"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
