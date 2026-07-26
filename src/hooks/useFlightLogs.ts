import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useFlightLogs() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["flight_logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select(
          "id, title, flight_date, outcome, duration_minutes, pilot_id, drone_model_id, mission_id, project_id, organization_id, preflight_completed, launch_location, objective, created_at, projects(id, name), missions(id, title), drone_models(id, name, drone_manufacturers(name)), profiles!flight_logs_pilot_id_fkey(id, full_name)"
        )
        .eq("organization_id", orgId!)
        .order("flight_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useFlightLog(id: string | undefined) {
  return useQuery({
    queryKey: ["flight_log", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select(
          "*, projects(id, name), missions(id, title, status, go_status), drone_models(id, name, drone_manufacturers(name)), profiles!flight_logs_pilot_id_fkey(id, full_name)"
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useFlightCrew(flightLogId: string | undefined) {
  return useQuery({
    queryKey: ["flight_crew", flightLogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_crew")
        .select("*, profiles:user_id(id, full_name)")
        .eq("flight_log_id", flightLogId!);
      if (error) throw error;
      return data;
    },
    enabled: !!flightLogId,
  });
}

export function useCreateFlightLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: Record<string, any>) => {
      const { data, error } = await supabase
        .from("flight_logs")
        .insert(log as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flight_logs"] });
      qc.invalidateQueries({ queryKey: ["flight_log"] });
      qc.invalidateQueries({ queryKey: ["project_flight_logs"] });
      qc.invalidateQueries({ queryKey: ["upcoming_missions_flight_logs"] });
      qc.invalidateQueries({ queryKey: ["dash_cmd_flight_logs"] });
    },
  });
}

export function useUpdateFlightLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("flight_logs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["flight_logs"] });
      qc.invalidateQueries({ queryKey: ["flight_log", data.id] });
      qc.invalidateQueries({ queryKey: ["project_flight_logs"] });
      qc.invalidateQueries({ queryKey: ["upcoming_missions_flight_logs"] });
      qc.invalidateQueries({ queryKey: ["dash_cmd_flight_logs"] });
    },
  });
}

export function useDeleteFlightLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("flight_logs")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flight_logs"] });
      qc.invalidateQueries({ queryKey: ["flight_log"] });
      qc.invalidateQueries({ queryKey: ["project_flight_logs"] });
      qc.invalidateQueries({ queryKey: ["upcoming_missions_flight_logs"] });
      qc.invalidateQueries({ queryKey: ["dash_cmd_flight_logs"] });
    },
  });
}
