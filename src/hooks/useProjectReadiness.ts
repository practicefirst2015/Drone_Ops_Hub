import { useMemo } from "react";
import { useProjectSkills, useProjectMembers, useProjectDrones } from "@/hooks/useProjectData";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface ReadinessDimension {
  key: string;
  label: string;
  status: "ready" | "needs_review" | "blocked";
  detail: string;
}

export interface ProjectReadinessResult {
  overall: "ready" | "needs_review" | "blocked";
  score: number; // 0-100
  dimensions: ReadinessDimension[];
  loading: boolean;
}

/**
 * Computes multi-dimensional readiness for a single project.
 * Dimensions: staff, skills, certifications, drones, budget, location
 */
export function useProjectReadiness(projectId: string | undefined, project?: any): ProjectReadinessResult {
  const { currentOrg } = useOrg();
  const { skills: projectSkills } = useProjectSkills(projectId);
  const { members: projectMembers } = useProjectMembers(projectId);
  const { drones: projectDrones } = useProjectDrones(projectId);

  const memberIds = useMemo(
    () => (projectMembers.data || []).map((m: any) => m.user_id),
    [projectMembers.data]
  );

  const { data: userSkills = [] } = useQuery({
    queryKey: ["readiness_user_skills", projectId, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("user_skills")
        .select("user_id, skill_id")
        .eq("organization_id", currentOrg!.id)
        .in("user_id", memberIds);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg && memberIds.length > 0 && !!projectId,
  });

  const { data: certs = [] } = useQuery({
    queryKey: ["readiness_certs", projectId, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("certifications")
        .select("user_id, skill_id, status, expiry_date")
        .eq("organization_id", currentOrg!.id)
        .in("user_id", memberIds)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg && memberIds.length > 0 && !!projectId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["readiness_invoices", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, status, amount")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const loading = projectSkills.isLoading || projectMembers.isLoading || projectDrones.isLoading;

  const result = useMemo((): Omit<ProjectReadinessResult, "loading"> => {
    const dimensions: ReadinessDimension[] = [];
    const reqSkills = projectSkills.data || [];
    const members = projectMembers.data || [];
    const drones = projectDrones.data || [];

    // 1. Staff
    if (members.length >= 2) {
      dimensions.push({ key: "staff", label: "Team", status: "ready", detail: `${members.length} members assigned` });
    } else if (members.length === 1) {
      dimensions.push({ key: "staff", label: "Team", status: "needs_review", detail: "Only 1 member assigned" });
    } else {
      dimensions.push({ key: "staff", label: "Team", status: "blocked", detail: "No team members assigned" });
    }

    // 2. Skills coverage
    if (reqSkills.length === 0) {
      dimensions.push({ key: "skills", label: "Skills", status: "needs_review", detail: "No required skills defined" });
    } else {
      const userSkillSet = new Set(userSkills.map((us) => `${us.user_id}:${us.skill_id}`));
      const coveredCount = reqSkills.filter((rs: any) =>
        memberIds.some((uid) => userSkillSet.has(`${uid}:${rs.skill_id}`))
      ).length;

      if (coveredCount === reqSkills.length) {
        dimensions.push({ key: "skills", label: "Skills", status: "ready", detail: `${coveredCount}/${reqSkills.length} skills covered` });
      } else if (coveredCount > 0) {
        dimensions.push({ key: "skills", label: "Skills", status: "needs_review", detail: `${coveredCount}/${reqSkills.length} skills covered` });
      } else {
        dimensions.push({ key: "skills", label: "Skills", status: "blocked", detail: `0/${reqSkills.length} skills covered` });
      }
    }

    // 3. Certifications
    if (reqSkills.length === 0) {
      dimensions.push({ key: "certs", label: "Certifications", status: "needs_review", detail: "No requirements to verify" });
    } else {
      const now = new Date();
      const validCertSet = new Set(
        certs
          .filter((c) => !c.expiry_date || new Date(c.expiry_date) > now)
          .map((c) => `${c.user_id}:${c.skill_id}`)
      );
      const certifiedCount = reqSkills.filter((rs: any) =>
        memberIds.some((uid) => validCertSet.has(`${uid}:${rs.skill_id}`))
      ).length;
      const expiredCount = certs.filter((c) => c.expiry_date && new Date(c.expiry_date) <= now).length;

      if (certifiedCount === reqSkills.length) {
        dimensions.push({ key: "certs", label: "Certifications", status: "ready", detail: `${certifiedCount}/${reqSkills.length} certified` });
      } else if (expiredCount > 0) {
        dimensions.push({ key: "certs", label: "Certifications", status: "blocked", detail: `${expiredCount} expired cert${expiredCount > 1 ? "s" : ""}` });
      } else if (certifiedCount > 0) {
        dimensions.push({ key: "certs", label: "Certifications", status: "needs_review", detail: `${certifiedCount}/${reqSkills.length} certified` });
      } else {
        dimensions.push({ key: "certs", label: "Certifications", status: "needs_review", detail: "No certifications on file" });
      }
    }

    // 4. Drones
    if (drones.length > 0) {
      dimensions.push({ key: "drones", label: "Drones", status: "ready", detail: `${drones.length} drone${drones.length > 1 ? "s" : ""} assigned` });
    } else {
      dimensions.push({ key: "drones", label: "Drones", status: "needs_review", detail: "No drones assigned" });
    }

    // 5. Budget / Invoices
    const hasBudget = project?.budget && Number(project.budget) > 0;
    const hasInvoices = invoices.length > 0;
    if (hasBudget && hasInvoices) {
      dimensions.push({ key: "budget", label: "Budget", status: "ready", detail: `$${Number(project.budget).toLocaleString()} budgeted, ${invoices.length} invoice${invoices.length > 1 ? "s" : ""}` });
    } else if (hasBudget || hasInvoices) {
      dimensions.push({ key: "budget", label: "Budget", status: "needs_review", detail: hasBudget ? "Budget set, no invoices" : "Invoices exist, no budget set" });
    } else {
      dimensions.push({ key: "budget", label: "Budget", status: "needs_review", detail: "No budget or invoices" });
    }

    // 6. Location
    const hasLocation = project?.latitude && project?.longitude;
    const hasLocationName = !!project?.location_name;
    if (hasLocation && hasLocationName) {
      dimensions.push({ key: "location", label: "Location", status: "ready", detail: project.location_name });
    } else if (hasLocation || hasLocationName) {
      dimensions.push({ key: "location", label: "Location", status: "needs_review", detail: hasLocationName ? "Name set, no coordinates" : "Coordinates set, no name" });
    } else {
      dimensions.push({ key: "location", label: "Location", status: "needs_review", detail: "No location set" });
    }

    // Compute overall
    const hasBlocked = dimensions.some((d) => d.status === "blocked");
    const hasReview = dimensions.some((d) => d.status === "needs_review");
    const readyCount = dimensions.filter((d) => d.status === "ready").length;
    const score = Math.round((readyCount / dimensions.length) * 100);
    const overall: "ready" | "needs_review" | "blocked" = hasBlocked ? "blocked" : hasReview ? "needs_review" : "ready";

    return { overall, score, dimensions };
  }, [projectSkills.data, projectMembers.data, projectDrones.data, userSkills, certs, invoices, project, memberIds]);

  return { ...result, loading };
}

/**
 * Lightweight batch readiness computation for dashboard/list views.
 * Uses pre-fetched data instead of per-project queries.
 */
export interface BatchReadinessItem {
  projectId: string;
  name: string;
  overall: "ready" | "needs_review" | "blocked";
  score: number;
  missing: string[];
}

export function useBatchProjectReadiness() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const { data: projects = [] } = useQuery({
    queryKey: ["batch_readiness_projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, budget, latitude, longitude, location_name")
        .eq("organization_id", orgId!)
        .in("status", ["active", "pending", "draft"]);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  const { data: allProjectSkills = [] } = useQuery({
    queryKey: ["batch_readiness_skills", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase.from("project_skills").select("project_id, skill_id").in("project_id", projectIds);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  const { data: allProjectMembers = [] } = useQuery({
    queryKey: ["batch_readiness_members", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase.from("project_members").select("project_id, user_id").in("project_id", projectIds);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  const { data: allProjectDrones = [] } = useQuery({
    queryKey: ["batch_readiness_drones", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase.from("project_drones").select("project_id, drone_id").in("project_id", projectIds);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  const allMemberIds = useMemo(() => [...new Set(allProjectMembers.map((m) => m.user_id))], [allProjectMembers]);

  const { data: allUserSkills = [] } = useQuery({
    queryKey: ["batch_readiness_user_skills", allMemberIds],
    queryFn: async () => {
      if (allMemberIds.length === 0) return [];
      const { data, error } = await supabase.from("user_skills").select("user_id, skill_id").in("user_id", allMemberIds);
      if (error) throw error;
      return data;
    },
    enabled: allMemberIds.length > 0,
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["batch_readiness_invoices", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase.from("invoices").select("project_id, id").in("project_id", projectIds);
      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  const analysis = useMemo((): BatchReadinessItem[] => {
    const userSkillSet = new Set(allUserSkills.map((us) => `${us.user_id}:${us.skill_id}`));

    return projects.map((project) => {
      const reqSkills = allProjectSkills.filter((ps) => ps.project_id === project.id);
      const members = allProjectMembers.filter((pm) => pm.project_id === project.id);
      const drones = allProjectDrones.filter((pd) => pd.project_id === project.id);
      const invoices = allInvoices.filter((i) => i.project_id === project.id);
      const memberUserIds = members.map((m) => m.user_id);

      const missing: string[] = [];
      let readyCount = 0;
      let total = 6;

      // Staff
      if (members.length >= 2) readyCount++;
      else if (members.length === 0) missing.push("No team");

      // Skills
      if (reqSkills.length === 0) {
        // no requirements = ambiguous, don't count as ready or blocked
      } else {
        const covered = reqSkills.filter((rs) =>
          memberUserIds.some((uid) => userSkillSet.has(`${uid}:${rs.skill_id}`))
        ).length;
        if (covered === reqSkills.length) readyCount++;
        else missing.push(`${reqSkills.length - covered} skill gap${reqSkills.length - covered > 1 ? "s" : ""}`);
      }

      // Certs - simplified for batch
      readyCount += 0; // skip cert deep check in batch for performance

      // Drones
      if (drones.length > 0) readyCount++;
      else missing.push("No drones");

      // Budget
      if (project.budget && Number(project.budget) > 0 && invoices.length > 0) readyCount++;
      else if (!project.budget) missing.push("No budget");

      // Location
      if (project.latitude && project.longitude && project.location_name) readyCount++;
      else if (!project.location_name) missing.push("No location");

      // Adjust total for cert (excluded) and undefined skills
      total = 5; // staff + skills + drones + budget + location
      const score = Math.round((readyCount / total) * 100);
      const hasBlocked = members.length === 0 || (reqSkills.length > 0 && missing.some((m) => m.includes("skill")));
      const overall: "ready" | "needs_review" | "blocked" =
        score === 100 ? "ready" : hasBlocked ? "blocked" : "needs_review";

      return { projectId: project.id, name: project.name, overall, score, missing };
    });
  }, [projects, allProjectSkills, allProjectMembers, allProjectDrones, allUserSkills, allInvoices]);

  return { analysis, loading: projects.length === 0 };
}
