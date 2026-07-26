import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/contexts/OrgContext";

export type Mission = {
  id: string;
  project_id: string;
  organization_id: string;
  title: string;
  status: string;
  objective: string | null;
  mission_date: string | null;
  launch_location: string | null;
  target_area: string | null;
  latitude: number | null;
  longitude: number | null;
  planned_flight_zone: string | null;
  altitude_notes: string | null;
  flight_duration_estimate_min: number | null;
  risk_notes: string | null;
  weather_notes: string | null;
  airspace_notes: string | null;
  readiness_notes: string | null;
  go_status: string;
  preflight_status: string;
  postflight_notes: string | null;
  created_at: string;
  updated_at: string;
  projects?: { id: string; name: string; status: string; location_name: string | null } | null;
};

export function useMissions(projectId?: string) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["missions", orgId, projectId],
    queryFn: async () => {
      let query = supabase
        .from("missions")
        .select("*, projects(id, name, status, location_name)")
        .eq("organization_id", orgId!)
        .order("mission_date", { ascending: false, nullsFirst: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Mission[];
    },
    enabled: !!orgId,
  });
}

export function useMission(missionId: string | undefined) {
  return useQuery({
    queryKey: ["mission", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("*, projects(id, name, status, location_name)")
        .eq("id", missionId!)
        .single();
      if (error) throw error;
      return data as Mission;
    },
    enabled: !!missionId,
  });
}

export function useMissionMutations() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const createMission = useMutation({
    mutationFn: async (values: {
      project_id: string;
      title: string;
      objective?: string;
      mission_date?: string;
      launch_location?: string;
      target_area?: string;
      latitude?: number | null;
      longitude?: number | null;
      planned_flight_zone?: string;
      altitude_notes?: string;
      flight_duration_estimate_min?: number;
      risk_notes?: string;
      weather_notes?: string;
      airspace_notes?: string;
      readiness_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("missions")
        .insert({ ...values, organization_id: orgId!, status: "draft" as any, go_status: "pending" as any, preflight_status: "not_started" as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["map_missions"] });
      qc.invalidateQueries({ queryKey: ["upcoming_missions"] });
      qc.invalidateQueries({ queryKey: ["batch_mission_readiness_missions"] });
    },
  });

  const updateMission = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("missions")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["mission", vars.id] });
      qc.invalidateQueries({ queryKey: ["map_missions"] });
      qc.invalidateQueries({ queryKey: ["upcoming_missions"] });
      qc.invalidateQueries({ queryKey: ["batch_mission_readiness_missions"] });
      qc.invalidateQueries({ queryKey: ["preflight_checklist", vars.id] });
    },
  });

  const deleteMission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["map_missions"] });
      qc.invalidateQueries({ queryKey: ["upcoming_missions"] });
      qc.invalidateQueries({ queryKey: ["batch_mission_readiness_missions"] });
    },
  });

  return { createMission, updateMission, deleteMission };
}

export function useMissionOperators(missionId: string | undefined) {
  const qc = useQueryClient();

  const operators = useQuery({
    queryKey: ["mission_operators", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_operators")
        .select("*, profiles:user_id(id, full_name, avatar_url)")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  const addOperator = useMutation({
    mutationFn: async (values: { mission_id: string; user_id: string; role?: string }) => {
      const { data, error } = await supabase
        .from("mission_operators")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mission_operators", missionId] }),
  });

  const removeOperator = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mission_operators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mission_operators", missionId] }),
  });

  return { operators, addOperator, removeOperator };
}

export function useMissionDroneModels(missionId: string | undefined) {
  const qc = useQueryClient();

  const droneModels = useQuery({
    queryKey: ["mission_drone_models", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_drone_models")
        .select("*, drone_models:drone_model_id(id, name, category)")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  const addDroneModel = useMutation({
    mutationFn: async (values: { mission_id: string; drone_model_id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("mission_drone_models")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mission_drone_models", missionId] }),
  });

  const removeDroneModel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mission_drone_models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mission_drone_models", missionId] }),
  });

  return { droneModels, addDroneModel, removeDroneModel };
}

export function useMissionSkills(missionId: string | undefined) {
  const qc = useQueryClient();

  const skills = useQuery({
    queryKey: ["mission_skills", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_skills")
        .select("*, skills:skill_id(id, name)")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  const addSkill = useMutation({
    mutationFn: async (values: { mission_id: string; skill_id: string }) => {
      const { data, error } = await supabase
        .from("mission_skills")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mission_skills", missionId] }),
  });

  const removeSkill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mission_skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mission_skills", missionId] }),
  });

  return { skills, addSkill, removeSkill };
}
