import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Crosshair, CheckCircle2, AlertTriangle, XCircle, Calendar, MapPin, Users, Plane, Shield, ChevronRight, Filter, X, Clock, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MissionBriefExport } from "@/components/missions/MissionBriefExport";
import { MissionFlightHistory, getMissionFlightStatus } from "@/components/missions/MissionFlightHistory";
import { MissionDeliverablesStatus } from "@/components/missions/MissionDeliverablesStatus";
import { MissionExportedFiles } from "@/components/missions/MissionExportedFiles";
import { FlightLogFormDialog } from "@/components/flightlogs/FlightLogFormDialog";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMissionMutations } from "@/hooks/useMissionData";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";

/* ── data hook ── */
function useUpcomingMissions() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["upcoming_missions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select(
          "id, title, status, mission_date, go_status, preflight_status, objective, risk_notes, weather_notes, airspace_notes, altitude_notes, latitude, longitude, launch_location, target_area, planned_flight_zone, flight_duration_estimate_min, project_id, organization_id, projects(id, name, status, budget, start_date, latitude, longitude, location_name)"
        )
        .eq("organization_id", orgId!)
        .in("status", ["draft", "planning", "approved", "ready", "in_progress"])
        .order("mission_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const missionIds = useMemo(() => missions.map((m: any) => m.id), [missions]);
  const projectIds = useMemo(() => [...new Set(missions.map((m: any) => m.project_id))], [missions]);

  const { data: allOperators = [] } = useQuery({
    queryKey: ["upcoming_missions_operators", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("mission_operators")
        .select("mission_id, user_id, role, profiles:user_id(id, full_name)")
        .in("mission_id", missionIds);
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
  });

  const { data: allDroneModels = [] } = useQuery({
    queryKey: ["upcoming_missions_drone_models", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("mission_drone_models")
        .select("mission_id, drone_model_id, drone_models:drone_model_id(id, name, category)")
        .in("mission_id", missionIds);
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
  });

  const { data: allProjectDrones = [] } = useQuery({
    queryKey: ["upcoming_missions_proj_drones", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("project_drones")
        .select("project_id, drone_id, drones(id, name, status)")
        .in("project_id", projectIds);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  const { data: allMissionSkills = [] } = useQuery({
    queryKey: ["upcoming_missions_skills", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase.from("mission_skills").select("mission_id, skill_id").in("mission_id", missionIds);
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
  });

  const allOperatorIds = useMemo(() => [...new Set(allOperators.map((o: any) => o.user_id))], [allOperators]);

  const { data: allUserSkills = [] } = useQuery({
    queryKey: ["upcoming_missions_user_skills", allOperatorIds],
    queryFn: async () => {
      if (allOperatorIds.length === 0) return [];
      const { data, error } = await supabase.from("user_skills").select("user_id, skill_id").in("user_id", allOperatorIds);
      if (error) throw error;
      return data;
    },
    enabled: allOperatorIds.length > 0,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["upcoming_missions_checklist", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("preflight_checklist_items")
        .select("mission_id, check_key, label, is_critical, is_auto, manual_checked, override_note, auto_status")
        .in("mission_id", missionIds);
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
  });

  // Fetch flight logs linked to these missions
  const { data: allFlightLogs = [] } = useQuery({
    queryKey: ["upcoming_missions_flight_logs", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, title, flight_date, outcome, duration_minutes, flight_hours_contribution, incidents, pilot_id, mission_id, profiles!flight_logs_pilot_id_fkey(full_name), drone_models(name, drone_manufacturers(name))")
        .in("mission_id", missionIds)
        .order("flight_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
  });

  // Batch-fetch flight log IDs for deliverables
  const flightLogIds = useMemo(() => allFlightLogs.map((fl: any) => fl.id), [allFlightLogs]);

  // Batch-fetch deliverables for all flight logs in these missions
  const { data: allDeliverables = [] } = useQuery({
    queryKey: ["upcoming_missions_deliverables", flightLogIds],
    queryFn: async () => {
      if (flightLogIds.length === 0) return [];
      const { data, error } = await supabase
        .from("flight_log_deliverables")
        .select("id, flight_log_id, deliverable_type, label, status, notes")
        .in("flight_log_id", flightLogIds);
      if (error) throw error;
      return data;
    },
    enabled: flightLogIds.length > 0,
  });

  // Batch-fetch mission files
  const { data: allMissionFiles = [] } = useQuery({
    queryKey: ["upcoming_missions_files", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("mission_files")
        .select("*, profiles:generated_by(full_name)")
        .in("mission_id", missionIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
  });

  // Build enriched list
  const enriched = useMemo(() => {
    const userSkillSet = new Set(allUserSkills.map((us: any) => `${us.user_id}:${us.skill_id}`));

    return missions.map((m: any) => {
      const proj = m.projects;
      const ops = allOperators.filter((o: any) => o.mission_id === m.id);
      const drones = allDroneModels.filter((d: any) => d.mission_id === m.id);
      const projDrones = allProjectDrones.filter((d: any) => d.project_id === m.project_id);
      const skills = allMissionSkills.filter((s: any) => s.mission_id === m.id);
      const checklist = checklistItems.filter((c: any) => c.mission_id === m.id);
      const missionFlightLogs = allFlightLogs.filter((fl: any) => fl.mission_id === m.id);
      const missionFlightLogIds = new Set(missionFlightLogs.map((fl: any) => fl.id));
      const missionDeliverables = allDeliverables.filter((d: any) => missionFlightLogIds.has(d.flight_log_id));
      const missionFiles = allMissionFiles.filter((f: any) => f.mission_id === m.id);

      // Readiness calculation
      const missing: string[] = [];
      let readyCount = 0;
      const total = 7;

      // 1. Project
      const projActive = proj?.status === "active" || proj?.status === "pending";
      if (projActive) readyCount++;
      else missing.push("Project not active");

      // 2. Drones
      if (projDrones.length > 0) readyCount++;
      else missing.push("No drones assigned");

      // 3. Operators
      if (ops.length >= 2) readyCount++;
      else if (ops.length === 0) missing.push("No operators assigned");
      else missing.push("Only 1 operator");

      // 4. Skills
      if (skills.length > 0) {
        const opIds = ops.map((o: any) => o.user_id);
        const covered = skills.filter((s: any) => opIds.some((uid: string) => userSkillSet.has(`${uid}:${s.skill_id}`))).length;
        if (covered === skills.length) readyCount++;
        else missing.push(`${skills.length - covered} skill gap${skills.length - covered > 1 ? "s" : ""}`);
      } else {
        readyCount++; // no requirements = pass
      }

      // 5. Location
      const hasCoords = (m.latitude && m.longitude) || (proj?.latitude && proj?.longitude);
      if (hasCoords) readyCount++;
      else missing.push("No location set");

      // 6. Planning
      const goReady = m.go_status === "go";
      const planNotes = [m.objective, m.risk_notes, m.weather_notes, m.airspace_notes, m.altitude_notes].filter(Boolean).length;
      if (goReady && planNotes >= 3) readyCount++;
      else {
        if (m.go_status === "no_go") missing.push("NO-GO status");
        else if (!goReady) missing.push("Go status pending");
        if (planNotes < 3) missing.push(`${5 - planNotes} notes missing`);
      }

      // 7. Flight zone
      if (m.planned_flight_zone || (m.latitude && m.longitude)) readyCount++;
      else missing.push("Flight zone not defined");

      const score = Math.round((readyCount / total) * 100);
      const hasBlocked = ops.length === 0 || m.go_status === "no_go" || m.preflight_status === "failed";
      const overall: "ready" | "needs_review" | "blocked" = score === 100 ? "ready" : hasBlocked ? "blocked" : "needs_review";

      // Checklist missing items
      const missingChecklist = checklist.filter((c: any) => {
        if (c.override_note) return false;
        if (c.is_auto) return c.auto_status !== "ready";
        return !c.manual_checked;
      });

      return {
        ...m,
        project: proj,
        operators: ops,
        droneModels: drones,
        projectDrones: projDrones,
        flightLogs: missionFlightLogs,
        deliverables: missionDeliverables,
        missionFiles: missionFiles,
        readiness: { overall, score, missing },
        missingChecklist,
        checklistTotal: checklist.length,
        checklistPassed: checklist.length - missingChecklist.length,
      };
    });
  }, [missions, allOperators, allDroneModels, allProjectDrones, allMissionSkills, allUserSkills, checklistItems, allFlightLogs, allDeliverables, allMissionFiles]);

  return { missions: enriched, isLoading };
}

/* ── config ── */
const statusConfig = {
  ready: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Ready" },
  needs_review: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Needs Review" },
  blocked: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Blocked" },
};

const missionStatusColor: Record<string, string> = {
  draft: "text-muted-foreground bg-muted",
  planning: "text-primary bg-primary/10",
  approved: "text-success bg-success/10",
  ready: "text-success bg-success/10",
  in_progress: "text-warning bg-warning/10",
};

const goStatusLabel = (s: string) => s === "go" ? "GO" : s === "no_go" ? "NO-GO" : "PENDING";
const goStatusColor: Record<string, string> = {
  go: "text-success",
  no_go: "text-destructive",
  pending: "text-warning",
};

/* ── page ── */
const Missions = () => {
  const { missions, isLoading } = useUpcomingMissions();
  const { updateMission, deleteMission } = useMissionMutations();
  const { isAdmin } = useOrgRole();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [readinessFilter, setReadinessFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [flightLogOpen, setFlightLogOpen] = useState(false);
  const [prefillMissionId, setPrefillMissionId] = useState<string | undefined>();
  const [prefillProjectId, setPrefillProjectId] = useState<string | undefined>();

  function openLogFlight(missionId: string, projectId: string) {
    setPrefillMissionId(missionId);
    setPrefillProjectId(projectId);
    setFlightLogOpen(true);
  }

  async function markMissionComplete(missionId: string) {
    try {
      await updateMission.mutateAsync({ id: missionId, status: "completed" as any });
    } catch {}
  }

  function handleDelete(missionId: string, title: string) {
    confirm({
      title: "Delete Mission",
      description: `Permanently delete "${title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: () => deleteMission.mutateAsync(missionId),
    });
  }

  const filtered = useMemo(() => {
    return missions.filter((m: any) => {
      if (statusFilter.length > 0 && !statusFilter.includes(m.status)) return false;
      if (readinessFilter && m.readiness.overall !== readinessFilter) return false;
      // When date filters are active, exclude missions without a scheduled date
      if (dateFrom || dateTo) {
        if (!m.mission_date) return false;
        if (dateFrom && isBefore(parseISO(m.mission_date), parseISO(dateFrom))) return false;
        if (dateTo && isAfter(parseISO(m.mission_date), parseISO(dateTo))) return false;
      }
      return true;
    });
  }, [missions, statusFilter, readinessFilter, dateFrom, dateTo]);

  const hasFilters = statusFilter.length > 0 || readinessFilter || dateFrom || dateTo;
  const clearFilters = () => { setStatusFilter([]); setReadinessFilter(""); setDateFrom(""); setDateTo(""); };

  const toggleStatus = (s: string) => {
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const blockedCount = missions.filter((m: any) => m.readiness.overall === "blocked").length;
  const reviewCount = missions.filter((m: any) => m.readiness.overall === "needs_review").length;
  const readyCount = missions.filter((m: any) => m.readiness.overall === "ready").length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="stat-label mb-1">Mission Planning</p>
        <h1 className="page-title">Upcoming Missions</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-2 h-2 bg-primary animate-pulse-glow" />
        </div>
      ) : missions.length === 0 ? (
        <EmptyState
          icon={Crosshair}
          title="No upcoming missions"
          description="Missions are the heart of your flight operations. Plan a mission from a project detail page or the Airspace Map — assign operators, drones, and run preflight checklists before every flight."
          hints={[
            { label: "Create a project first", href: "/projects" },
            { label: "Open Airspace Map", href: "/map" },
          ]}
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-6">
            <div className="bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total</p>
              <p className="font-mono text-xl text-foreground">{missions.length}</p>
            </div>
            <div className="bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-success mb-1">Ready</p>
              <p className="font-mono text-xl text-success">{readyCount}</p>
            </div>
            <div className="bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-warning mb-1">Needs Review</p>
              <p className="font-mono text-xl text-warning">{reviewCount}</p>
            </div>
            <div className="bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-destructive mb-1">Blocked</p>
              <p className="font-mono text-xl text-destructive">{blockedCount}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="surface border border-border p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Filters</p>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Mission Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {["draft", "planning", "approved", "ready", "in_progress"].map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                        statusFilter.length === 0 || statusFilter.includes(s)
                          ? "border-primary/50 text-foreground bg-primary/10"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Readiness</p>
                <div className="flex gap-1.5">
                  {(["blocked", "needs_review", "ready"] as const).map((r) => {
                    const cfg = statusConfig[r];
                    return (
                      <button
                        key={r}
                        onClick={() => setReadinessFilter(readinessFilter === r ? "" : r)}
                        className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                          !readinessFilter || readinessFilter === r
                            ? `border-primary/50 ${cfg.color} ${cfg.bg}`
                            : "border-border text-muted-foreground hover:border-muted-foreground"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Date Range</p>
                <div className="flex gap-2">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 text-xs font-mono w-32" />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 text-xs font-mono w-32" />
                </div>
              </div>
            </div>
          </div>

          {/* Mission List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground p-4">No missions match the current filters.</p>
            ) : (
              filtered.map((m: any) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  onLogFlight={() => openLogFlight(m.id, m.project_id)}
                  onMarkComplete={() => markMissionComplete(m.id)}
                  onDelete={isAdmin ? () => handleDelete(m.id, m.title) : undefined}
                />
              ))
            )}
          </div>
        </>
      )}

      <FlightLogFormDialog
        open={flightLogOpen}
        onOpenChange={setFlightLogOpen}
        prefillMissionId={prefillMissionId}
        prefillProjectId={prefillProjectId}
      />
      <ConfirmationDialog />
    </div>
  );
};

function MissionCard({ mission: m, onLogFlight, onMarkComplete, onDelete }: { mission: any; onLogFlight: () => void; onMarkComplete: () => void; onDelete?: () => void }) {
  const cfg = statusConfig[m.readiness.overall as keyof typeof statusConfig];
  const ReadinessIcon = cfg.icon;
  const flightStatus = getMissionFlightStatus(m.flightLogs || []);

  return (
    <div className={`surface border border-border hover:border-primary/30 transition-colors ${
      m.readiness.overall === "blocked" ? "border-l-2 border-l-destructive" :
      m.readiness.overall === "needs_review" ? "border-l-2 border-l-warning" : ""
    }`}>
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-mono text-sm font-medium text-foreground truncate">{m.title}</p>
              <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${missionStatusColor[m.status] || "text-muted-foreground bg-muted"}`}>
                {m.status.replace("_", " ")}
              </span>
              {flightStatus && (
                <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${flightStatus.color}`}>
                  {flightStatus.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <Link to={`/projects/${m.project_id}`} className="hover:text-primary transition-colors">{m.project?.name}</Link>
              {m.mission_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(m.mission_date), "MMM d, yyyy")}
                </span>
              )}
              {m.flight_duration_estimate_min && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {m.flight_duration_estimate_min}min
                </span>
              )}
              {(m.launch_location || m.project?.location_name) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {m.launch_location || m.project?.location_name}
                </span>
              )}
            </div>
          </div>

          {/* Readiness badge + actions */}
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className={`font-mono text-[10px] px-2 py-0.5 ${goStatusColor[m.go_status]} bg-secondary`}>
              {goStatusLabel(m.go_status)}
            </span>
            <div className="flex items-center gap-1.5">
              <ReadinessIcon className={`w-4 h-4 ${cfg.color}`} />
              <span className={`font-mono text-xs font-medium ${cfg.color}`}>{m.readiness.score}%</span>
            </div>
            <button
              onClick={onLogFlight}
              className="p-1.5 hover:bg-primary/10 transition-colors"
              title="Log a flight"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
            </button>
            {m.flightLogs?.length > 0 && m.flightLogs.every((l: any) => l.outcome === "completed") && (
              <button
                onClick={onMarkComplete}
                className="font-mono text-[10px] px-2 py-1 border border-success/30 text-success hover:bg-success/10 transition-colors"
                title="Mark mission as completed based on flight outcomes"
              >
                Mark Complete
              </button>
            )}
            <Link
              to={`/projects/${m.project_id}`}
              className="p-1.5 hover:bg-secondary/50 transition-colors"
              title="View project"
            >
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
            <Link
              to="/map"
              className="p-1.5 hover:bg-secondary/50 transition-colors"
              title="View on map"
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
            <MissionBriefExport missionId={m.id} missionTitle={m.title} />
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 hover:bg-destructive/10 transition-colors"
                title="Delete mission"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            )}
          </div>
        </div>

        {/* Info row: operators, drones, checklist */}
        <div className="flex flex-wrap items-center gap-4 mb-3">
          {/* Operators */}
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-muted-foreground" />
            {m.operators.length === 0 ? (
              <span className="font-mono text-[10px] text-destructive">No operators</span>
            ) : (
              <div className="flex items-center gap-1">
                {m.operators.slice(0, 3).map((op: any) => (
                  <span key={op.user_id} className="font-mono text-[10px] text-foreground bg-secondary px-1.5 py-0.5">
                    {(op.profiles as any)?.full_name?.split(" ")[0] || "—"}
                  </span>
                ))}
                {m.operators.length > 3 && (
                  <span className="font-mono text-[10px] text-muted-foreground">+{m.operators.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {/* Drones */}
          <div className="flex items-center gap-1.5">
            <Plane className="w-3 h-3 text-muted-foreground" />
            {m.droneModels.length === 0 && m.projectDrones.length === 0 ? (
              <span className="font-mono text-[10px] text-destructive">No drones</span>
            ) : m.droneModels.length > 0 ? (
              <div className="flex items-center gap-1">
                {m.droneModels.slice(0, 2).map((d: any) => (
                  <span key={d.drone_model_id} className="font-mono text-[10px] text-foreground bg-secondary px-1.5 py-0.5">
                    {(d.drone_models as any)?.name || "—"}
                  </span>
                ))}
                {m.droneModels.length > 2 && (
                  <span className="font-mono text-[10px] text-muted-foreground">+{m.droneModels.length - 2}</span>
                )}
              </div>
            ) : (
              <span className="font-mono text-[10px] text-foreground">{m.projectDrones.length} project drone{m.projectDrones.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {/* Checklist */}
          {m.checklistTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-muted-foreground" />
              <span className={`font-mono text-[10px] ${m.missingChecklist.length === 0 ? "text-success" : "text-warning"}`}>
                {m.checklistPassed}/{m.checklistTotal} checks
              </span>
            </div>
          )}
        </div>

        {/* Missing items / blocked reasons */}
        {(m.readiness.missing.length > 0 || m.missingChecklist.length > 0) && (
          <div className={`px-3 py-2 ${m.readiness.overall === "blocked" ? "bg-destructive/5" : "bg-warning/5"}`}>
            {m.readiness.missing.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {m.readiness.missing.map((reason: string, i: number) => (
                  <span key={i} className={`font-mono text-[10px] flex items-center gap-1 ${
                    m.readiness.overall === "blocked" ? "text-destructive/80" : "text-warning/80"
                  }`}>
                    <span className={`w-1 h-1 rounded-full shrink-0 ${
                      m.readiness.overall === "blocked" ? "bg-destructive" : "bg-warning"
                    }`} />
                    {reason}
                  </span>
                ))}
              </div>
            )}
            {m.missingChecklist.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {m.missingChecklist.slice(0, 4).map((c: any, i: number) => (
                  <span key={i} className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                    <XCircle className="w-2.5 h-2.5 text-muted-foreground" />
                    {c.label}
                  </span>
                ))}
                {m.missingChecklist.length > 4 && (
                  <span className="font-mono text-[10px] text-muted-foreground">+{m.missingChecklist.length - 4} more</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Flight History */}
        <MissionFlightHistory flightLogs={m.flightLogs || []} />

        {/* Deliverables */}
        <MissionDeliverablesStatus missionId={m.id} deliverables={m.deliverables} />

        {/* Exported Files */}
        <MissionExportedFiles missionId={m.id} files={m.missionFiles} />
      </div>
    </div>
  );
}

export default Missions;
