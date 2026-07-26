import { useMemo } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type InsightSeverity = "critical" | "warning" | "info" | "suggestion";
export type InsightCategory = "readiness" | "assignment" | "compliance" | "risk" | "recommendation";

export interface IntelligenceInsight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  detail: string;
  entityType: "mission" | "project" | "drone" | "pilot";
  entityId: string;
  entityName: string;
  /** True = recommendation/suggestion; false = confirmed fact */
  isRecommendation: boolean;
  actionLabel?: string;
  actionHref?: string;
}

/**
 * Organization-wide mission intelligence that analyzes real data
 * to surface blockers, gaps, risks, and recommendations.
 */
export function useMissionIntelligence() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  // Active missions with project data
  const { data: missions = [], isLoading: missionsLoading } = useQuery({
    queryKey: ["intel_missions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("id, title, status, mission_date, go_status, preflight_status, objective, risk_notes, weather_notes, airspace_notes, launch_location, latitude, longitude, project_id, projects(id, name, status, budget, location_name)")
        .eq("organization_id", orgId!)
        .in("status", ["draft", "planning", "approved", "ready", "in_progress"])
        .order("mission_date", { ascending: true, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const missionIds = useMemo(() => missions.map((m: any) => m.id), [missions]);
  const projectIds = useMemo(() => [...new Set(missions.map((m: any) => m.project_id))], [missions]);

  // Mission operators
  const { data: allOperators = [] } = useQuery({
    queryKey: ["intel_operators", missionIds],
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
    staleTime: 60_000,
  });

  // Mission drone models
  const { data: allMissionDrones = [] } = useQuery({
    queryKey: ["intel_mission_drones", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("mission_drone_models")
        .select("mission_id, drone_model_id, drone_models:drone_model_id(id, name)")
        .in("mission_id", missionIds);
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
    staleTime: 60_000,
  });

  // Mission skills
  const { data: allMissionSkills = [] } = useQuery({
    queryKey: ["intel_mission_skills", missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("mission_skills")
        .select("mission_id, skill_id, skills:skill_id(id, name)")
        .in("mission_id", missionIds);
      if (error) throw error;
      return data;
    },
    enabled: missionIds.length > 0,
    staleTime: 60_000,
  });

  // Project drones
  const { data: allProjectDrones = [] } = useQuery({
    queryKey: ["intel_proj_drones", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("project_drones")
        .select("project_id, drone_id, drones(id, name, status, drone_model_id)")
        .in("project_id", projectIds);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
    staleTime: 60_000,
  });

  // All operator user IDs for skills/certs
  const operatorIds = useMemo(() => [...new Set(allOperators.map((o: any) => o.user_id))], [allOperators]);

  const { data: operatorSkills = [] } = useQuery({
    queryKey: ["intel_user_skills", operatorIds],
    queryFn: async () => {
      if (operatorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("user_skills")
        .select("user_id, skill_id")
        .in("user_id", operatorIds);
      if (error) throw error;
      return data;
    },
    enabled: operatorIds.length > 0,
    staleTime: 60_000,
  });

  const { data: operatorCerts = [] } = useQuery({
    queryKey: ["intel_certs", operatorIds, orgId],
    queryFn: async () => {
      if (operatorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("certifications")
        .select("user_id, skill_id, status, expiry_date")
        .eq("organization_id", orgId!)
        .in("user_id", operatorIds);
      if (error) throw error;
      return data;
    },
    enabled: operatorIds.length > 0 && !!orgId,
    staleTime: 60_000,
  });

  // Unresolved postflight issues
  const { data: unresolvedIssues = [] } = useQuery({
    queryKey: ["intel_issues", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postflight_issues")
        .select("id, title, severity, category, resolution_status, created_at, mission_id, flight_log_id, drone_model_id, pilot_id, drone_models(name)")
        .eq("organization_id", orgId!)
        .in("resolution_status", ["open", "investigating"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  // Recent flight logs for pattern detection
  const { data: recentFlights = [] } = useQuery({
    queryKey: ["intel_flights", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, title, flight_date, outcome, duration_minutes, mission_id, project_id, drone_model_id, pilot_id")
        .eq("organization_id", orgId!)
        .order("flight_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  // Incomplete deliverables
  const { data: incompleteDeliverables = [] } = useQuery({
    queryKey: ["intel_deliverables", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_deliverables")
        .select("id, deliverable_type, label, status, project_id, projects(name)")
        .eq("organization_id", orgId!)
        .in("status", ["expected", "partial", "not_captured"])
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const insights = useMemo((): IntelligenceInsight[] => {
    const result: IntelligenceInsight[] = [];
    const now = new Date();
    const userSkillSet = new Set(operatorSkills.map((us: any) => `${us.user_id}:${us.skill_id}`));
    const validCertSet = new Set(
      operatorCerts
        .filter((c: any) => c.status === "active" && (!c.expiry_date || new Date(c.expiry_date) > now))
        .map((c: any) => `${c.user_id}:${c.skill_id}`)
    );

    // ── Per-Mission Analysis ──
    for (const m of missions as any[]) {
      const mOps = allOperators.filter((o: any) => o.mission_id === m.id);
      const mDrones = allMissionDrones.filter((d: any) => d.mission_id === m.id);
      const mSkills = allMissionSkills.filter((s: any) => s.mission_id === m.id);
      const pDrones = allProjectDrones.filter((d: any) => d.project_id === m.project_id);
      const proj = m.projects as any;
      const projName = proj?.name || "Unknown Project";

      // 1. No operators assigned
      if (mOps.length === 0) {
        result.push({
          id: `no-ops-${m.id}`,
          severity: "critical",
          category: "assignment",
          title: "No operators assigned",
          detail: `Mission "${m.title}" has no assigned operators. Flight operations require at least one pilot.`,
          entityType: "mission",
          entityId: m.id,
          entityName: m.title,
          isRecommendation: false,
          actionLabel: "Assign operators",
          actionHref: `/projects/${m.project_id}?tab=readiness`,
        });
      } else if (mOps.length === 1) {
        result.push({
          id: `solo-op-${m.id}`,
          severity: "warning",
          category: "assignment",
          title: "Single operator assigned",
          detail: `Mission "${m.title}" has only 1 operator. Consider adding a visual observer or backup pilot.`,
          entityType: "mission",
          entityId: m.id,
          entityName: m.title,
          isRecommendation: true,
        });
      }

      // 2. No drones specified and no project drones
      if (mDrones.length === 0 && pDrones.length === 0) {
        result.push({
          id: `no-drone-${m.id}`,
          severity: "critical",
          category: "assignment",
          title: "No drone assigned",
          detail: `Neither mission "${m.title}" nor project "${projName}" has an assigned drone.`,
          entityType: "mission",
          entityId: m.id,
          entityName: m.title,
          isRecommendation: false,
          actionLabel: "Assign drone",
          actionHref: `/projects/${m.project_id}?tab=drones`,
        });
      } else if (mDrones.length > 0 && pDrones.length > 0) {
        // Check capability mismatch
        const requiredModelIds = new Set(mDrones.map((d: any) => d.drone_model_id));
        const projectModelIds = new Set(pDrones.map((d: any) => d.drones?.drone_model_id).filter(Boolean));
        const unmatched = [...requiredModelIds].filter((id) => !projectModelIds.has(id));
        if (unmatched.length > 0) {
          const unmatchedNames = mDrones
            .filter((d: any) => unmatched.includes(d.drone_model_id))
            .map((d: any) => d.drone_models?.name || "Unknown")
            .join(", ");
          result.push({
            id: `drone-mismatch-${m.id}`,
            severity: "warning",
            category: "readiness",
            title: "Drone model mismatch",
            detail: `Mission "${m.title}" requires ${unmatchedNames} but project fleet doesn't include ${unmatched.length === 1 ? "this model" : "these models"}.`,
            entityType: "mission",
            entityId: m.id,
            entityName: m.title,
            isRecommendation: false,
            actionLabel: "Review drones",
            actionHref: `/projects/${m.project_id}?tab=drones`,
          });
        }
      }

      // 3. Skill gaps
      if (mSkills.length > 0 && mOps.length > 0) {
        const opIds = mOps.map((o: any) => o.user_id);
        const uncoveredSkills = mSkills.filter((s: any) =>
          !opIds.some((uid: string) => userSkillSet.has(`${uid}:${s.skill_id}`))
        );
        if (uncoveredSkills.length > 0) {
          const skillNames = uncoveredSkills.map((s: any) => s.skills?.name || "Unknown").join(", ");
          result.push({
            id: `skill-gap-${m.id}`,
            severity: uncoveredSkills.length === mSkills.length ? "critical" : "warning",
            category: "compliance",
            title: `${uncoveredSkills.length} skill gap${uncoveredSkills.length > 1 ? "s" : ""}`,
            detail: `Operators on "${m.title}" lack: ${skillNames}. Consider reassigning qualified personnel.`,
            entityType: "mission",
            entityId: m.id,
            entityName: m.title,
            isRecommendation: true,
            actionLabel: "Review skills",
            actionHref: `/projects/${m.project_id}?tab=skills`,
          });
        }
      }

      // 4. Expired certifications
      if (mSkills.length > 0 && mOps.length > 0) {
        const opIds = mOps.map((o: any) => o.user_id);
        const uncertified = mSkills.filter((s: any) =>
          !opIds.some((uid: string) => validCertSet.has(`${uid}:${s.skill_id}`))
        );
        // Only flag if skills ARE covered but certs are not
        const coveredButUncertified = uncertified.filter((s: any) =>
          opIds.some((uid: string) => userSkillSet.has(`${uid}:${s.skill_id}`))
        );
        if (coveredButUncertified.length > 0) {
          result.push({
            id: `cert-gap-${m.id}`,
            severity: "warning",
            category: "compliance",
            title: "Missing certifications",
            detail: `Operators on "${m.title}" have skills but lack valid certifications for ${coveredButUncertified.length} requirement${coveredButUncertified.length > 1 ? "s" : ""}.`,
            entityType: "mission",
            entityId: m.id,
            entityName: m.title,
            isRecommendation: false,
            actionLabel: "Review certs",
            actionHref: "/skills",
          });
        }
      }

      // 5. No-Go or failed preflight
      if (m.go_status === "no_go") {
        result.push({
          id: `no-go-${m.id}`,
          severity: "critical",
          category: "readiness",
          title: "Mission is NO-GO",
          detail: `"${m.title}" has been marked NO-GO. Review and resolve blockers before proceeding.`,
          entityType: "mission",
          entityId: m.id,
          entityName: m.title,
          isRecommendation: false,
          actionHref: `/projects/${m.project_id}?tab=readiness`,
        });
      }

      // 6. Missing location for upcoming mission
      const hasDate = !!m.mission_date;
      const hasLocation = (m.latitude && m.longitude) || m.launch_location || proj?.location_name;
      if (hasDate && !hasLocation) {
        result.push({
          id: `no-loc-${m.id}`,
          severity: "warning",
          category: "readiness",
          title: "No location set",
          detail: `Mission "${m.title}" is scheduled but has no launch location or coordinates.`,
          entityType: "mission",
          entityId: m.id,
          entityName: m.title,
          isRecommendation: false,
        });
      }

      // 7. Mission date in past but not completed
      if (m.mission_date && new Date(m.mission_date) < now && m.status !== "in_progress") {
        result.push({
          id: `overdue-${m.id}`,
          severity: "warning",
          category: "risk",
          title: "Past-due mission",
          detail: `"${m.title}" was scheduled for ${m.mission_date} but hasn't been completed or cancelled.`,
          entityType: "mission",
          entityId: m.id,
          entityName: m.title,
          isRecommendation: false,
        });
      }
    }

    // ── Cross-Mission Pattern Detection ──

    // 8. Recurring aborted/partial flights per project
    const flightsByProject = new Map<string, any[]>();
    for (const f of recentFlights as any[]) {
      const arr = flightsByProject.get(f.project_id) || [];
      arr.push(f);
      flightsByProject.set(f.project_id, arr);
    }
    for (const [projId, flights] of flightsByProject) {
      const problematic = flights.filter((f: any) => f.outcome === "aborted" || f.outcome === "partial");
      if (problematic.length >= 3) {
        const projMission = (missions as any[]).find((m: any) => m.project_id === projId);
        const projName = projMission?.projects?.name || "Unknown";
        result.push({
          id: `recurring-abort-${projId}`,
          severity: "warning",
          category: "risk",
          title: "Recurring flight issues",
          detail: `Project "${projName}" has ${problematic.length} aborted or partial flights in recent history. Investigate root cause.`,
          entityType: "project",
          entityId: projId,
          entityName: projName,
          isRecommendation: true,
          actionLabel: "View flights",
          actionHref: `/projects/${projId}?tab=overview`,
        });
      }
    }

    // 9. Unresolved issues linked to upcoming missions
    for (const issue of unresolvedIssues as any[]) {
      if (issue.mission_id) {
        const linkedMission = (missions as any[]).find((m: any) => m.id === issue.mission_id);
        if (linkedMission) {
          result.push({
            id: `issue-blocker-${issue.id}`,
            severity: issue.severity === "critical" ? "critical" : "warning",
            category: "risk",
            title: `Unresolved ${issue.severity} issue`,
            detail: `"${issue.title}" (${issue.category}) is unresolved and linked to upcoming mission "${linkedMission.title}".`,
            entityType: "mission",
            entityId: linkedMission.id,
            entityName: linkedMission.title,
            isRecommendation: false,
            actionLabel: "View issue",
            actionHref: `/flight-logs/${issue.flight_log_id}`,
          });
        }
      }
    }

    // 10. Drone with many unresolved issues
    const issuesByDrone = new Map<string, any[]>();
    for (const issue of unresolvedIssues as any[]) {
      if (issue.drone_model_id) {
        const arr = issuesByDrone.get(issue.drone_model_id) || [];
        arr.push(issue);
        issuesByDrone.set(issue.drone_model_id, arr);
      }
    }
    for (const [droneModelId, issues] of issuesByDrone) {
      if (issues.length >= 2) {
        const droneName = issues[0].drone_models?.name || "Unknown";
        result.push({
          id: `drone-issues-${droneModelId}`,
          severity: issues.some((i: any) => i.severity === "critical") ? "critical" : "warning",
          category: "risk",
          title: `${issues.length} unresolved issues on ${droneName}`,
          detail: `Drone model "${droneName}" has ${issues.length} open issues. Consider grounding until resolved.`,
          entityType: "drone",
          entityId: droneModelId,
          entityName: droneName,
          isRecommendation: true,
          actionLabel: "View drones",
          actionHref: "/drones",
        });
      }
    }

    // 11. Projects with many incomplete deliverables
    const delsByProject = new Map<string, any[]>();
    for (const d of incompleteDeliverables as any[]) {
      const arr = delsByProject.get(d.project_id) || [];
      arr.push(d);
      delsByProject.set(d.project_id, arr);
    }
    for (const [projId, dels] of delsByProject) {
      if (dels.length >= 3) {
        const projName = dels[0].projects?.name || "Unknown";
        result.push({
          id: `dels-backlog-${projId}`,
          severity: "info",
          category: "risk",
          title: `${dels.length} incomplete deliverables`,
          detail: `Project "${projName}" has ${dels.length} deliverables still outstanding. Prioritize capture on next mission.`,
          entityType: "project",
          entityId: projId,
          entityName: projName,
          isRecommendation: true,
          actionLabel: "View deliverables",
          actionHref: `/projects/${projId}?tab=deliverables`,
        });
      }
    }

    // Sort: critical first, then warning, info, suggestion
    const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, suggestion: 3 };
    result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return result;
  }, [missions, allOperators, allMissionDrones, allMissionSkills, allProjectDrones, operatorSkills, operatorCerts, unresolvedIssues, recentFlights, incompleteDeliverables]);

  return {
    insights,
    loading: missionsLoading,
    criticalCount: insights.filter((i) => i.severity === "critical").length,
    warningCount: insights.filter((i) => i.severity === "warning").length,
    totalCount: insights.length,
  };
}

/**
 * Filtered intelligence for a specific project.
 */
export function useProjectIntelligence(projectId: string | undefined) {
  const { insights, loading } = useMissionIntelligence();

  const projectInsights = useMemo(() => {
    if (!projectId) return [];
    return insights.filter((i) =>
      i.entityId === projectId ||
      // Include mission insights for this project via actionHref
      i.actionHref?.includes(`/projects/${projectId}`)
    );
  }, [insights, projectId]);

  return {
    insights: projectInsights,
    loading,
    criticalCount: projectInsights.filter((i) => i.severity === "critical").length,
    warningCount: projectInsights.filter((i) => i.severity === "warning").length,
  };
}

/**
 * Filtered intelligence for a specific mission.
 */
export function useSingleMissionIntelligence(missionId: string | undefined) {
  const { insights, loading } = useMissionIntelligence();

  const missionInsights = useMemo(() => {
    if (!missionId) return [];
    return insights.filter((i) => i.entityId === missionId && i.entityType === "mission");
  }, [insights, missionId]);

  return { insights: missionInsights, loading };
}
