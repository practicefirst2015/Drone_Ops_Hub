import { useMemo } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface MissionReadinessDimension {
  key: string;
  label: string;
  status: "ready" | "needs_review" | "blocked";
  detail: string;
}

export interface MissionReadinessResult {
  overall: "ready" | "needs_review" | "blocked";
  score: number;
  dimensions: MissionReadinessDimension[];
  loading: boolean;
}

/**
 * Computes mission readiness from real stored data.
 * Dimensions:
 *  1. Project completeness (status, budget, dates)
 *  2. Assigned drones (project_drones for linked project)
 *  3. Drone capability match (drone_models specs)
 *  4. Assigned operators (mission_operators)
 *  5. Skill coverage (mission_skills vs operator user_skills)
 *  6. Certification coverage (certs for operators on mission skills)
 *  7. Location completeness (mission or project coords)
 *  8. Planning notes completeness (objective, risk, weather, airspace, go_status, preflight)
 */
export function useMissionReadiness(missionId: string | undefined, mission?: any): MissionReadinessResult {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  // Linked project
  const projectId = mission?.project_id;

  const { data: project } = useQuery({
    queryKey: ["mission_readiness_project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, budget, start_date, end_date, latitude, longitude, location_name, flight_radius_m, flight_altitude_m")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Project drones
  const { data: projectDrones = [] } = useQuery({
    queryKey: ["mission_readiness_proj_drones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_drones")
        .select("id, drone_id, drones(id, name, status, drone_model_id)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Mission drone models
  const { data: missionDroneModels = [] } = useQuery({
    queryKey: ["mission_readiness_drone_models", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_drone_models")
        .select("id, drone_model_id, drone_models:drone_model_id(id, name, category)")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  // Mission operators
  const { data: operators = [] } = useQuery({
    queryKey: ["mission_readiness_operators", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_operators")
        .select("id, user_id, role, profiles:user_id(id, full_name)")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  // Mission skills
  const { data: missionSkills = [] } = useQuery({
    queryKey: ["mission_readiness_skills", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_skills")
        .select("id, skill_id, skills:skill_id(id, name)")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  const operatorIds = useMemo(() => operators.map((o: any) => o.user_id), [operators]);

  // Operator user_skills
  const { data: operatorSkills = [] } = useQuery({
    queryKey: ["mission_readiness_user_skills", missionId, operatorIds],
    queryFn: async () => {
      if (operatorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("user_skills")
        .select("user_id, skill_id")
        .eq("organization_id", orgId!)
        .in("user_id", operatorIds);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && operatorIds.length > 0,
  });

  // Operator certifications
  const { data: operatorCerts = [] } = useQuery({
    queryKey: ["mission_readiness_certs", missionId, operatorIds],
    queryFn: async () => {
      if (operatorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("certifications")
        .select("user_id, skill_id, status, expiry_date")
        .eq("organization_id", orgId!)
        .in("user_id", operatorIds)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && operatorIds.length > 0,
  });

  // Track real loading: mission prop absent OR any critical query still loading
  const queriesLoading = !project && !!projectId;
  const loading = !mission || queriesLoading;

  const result = useMemo((): Omit<MissionReadinessResult, "loading"> => {
    if (!mission) return { overall: "blocked", score: 0, dimensions: [] };

    const dimensions: MissionReadinessDimension[] = [];

    // 1. Project completeness
    if (project) {
      const hasStatus = project.status === "active" || project.status === "pending";
      const hasBudget = project.budget && Number(project.budget) > 0;
      const hasDates = !!project.start_date;
      const factors = [hasStatus, hasBudget, hasDates].filter(Boolean).length;
      if (factors === 3) {
        dimensions.push({ key: "project", label: "Project", status: "ready", detail: `${project.status}, budgeted, dates set` });
      } else if (factors >= 1) {
        const missing = [];
        if (!hasStatus) missing.push("not active");
        if (!hasBudget) missing.push("no budget");
        if (!hasDates) missing.push("no dates");
        dimensions.push({ key: "project", label: "Project", status: "needs_review", detail: missing.join(", ") });
      } else {
        dimensions.push({ key: "project", label: "Project", status: "blocked", detail: "Draft, no budget, no dates" });
      }
    } else {
      dimensions.push({ key: "project", label: "Project", status: "blocked", detail: "Project data unavailable" });
    }

    // 2. Assigned drones (from project)
    if (projectDrones.length > 0) {
      const availableCount = projectDrones.filter((d: any) => d.drones?.status === "available" || d.drones?.status === "in_use").length;
      if (availableCount === projectDrones.length) {
        dimensions.push({ key: "drones", label: "Drones", status: "ready", detail: `${projectDrones.length} assigned, all operational` });
      } else {
        dimensions.push({ key: "drones", label: "Drones", status: "needs_review", detail: `${availableCount}/${projectDrones.length} operational` });
      }
    } else {
      dimensions.push({ key: "drones", label: "Drones", status: "needs_review", detail: "No drones assigned to project" });
    }

    // 3. Drone capability match (mission requires specific models)
    if (missionDroneModels.length > 0) {
      // Check if project drones match any of the required models
      const requiredModelIds = new Set(missionDroneModels.map((m: any) => m.drone_model_id));
      const projectDroneModelIds = new Set(projectDrones.map((d: any) => d.drones?.drone_model_id).filter(Boolean));
      const matched = [...requiredModelIds].filter((id) => projectDroneModelIds.has(id)).length;
      if (matched === requiredModelIds.size) {
        dimensions.push({ key: "capability", label: "Drone Match", status: "ready", detail: `${matched}/${requiredModelIds.size} models matched` });
      } else if (matched > 0) {
        dimensions.push({ key: "capability", label: "Drone Match", status: "needs_review", detail: `${matched}/${requiredModelIds.size} models matched` });
      } else {
        dimensions.push({ key: "capability", label: "Drone Match", status: "blocked", detail: `0/${requiredModelIds.size} required models matched` });
      }
    } else {
      dimensions.push({ key: "capability", label: "Drone Match", status: "needs_review", detail: "No drone models specified" });
    }

    // 4. Assigned operators
    if (operators.length >= 2) {
      dimensions.push({ key: "operators", label: "Operators", status: "ready", detail: `${operators.length} operators assigned` });
    } else if (operators.length === 1) {
      dimensions.push({ key: "operators", label: "Operators", status: "needs_review", detail: "Only 1 operator assigned" });
    } else {
      dimensions.push({ key: "operators", label: "Operators", status: "blocked", detail: "No operators assigned" });
    }

    // 5. Skill coverage
    if (missionSkills.length === 0) {
      dimensions.push({ key: "skills", label: "Skills", status: "needs_review", detail: "No required skills defined" });
    } else {
      const userSkillSet = new Set(operatorSkills.map((us: any) => `${us.user_id}:${us.skill_id}`));
      const coveredCount = missionSkills.filter((ms: any) =>
        operatorIds.some((uid: string) => userSkillSet.has(`${uid}:${ms.skill_id}`))
      ).length;
      if (coveredCount === missionSkills.length) {
        dimensions.push({ key: "skills", label: "Skills", status: "ready", detail: `${coveredCount}/${missionSkills.length} skills covered` });
      } else if (coveredCount > 0) {
        dimensions.push({ key: "skills", label: "Skills", status: "needs_review", detail: `${coveredCount}/${missionSkills.length} skills covered` });
      } else {
        dimensions.push({ key: "skills", label: "Skills", status: "blocked", detail: `0/${missionSkills.length} skills covered` });
      }
    }

    // 6. Certification coverage
    if (missionSkills.length === 0) {
      dimensions.push({ key: "certs", label: "Certifications", status: "needs_review", detail: "No requirements to verify" });
    } else {
      const now = new Date();
      const validCertSet = new Set(
        operatorCerts
          .filter((c: any) => !c.expiry_date || new Date(c.expiry_date) > now)
          .map((c: any) => `${c.user_id}:${c.skill_id}`)
      );
      const certifiedCount = missionSkills.filter((ms: any) =>
        operatorIds.some((uid: string) => validCertSet.has(`${uid}:${ms.skill_id}`))
      ).length;
      const expiredCount = operatorCerts.filter((c: any) => c.expiry_date && new Date(c.expiry_date) <= now).length;

      if (certifiedCount === missionSkills.length) {
        dimensions.push({ key: "certs", label: "Certifications", status: "ready", detail: `${certifiedCount}/${missionSkills.length} certified` });
      } else if (expiredCount > 0) {
        dimensions.push({ key: "certs", label: "Certifications", status: "blocked", detail: `${expiredCount} expired cert${expiredCount > 1 ? "s" : ""}` });
      } else if (certifiedCount > 0) {
        dimensions.push({ key: "certs", label: "Certifications", status: "needs_review", detail: `${certifiedCount}/${missionSkills.length} certified` });
      } else {
        dimensions.push({ key: "certs", label: "Certifications", status: "needs_review", detail: "No certifications on file" });
      }
    }

    // 7. Location completeness
    const hasCoords = (mission.latitude && mission.longitude) || (project?.latitude && project?.longitude);
    const hasLocationName = !!mission.launch_location || !!mission.target_area || !!project?.location_name;
    if (hasCoords && hasLocationName) {
      dimensions.push({ key: "location", label: "Location", status: "ready", detail: mission.launch_location || project?.location_name || "Coordinates set" });
    } else if (hasCoords || hasLocationName) {
      dimensions.push({ key: "location", label: "Location", status: "needs_review", detail: hasCoords ? "Coords set, no location name" : "Name set, no coordinates" });
    } else {
      dimensions.push({ key: "location", label: "Location", status: "blocked", detail: "No location data" });
    }

    // 8. Planning notes completeness
    const planningFields = [
      { key: "objective", filled: !!mission.objective },
      { key: "risk_notes", filled: !!mission.risk_notes },
      { key: "weather_notes", filled: !!mission.weather_notes },
      { key: "airspace_notes", filled: !!mission.airspace_notes },
      { key: "altitude_notes", filled: !!mission.altitude_notes },
    ];
    const filledCount = planningFields.filter((f) => f.filled).length;
    const goReady = mission.go_status === "go";
    const preflightReady = mission.preflight_status === "complete";

    if (filledCount === planningFields.length && goReady && preflightReady) {
      dimensions.push({ key: "planning", label: "Planning", status: "ready", detail: "All notes, GO, preflight complete" });
    } else if (goReady && filledCount >= 3) {
      dimensions.push({ key: "planning", label: "Planning", status: "needs_review", detail: `${filledCount}/${planningFields.length} notes, GO` });
    } else {
      const missing = [];
      if (!goReady) missing.push(mission.go_status === "no_go" ? "NO-GO" : "go pending");
      if (!preflightReady) missing.push("preflight incomplete");
      if (filledCount < planningFields.length) missing.push(`${planningFields.length - filledCount} notes missing`);
      const isBlocked = mission.go_status === "no_go" || mission.preflight_status === "failed";
      dimensions.push({ key: "planning", label: "Planning", status: isBlocked ? "blocked" : "needs_review", detail: missing.join(", ") });
    }

    // Compute overall
    const hasBlocked = dimensions.some((d) => d.status === "blocked");
    const hasReview = dimensions.some((d) => d.status === "needs_review");
    const readyCount = dimensions.filter((d) => d.status === "ready").length;
    const score = Math.round((readyCount / dimensions.length) * 100);
    const overall: "ready" | "needs_review" | "blocked" = hasBlocked ? "blocked" : hasReview ? "needs_review" : "ready";

    return { overall, score, dimensions };
  }, [mission, project, projectDrones, missionDroneModels, operators, missionSkills, operatorSkills, operatorCerts, operatorIds]);

  return { ...result, loading };
}

/**
 * Batch mission readiness for dashboard — upcoming missions.
 */
export interface BatchMissionReadinessItem {
  missionId: string;
  title: string;
  projectName: string;
  projectId: string;
  missionDate: string | null;
  goStatus: string;
  overall: "ready" | "needs_review" | "blocked";
  score: number;
  missing: string[];
}

export function useBatchMissionReadiness() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  // Upcoming missions (not completed/cancelled/aborted)
  const { data: missions = [] } = useQuery({
    queryKey: ["batch_mission_readiness_missions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("id, title, status, mission_date, go_status, preflight_status, objective, risk_notes, weather_notes, airspace_notes, altitude_notes, latitude, longitude, launch_location, target_area, project_id, projects(id, name, status, budget, start_date, latitude, longitude, location_name)")
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

  // Mission operators count
  const { data: allOperators = [] } = useQuery({
    queryKey: ["batch_mission_readiness_operators", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase.from("mission_operators").select("mission_id, user_id").in("mission_id", missionIds);
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
  });

  // Mission skills count
  const { data: allMissionSkills = [] } = useQuery({
    queryKey: ["batch_mission_readiness_skills", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase.from("mission_skills").select("mission_id, skill_id").in("mission_id", missionIds);
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
  });

  // Project drones count
  const { data: allProjectDrones = [] } = useQuery({
    queryKey: ["batch_mission_readiness_proj_drones", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase.from("project_drones").select("project_id, drone_id").in("project_id", projectIds);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  // All operator user ids
  const allOperatorIds = useMemo(() => [...new Set(allOperators.map((o: any) => o.user_id))], [allOperators]);

  const { data: allUserSkills = [] } = useQuery({
    queryKey: ["batch_mission_readiness_user_skills", allOperatorIds],
    queryFn: async () => {
      if (allOperatorIds.length === 0) return [];
      const { data, error } = await supabase.from("user_skills").select("user_id, skill_id").in("user_id", allOperatorIds);
      if (error) throw error;
      return data;
    },
    enabled: allOperatorIds.length > 0,
  });

  const analysis = useMemo((): BatchMissionReadinessItem[] => {
    const userSkillSet = new Set(allUserSkills.map((us: any) => `${us.user_id}:${us.skill_id}`));

    return missions.map((m: any) => {
      const missing: string[] = [];
      let readyCount = 0;
      const total = 6; // simplified batch: project, drones, operators, skills, location, planning

      const proj = m.projects;

      // 1. Project
      const projActive = proj?.status === "active" || proj?.status === "pending";
      const projBudget = proj?.budget && Number(proj.budget) > 0;
      if (projActive && projBudget) readyCount++;
      else if (!projActive) missing.push("project not active");

      // 2. Drones
      const drones = allProjectDrones.filter((d: any) => d.project_id === m.project_id);
      if (drones.length > 0) readyCount++;
      else missing.push("no drones");

      // 3. Operators
      const ops = allOperators.filter((o: any) => o.mission_id === m.id);
      if (ops.length >= 2) readyCount++;
      else if (ops.length === 0) missing.push("no operators");
      else missing.push("1 operator");

      // 4. Skills
      const skills = allMissionSkills.filter((s: any) => s.mission_id === m.id);
      if (skills.length > 0) {
        const opIds = ops.map((o: any) => o.user_id);
        const covered = skills.filter((s: any) => opIds.some((uid: string) => userSkillSet.has(`${uid}:${s.skill_id}`))).length;
        if (covered === skills.length) readyCount++;
        else missing.push(`${skills.length - covered} skill gap${skills.length - covered > 1 ? "s" : ""}`);
      }

      // 5. Location
      const hasCoords = (m.latitude && m.longitude) || (proj?.latitude && proj?.longitude);
      if (hasCoords) readyCount++;
      else missing.push("no location");

      // 6. Planning
      const goReady = m.go_status === "go";
      const planNotes = [m.objective, m.risk_notes, m.weather_notes, m.airspace_notes, m.altitude_notes].filter(Boolean).length;
      if (goReady && planNotes >= 3) readyCount++;
      else {
        if (m.go_status === "no_go") missing.push("NO-GO");
        else if (!goReady) missing.push("go pending");
      }

      const score = Math.round((readyCount / total) * 100);
      const hasBlocked = ops.length === 0 || m.go_status === "no_go" || m.preflight_status === "failed";
      const overall: "ready" | "needs_review" | "blocked" = score === 100 ? "ready" : hasBlocked ? "blocked" : "needs_review";

      return {
        missionId: m.id,
        title: m.title,
        projectName: proj?.name || "",
        projectId: m.project_id,
        missionDate: m.mission_date,
        goStatus: m.go_status,
        overall,
        score,
        missing,
      };
    });
  }, [missions, allOperators, allMissionSkills, allProjectDrones, allUserSkills]);

  return { analysis, loading: missions.length === 0 && !!orgId };
}
