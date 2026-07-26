import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

/* ─── Batteries ─── */

export function useBatteries(droneId?: string) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["batteries", orgId, droneId],
    queryFn: async () => {
      let query = supabase
        .from("batteries")
        .select("*")
        .eq("organization_id", orgId!)
        .order("name");
      if (droneId) query = query.eq("drone_id", droneId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateBattery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (battery: Record<string, any>) => {
      const { data, error } = await supabase
        .from("batteries")
        .insert(battery as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batteries"] });
    },
  });
}

export function useUpdateBattery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("batteries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batteries"] });
    },
  });
}

export function useDeleteBattery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("batteries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batteries"] });
    },
  });
}

/* ─── Maintenance Events ─── */

export function useMaintenanceEvents(droneId?: string) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["maintenance_events", orgId, droneId],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_events")
        .select("*, profiles:performed_by(id, full_name)")
        .eq("organization_id", orgId!)
        .order("performed_at", { ascending: false });
      if (droneId) query = query.eq("drone_id", droneId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateMaintenanceEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: Record<string, any>) => {
      const { data, error } = await supabase
        .from("maintenance_events")
        .insert(event as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance_events"] });
      qc.invalidateQueries({ queryKey: ["org_drones_maintenance"] });
      qc.invalidateQueries({ queryKey: ["org_drones"] });
    },
  });
}

/* ─── Mission Drones (specific unit assignment) ─── */

export function useMissionDrones(missionId: string | undefined) {
  const qc = useQueryClient();

  const drones = useQuery({
    queryKey: ["mission_drones", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_drones")
        .select("*, drones(id, name, model, status, serial_number, drone_model_id, drone_models:drone_model_id(id, name))")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  const addDrone = useMutation({
    mutationFn: async (values: { mission_id: string; drone_id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("mission_drones")
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mission_drones", missionId] }),
  });

  const removeDrone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mission_drones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mission_drones", missionId] }),
  });

  return { drones, addDrone, removeDrone };
}

/* ─── Fleet Statistics ─── */

export function useFleetStats() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const { data: drones = [], isLoading: dronesLoading } = useQuery({
    queryKey: ["fleet_stats_drones", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drones")
        .select("id, name, status, flight_hours, next_maintenance, drone_model_id, acquisition_date, drone_models:drone_model_id(name)")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const { data: batteries = [], isLoading: batteriesLoading } = useQuery({
    queryKey: ["fleet_stats_batteries", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batteries")
        .select("id, status, drone_id, health_percent")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const stats = {
    totalDrones: drones.length,
    available: drones.filter((d: any) => d.status === "available").length,
    assigned: drones.filter((d: any) => d.status === "assigned" || d.status === "in_flight").length,
    inMaintenance: drones.filter((d: any) => d.status === "maintenance").length,
    retired: drones.filter((d: any) => d.status === "retired").length,
    totalBatteries: batteries.length,
    availableBatteries: batteries.filter((b: any) => b.status === "available").length,
    assignedBatteries: batteries.filter((b: any) => b.drone_id != null).length,
    lowHealthBatteries: batteries.filter((b: any) => (b.health_percent ?? 100) < 50).length,
    totalFlightHours: drones.reduce((s: number, d: any) => s + Number(d.flight_hours || 0), 0),
    maintenanceDue: drones.filter((d: any) => {
      if (!d.next_maintenance) return false;
      return new Date(d.next_maintenance) <= new Date(Date.now() + 14 * 86400000);
    }).length,
    drones,
    batteries,
  };

  return { stats, isLoading: dronesLoading || batteriesLoading };
}

/* ─── Drone Flight History ─── */

export function useDroneFlightHistory(droneId: string | undefined) {
  return useQuery({
    queryKey: ["drone_flight_history", droneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, title, flight_date, outcome, duration_minutes, mission_id, project_id, projects(name), missions(title), profiles!flight_logs_pilot_id_fkey(full_name)")
        .eq("drone_id", droneId!)
        .order("flight_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!droneId,
  });
}
