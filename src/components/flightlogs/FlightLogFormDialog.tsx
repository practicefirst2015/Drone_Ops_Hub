import { useState, useEffect, useMemo } from "react";
import { Plus, X, Clock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateFlightLog, useUpdateFlightLog } from "@/hooks/useFlightLogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FlightLogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Record<string, any> | null;
  prefillMissionId?: string;
  prefillProjectId?: string;
}

const OUTCOMES = [
  { value: "completed", label: "Completed" },
  { value: "partial", label: "Partial" },
  { value: "aborted", label: "Aborted" },
  { value: "cancelled", label: "Cancelled" },
];

const EMPTY_FORM = {
  title: "",
  flight_date: new Date().toISOString().split("T")[0],
  project_id: "",
  mission_id: "",
  drone_model_id: "",
  pilot_id: "",
  outcome: "completed",
  duration_minutes: "",
  launch_location: "",
  launch_time: "",
  landing_time: "",
  objective: "",
  weather_summary: "",
  airspace_notes: "",
  incidents: "",
  postflight_notes: "",
  battery_equipment_notes: "",
  deliverables_summary: "",
  flight_area_summary: "",
  flight_hours_contribution: "",
  drone_utilization_contribution: "",
  preflight_completed: false,
};

export function FlightLogFormDialog({ open, onOpenChange, editData, prefillMissionId, prefillProjectId }: FlightLogFormDialogProps) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const createLog = useCreateFlightLog();
  const updateLog = useUpdateFlightLog();
  const isEdit = !!editData;

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [projectId, setProjectId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missionPrefilled, setMissionPrefilled] = useState(false);

  // Queries
  const { data: projects = [] } = useQuery({
    queryKey: ["projects_list", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", currentOrg!.id).order("name");
      return data ?? [];
    },
    enabled: !!currentOrg?.id && open,
  });

  const { data: missions = [] } = useQuery({
    queryKey: ["missions_for_project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("id, title, objective, launch_location, weather_notes, airspace_notes, planned_flight_zone, mission_date, flight_duration_estimate_min").eq("project_id", projectId).order("title");
      return data ?? [];
    },
    enabled: !!projectId && open,
  });

  const { data: droneModels = [] } = useQuery({
    queryKey: ["drone_models_list", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase.from("drone_models").select("id, name, drone_manufacturers(name)").eq("organization_id", currentOrg!.id).order("name");
      return data ?? [];
    },
    enabled: !!currentOrg?.id && open,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["org_members", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase.from("memberships").select("user_id, profiles:user_id(id, full_name)").eq("organization_id", currentOrg!.id);
      return data ?? [];
    },
    enabled: !!currentOrg?.id && open,
  });

  // Load mission drone models for prefill
  const { data: missionDrones = [] } = useQuery({
    queryKey: ["mission_drones_for_prefill", form.mission_id],
    queryFn: async () => {
      const { data } = await supabase.from("mission_drone_models").select("drone_model_id").eq("mission_id", form.mission_id);
      return data ?? [];
    },
    enabled: !!form.mission_id && open,
  });

  // Load mission operators for prefill
  const { data: missionOperators = [] } = useQuery({
    queryKey: ["mission_operators_for_prefill", form.mission_id],
    queryFn: async () => {
      const { data } = await supabase.from("mission_operators").select("user_id, role").eq("mission_id", form.mission_id);
      return data ?? [];
    },
    enabled: !!form.mission_id && open,
  });

  // Initialize form with edit data
  useEffect(() => {
    if (open) setErrors({});
    if (open && editData) {
      setForm({
        title: editData.title || "",
        flight_date: editData.flight_date || EMPTY_FORM.flight_date,
        project_id: editData.project_id || "",
        mission_id: editData.mission_id || "",
        drone_model_id: editData.drone_model_id || "",
        pilot_id: editData.pilot_id || "",
        outcome: editData.outcome || "completed",
        duration_minutes: editData.duration_minutes?.toString() || "",
        launch_location: editData.launch_location || "",
        launch_time: editData.launch_time ? editData.launch_time.slice(0, 16) : "",
        landing_time: editData.landing_time ? editData.landing_time.slice(0, 16) : "",
        objective: editData.objective || "",
        weather_summary: editData.weather_summary || "",
        airspace_notes: editData.airspace_notes || "",
        incidents: editData.incidents || "",
        postflight_notes: editData.postflight_notes || "",
        battery_equipment_notes: editData.battery_equipment_notes || "",
        deliverables_summary: editData.deliverables_summary || "",
        flight_area_summary: editData.flight_area_summary || "",
        flight_hours_contribution: editData.flight_hours_contribution?.toString() || "",
        drone_utilization_contribution: editData.drone_utilization_contribution?.toString() || "",
        preflight_completed: editData.preflight_completed || false,
      });
      setProjectId(editData.project_id || "");
      setMissionPrefilled(false);
    } else if (open && !editData) {
      const initProjectId = prefillProjectId || "";
      setForm({ ...EMPTY_FORM, project_id: initProjectId });
      setProjectId(initProjectId);
      setMissionPrefilled(false);
    }
  }, [open, editData]);

  // Handle prefillMissionId - load mission details and populate
  useEffect(() => {
    if (open && prefillMissionId && !isEdit && missions.length > 0) {
      const mission = missions.find((m: any) => m.id === prefillMissionId);
      if (mission && !missionPrefilled) {
        applyMissionPrefill(mission);
        setMissionPrefilled(true);
      }
    }
  }, [open, prefillMissionId, missions, isEdit, missionPrefilled]);

  // Auto-calculate duration from launch/landing times
  const calculatedDuration = useMemo(() => {
    if (form.launch_time && form.landing_time) {
      const launch = new Date(form.launch_time).getTime();
      const landing = new Date(form.landing_time).getTime();
      if (landing > launch) {
        return Math.round((landing - launch) / 60000);
      }
    }
    return null;
  }, [form.launch_time, form.landing_time]);

  // Sync calculated duration to form
  useEffect(() => {
    if (calculatedDuration !== null) {
      setForm(prev => ({
        ...prev,
        duration_minutes: calculatedDuration.toString(),
        flight_hours_contribution: (calculatedDuration / 60).toFixed(2),
      }));
    }
  }, [calculatedDuration]);

  function applyMissionPrefill(mission: any) {
    setForm(prev => ({
      ...prev,
      mission_id: mission.id,
      title: mission.title ? `${mission.title} — Flight Log` : prev.title,
      flight_date: mission.mission_date || prev.flight_date,
      objective: mission.objective || prev.objective,
      launch_location: mission.launch_location || prev.launch_location,
      weather_summary: mission.weather_notes || prev.weather_summary,
      airspace_notes: mission.airspace_notes || prev.airspace_notes,
      flight_area_summary: mission.planned_flight_zone || prev.flight_area_summary,
    }));
  }

  // Prefill drone & pilot when mission operators/drones load
  useEffect(() => {
    if (missionDrones.length > 0 && !form.drone_model_id) {
      setForm(prev => ({ ...prev, drone_model_id: (missionDrones[0] as any).drone_model_id }));
    }
  }, [missionDrones]);

  useEffect(() => {
    if (missionOperators.length > 0 && !form.pilot_id) {
      const pic = (missionOperators as any[]).find(o => o.role === "pilot_in_command") || missionOperators[0];
      if (pic) setForm(prev => ({ ...prev, pilot_id: pic.user_id }));
    }
  }, [missionOperators]);

  function handleMissionChange(missionId: string) {
    setForm(prev => ({ ...prev, mission_id: missionId }));
    if (missionId) {
      const mission = (missions as any[]).find(m => m.id === missionId);
      if (mission) applyMissionPrefill(mission);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.project_id) errs.project_id = "Project is required";
    if (!form.pilot_id) errs.pilot_id = "Pilot in command is required";
    if (!form.flight_date) errs.flight_date = "Flight date is required";
    if (form.launch_time && form.landing_time) {
      const launch = new Date(form.launch_time).getTime();
      const landing = new Date(form.landing_time).getTime();
      if (landing <= launch) errs.landing_time = "Landing must be after launch";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    const payload: Record<string, any> = {
      organization_id: currentOrg!.id,
      title: form.title.trim(),
      flight_date: form.flight_date,
      project_id: form.project_id,
      mission_id: form.mission_id || null,
      drone_model_id: form.drone_model_id || null,
      pilot_id: form.pilot_id,
      outcome: form.outcome,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      launch_location: form.launch_location || null,
      launch_time: form.launch_time ? new Date(form.launch_time).toISOString() : null,
      landing_time: form.landing_time ? new Date(form.landing_time).toISOString() : null,
      objective: form.objective || null,
      weather_summary: form.weather_summary || null,
      airspace_notes: form.airspace_notes || null,
      incidents: form.incidents || null,
      postflight_notes: form.postflight_notes || null,
      battery_equipment_notes: form.battery_equipment_notes || null,
      deliverables_summary: form.deliverables_summary || null,
      flight_area_summary: form.flight_area_summary || null,
      flight_hours_contribution: form.flight_hours_contribution ? parseFloat(form.flight_hours_contribution) : 0,
      drone_utilization_contribution: form.drone_utilization_contribution ? parseFloat(form.drone_utilization_contribution) : 0,
      preflight_completed: form.preflight_completed,
    };

    try {
      if (isEdit) {
        await updateLog.mutateAsync({ id: editData!.id, ...payload });
        toast.success("Flight log updated");
      } else {
        await createLog.mutateAsync(payload);
        toast.success("Flight log created");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const isPending = createLog.isPending || updateLog.isPending;
  const inputCls = (field?: string) =>
    `w-full bg-background border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary ${
      field && errors[field] ? "border-destructive" : "border-border"
    }`;

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 overflow-y-auto py-8" onClick={() => onOpenChange(false)}>
      <div className="surface border border-border w-full max-w-2xl my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-medium text-foreground">
            {isEdit ? "Edit Flight Log" : "New Flight Log"}
          </h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="stat-label block mb-1">Flight Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls("title")} placeholder="e.g. North Corridor Survey Flight 1" />
            {errors.title && <p className="font-mono text-[10px] text-destructive mt-1">{errors.title}</p>}
          </div>

          {/* Project + Mission */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1">Project *</label>
              <select
                value={form.project_id}
                onChange={e => {
                  setForm({ ...form, project_id: e.target.value, mission_id: "" });
                  setProjectId(e.target.value);
                }}
                className={inputCls("project_id")}
              >
                <option value="">Select project</option>
                {(projects as any[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.project_id && <p className="font-mono text-[10px] text-destructive mt-1">{errors.project_id}</p>}
            </div>
            <div>
              <label className="stat-label block mb-1">Mission Plan</label>
              <select value={form.mission_id} onChange={e => handleMissionChange(e.target.value)} className={inputCls()} disabled={!projectId}>
                <option value="">None (manual entry)</option>
                {(missions as any[]).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              {form.mission_id && (
                <p className="font-mono text-[10px] text-primary mt-1">✓ Prefilled from mission plan</p>
              )}
            </div>
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="stat-label block mb-1">Flight Date *</label>
              <Input type="date" value={form.flight_date} onChange={e => setForm({ ...form, flight_date: e.target.value })} className={`h-9 text-xs font-mono ${errors.flight_date ? "border-destructive" : ""}`} />
              {errors.flight_date && <p className="font-mono text-[10px] text-destructive mt-1">{errors.flight_date}</p>}
            </div>
            <div>
              <label className="stat-label block mb-1">Launch Time</label>
              <Input type="datetime-local" value={form.launch_time} onChange={e => setForm({ ...form, launch_time: e.target.value })} className="h-9 text-xs font-mono" />
            </div>
            <div>
              <label className="stat-label block mb-1">Landing Time</label>
              <Input type="datetime-local" value={form.landing_time} onChange={e => setForm({ ...form, landing_time: e.target.value })} className={`h-9 text-xs font-mono ${errors.landing_time ? "border-destructive" : ""}`} />
              {errors.landing_time && <p className="font-mono text-[10px] text-destructive mt-1">{errors.landing_time}</p>}
            </div>
          </div>

          {/* Auto-calculated duration banner */}
          {calculatedDuration !== null && (
            <div className="flex items-center gap-2 px-3 py-2 border border-primary/30 bg-primary/5 font-mono text-[11px] text-primary">
              <Clock className="w-3.5 h-3.5" />
              Duration auto-calculated: {calculatedDuration} min ({(calculatedDuration / 60).toFixed(2)} hrs)
            </div>
          )}

          {/* Duration + Hours (manual fallback) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="stat-label block mb-1">Duration (min){calculatedDuration !== null ? " ✓" : ""}</label>
              <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} className={inputCls()} placeholder="45" disabled={calculatedDuration !== null} />
            </div>
            <div>
              <label className="stat-label block mb-1">Flight Hours{calculatedDuration !== null ? " ✓" : ""}</label>
              <input type="number" step="0.01" value={form.flight_hours_contribution} onChange={e => setForm({ ...form, flight_hours_contribution: e.target.value })} className={inputCls()} placeholder="0.75" disabled={calculatedDuration !== null} />
            </div>
            <div>
              <label className="stat-label block mb-1">Drone Utilization</label>
              <input type="number" step="0.01" value={form.drone_utilization_contribution} onChange={e => setForm({ ...form, drone_utilization_contribution: e.target.value })} className={inputCls()} placeholder="0.75" />
            </div>
          </div>

          {/* Pilot + Drone + Outcome */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="stat-label block mb-1">Pilot in Command *</label>
              <select value={form.pilot_id} onChange={e => setForm({ ...form, pilot_id: e.target.value })} className={inputCls("pilot_id")}>
                <option value="">Select pilot</option>
                {(members as any[]).map(m => <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || "Unnamed"}</option>)}
              </select>
              {errors.pilot_id && <p className="font-mono text-[10px] text-destructive mt-1">{errors.pilot_id}</p>}
            </div>
            <div>
              <label className="stat-label block mb-1">Drone Model</label>
              <select value={form.drone_model_id} onChange={e => setForm({ ...form, drone_model_id: e.target.value })} className={inputCls()}>
                <option value="">None</option>
                {(droneModels as any[]).map(d => <option key={d.id} value={d.id}>{(d.drone_manufacturers as any)?.name} {d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1">Outcome</label>
              <select value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} className={inputCls()}>
                {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Location + Flight Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1">Launch Location</label>
              <input value={form.launch_location} onChange={e => setForm({ ...form, launch_location: e.target.value })} className={inputCls()} placeholder="GPS coordinates or description" />
            </div>
            <div>
              <label className="stat-label block mb-1">Flight Area Summary</label>
              <input value={form.flight_area_summary} onChange={e => setForm({ ...form, flight_area_summary: e.target.value })} className={inputCls()} placeholder="Coverage area description" />
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="stat-label block mb-1">Objective</label>
            <textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} className={`${inputCls()} h-16 resize-none`} placeholder="Flight objective" />
          </div>

          {/* Weather + Airspace */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1">Weather Summary</label>
              <input value={form.weather_summary} onChange={e => setForm({ ...form, weather_summary: e.target.value })} className={inputCls()} placeholder="Clear, 12mph winds" />
            </div>
            <div>
              <label className="stat-label block mb-1">Airspace Notes</label>
              <input value={form.airspace_notes} onChange={e => setForm({ ...form, airspace_notes: e.target.value })} className={inputCls()} placeholder="Class G, no TFRs" />
            </div>
          </div>

          {/* Battery + Equipment */}
          <div>
            <label className="stat-label block mb-1">Battery / Equipment Notes</label>
            <input value={form.battery_equipment_notes} onChange={e => setForm({ ...form, battery_equipment_notes: e.target.value })} className={inputCls()} placeholder="Battery 1 used, 85% → 22%" />
          </div>

          {/* Incidents */}
          <div>
            <label className="stat-label block mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-400" /> Incidents / Anomalies
            </label>
            <textarea value={form.incidents} onChange={e => setForm({ ...form, incidents: e.target.value })} className={`${inputCls()} h-16 resize-none`} placeholder="None, or describe any issues" />
          </div>

          {/* Postflight Notes */}
          <div>
            <label className="stat-label block mb-1">Postflight Notes</label>
            <textarea value={form.postflight_notes} onChange={e => setForm({ ...form, postflight_notes: e.target.value })} className={`${inputCls()} h-16 resize-none`} placeholder="Postflight observations" />
          </div>

          {/* Deliverables */}
          <div>
            <label className="stat-label block mb-1">Deliverables Summary</label>
            <input value={form.deliverables_summary} onChange={e => setForm({ ...form, deliverables_summary: e.target.value })} className={inputCls()} placeholder="Photos captured, data collected" />
          </div>

          {/* Preflight checkbox */}
          <label className="flex items-center gap-2 font-mono text-xs text-foreground cursor-pointer">
            <input type="checkbox" checked={form.preflight_completed} onChange={e => setForm({ ...form, preflight_completed: e.target.checked })} className="accent-primary" />
            Preflight checklist completed
          </label>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={() => onOpenChange(false)} className="h-9 px-4 border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isPending} className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-80 transition-opacity disabled:opacity-50">
            {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Create Flight Log")}
          </button>
        </div>
      </div>
    </div>
  );
}
