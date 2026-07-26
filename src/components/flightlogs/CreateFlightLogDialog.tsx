import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateFlightLog } from "@/hooks/useFlightLogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CreateFlightLogDialog() {
  const [open, setOpen] = useState(false);
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const createLog = useCreateFlightLog();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_list", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", currentOrg!.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!currentOrg?.id && open,
  });

  const [projectId, setProjectId] = useState("");

  const { data: missions = [] } = useQuery({
    queryKey: ["missions_for_project", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("missions")
        .select("id, title")
        .eq("project_id", projectId)
        .order("title");
      return data ?? [];
    },
    enabled: !!projectId && open,
  });

  const { data: droneModels = [] } = useQuery({
    queryKey: ["drone_models_list", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("drone_models")
        .select("id, name, drone_manufacturers(name)")
        .eq("organization_id", currentOrg!.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!currentOrg?.id && open,
  });

  const { data: fleetDrones = [] } = useQuery({
    queryKey: ["fleet_drones_list", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("drones")
        .select("id, name, model, status, drone_model_id")
        .eq("organization_id", currentOrg!.id)
        .in("status", ["available", "assigned", "in_flight"])
        .order("name");
      return data ?? [];
    },
    enabled: !!currentOrg?.id && open,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["org_members", currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("memberships")
        .select("user_id, profiles:user_id(id, full_name)")
        .eq("organization_id", currentOrg!.id);
      return data ?? [];
    },
    enabled: !!currentOrg?.id && open,
  });

  const [form, setForm] = useState({
    title: "",
    flight_date: new Date().toISOString().split("T")[0],
    project_id: "",
    mission_id: "",
    drone_model_id: "",
    drone_id: "",
    pilot_id: "",
    outcome: "completed",
    duration_minutes: "",
    launch_location: "",
    objective: "",
    weather_summary: "",
    incidents: "",
    postflight_notes: "",
    battery_equipment_notes: "",
    deliverables_summary: "",
    flight_hours_contribution: "",
    preflight_completed: false,
  });

  const resetForm = () => {
    setForm({
      title: "", flight_date: new Date().toISOString().split("T")[0], project_id: "", mission_id: "",
      drone_model_id: "", drone_id: "", pilot_id: "", outcome: "completed", duration_minutes: "", launch_location: "",
      objective: "", weather_summary: "", incidents: "", postflight_notes: "", battery_equipment_notes: "",
      deliverables_summary: "", flight_hours_contribution: "", preflight_completed: false,
    });
    setProjectId("");
  };

  const handleSubmit = async () => {
    if (!form.title || !form.project_id || !form.pilot_id || !form.flight_date) {
      toast.error("Title, project, pilot and flight date are required");
      return;
    }
    try {
      await createLog.mutateAsync({
        organization_id: currentOrg!.id,
        title: form.title,
        flight_date: form.flight_date,
        project_id: form.project_id,
        mission_id: form.mission_id || null,
        drone_model_id: form.drone_model_id || null,
        drone_id: form.drone_id || null,
        pilot_id: form.pilot_id,
        outcome: form.outcome,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        launch_location: form.launch_location || null,
        objective: form.objective || null,
        weather_summary: form.weather_summary || null,
        incidents: form.incidents || null,
        postflight_notes: form.postflight_notes || null,
        battery_equipment_notes: form.battery_equipment_notes || null,
        deliverables_summary: form.deliverables_summary || null,
        flight_hours_contribution: form.flight_hours_contribution ? parseFloat(form.flight_hours_contribution) : 0,
        preflight_completed: form.preflight_completed,
      });
      toast.success("Flight log created");
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const inputCls = "w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        <Plus className="w-3.5 h-3.5" /> New Flight Log
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 overflow-y-auto py-8">
      <div className="surface border border-border w-full max-w-2xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-medium text-foreground">New Flight Log</h2>
          <button onClick={() => { resetForm(); setOpen(false); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="stat-label block mb-1">Flight Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. North Corridor Survey Flight 1" />
            </div>
            <div>
              <label className="stat-label block mb-1">Project *</label>
              <select value={form.project_id} onChange={(e) => { setForm({ ...form, project_id: e.target.value, mission_id: "" }); setProjectId(e.target.value); }} className={inputCls}>
                <option value="">Select project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1">Mission Plan</label>
              <select value={form.mission_id} onChange={(e) => setForm({ ...form, mission_id: e.target.value })} className={inputCls} disabled={!projectId}>
                <option value="">None</option>
                {missions.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1">Flight Date *</label>
              <Input type="date" value={form.flight_date} onChange={(e) => setForm({ ...form, flight_date: e.target.value })} className="h-9 text-xs font-mono" />
            </div>
            <div>
              <label className="stat-label block mb-1">Duration (min)</label>
              <input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className={inputCls} placeholder="45" />
            </div>
            <div>
              <label className="stat-label block mb-1">Pilot in Command *</label>
              <select value={form.pilot_id} onChange={(e) => setForm({ ...form, pilot_id: e.target.value })} className={inputCls}>
                <option value="">Select pilot</option>
                {members.map((m: any) => <option key={m.user_id} value={m.user_id}>{(m.profiles as any)?.full_name || "Unnamed"}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1">Drone Model</label>
              <select value={form.drone_model_id} onChange={(e) => setForm({ ...form, drone_model_id: e.target.value })} className={inputCls}>
                <option value="">None</option>
                {droneModels.map((d: any) => <option key={d.id} value={d.id}>{(d.drone_manufacturers as any)?.name} {d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1">Drone Unit</label>
              <select value={form.drone_id} onChange={(e) => {
                const drone = fleetDrones.find((d: any) => d.id === e.target.value);
                setForm({ ...form, drone_id: e.target.value, drone_model_id: drone?.drone_model_id || form.drone_model_id });
              }} className={inputCls}>
                <option value="">None</option>
                {fleetDrones.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.model})</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1">Outcome</label>
              <select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} className={inputCls}>
                <option value="completed">Completed</option>
                <option value="partial">Partial</option>
                <option value="aborted">Aborted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="stat-label block mb-1">Flight Hours</label>
              <input type="number" step="0.1" value={form.flight_hours_contribution} onChange={(e) => setForm({ ...form, flight_hours_contribution: e.target.value })} className={inputCls} placeholder="0.75" />
            </div>
          </div>

          <div>
            <label className="stat-label block mb-1">Launch Location</label>
            <input value={form.launch_location} onChange={(e) => setForm({ ...form, launch_location: e.target.value })} className={inputCls} placeholder="GPS coordinates or description" />
          </div>
          <div>
            <label className="stat-label block mb-1">Objective</label>
            <textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} className={`${inputCls} h-16 resize-none`} placeholder="Flight objective" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1">Weather Summary</label>
              <input value={form.weather_summary} onChange={(e) => setForm({ ...form, weather_summary: e.target.value })} className={inputCls} placeholder="Clear, 12mph winds" />
            </div>
            <div>
              <label className="stat-label block mb-1">Battery / Equipment Notes</label>
              <input value={form.battery_equipment_notes} onChange={(e) => setForm({ ...form, battery_equipment_notes: e.target.value })} className={inputCls} placeholder="Battery 1 used, 85% → 22%" />
            </div>
          </div>
          <div>
            <label className="stat-label block mb-1">Incidents / Anomalies</label>
            <textarea value={form.incidents} onChange={(e) => setForm({ ...form, incidents: e.target.value })} className={`${inputCls} h-16 resize-none`} placeholder="None, or describe any issues" />
          </div>
          <div>
            <label className="stat-label block mb-1">Postflight Notes</label>
            <textarea value={form.postflight_notes} onChange={(e) => setForm({ ...form, postflight_notes: e.target.value })} className={`${inputCls} h-16 resize-none`} placeholder="Postflight observations" />
          </div>
          <div>
            <label className="stat-label block mb-1">Deliverables Summary</label>
            <input value={form.deliverables_summary} onChange={(e) => setForm({ ...form, deliverables_summary: e.target.value })} className={inputCls} placeholder="Photos captured, data collected" />
          </div>
          <label className="flex items-center gap-2 font-mono text-xs text-foreground cursor-pointer">
            <input type="checkbox" checked={form.preflight_completed} onChange={(e) => setForm({ ...form, preflight_completed: e.target.checked })} className="accent-primary" />
            Preflight checklist completed
          </label>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={() => { resetForm(); setOpen(false); }} className="h-9 px-4 border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={createLog.isPending} className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-80 transition-opacity disabled:opacity-50">
            {createLog.isPending ? "Creating…" : "Create Flight Log"}
          </button>
        </div>
      </div>
    </div>
  );
}
