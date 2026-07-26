import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useMemo } from "react";

/** Raw flight log data for utilization calculations — limited to last 500 logs */
export function useFlightLogStats() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["flight_log_stats", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, pilot_id, drone_model_id, mission_id, flight_date, duration_minutes, flight_hours_contribution, outcome")
        .eq("organization_id", orgId!)
        .order("flight_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 120_000, // 2 min — utilization data is not time-critical
  });
}

export interface PilotUtilization {
  userId: string;
  totalFlightHours: number;
  totalFlights: number;
  missionsFlown: number;
  completedFlights: number;
  last30DaysFlights: number;
  last30DaysHours: number;
}

export interface DroneUtilization {
  droneModelId: string;
  totalFlightHours: number;
  totalFlights: number;
  missionsFlown: number;
  completedFlights: number;
  last30DaysFlights: number;
  last30DaysHours: number;
}

/** Aggregated pilot utilization from flight logs */
export function usePilotUtilization() {
  const { data: logs = [], isLoading } = useFlightLogStats();

  const pilots = useMemo(() => {
    if (logs.length === 0) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const map = new Map<string, PilotUtilization>();
    for (const log of logs) {
      const existing = map.get(log.pilot_id) || {
        userId: log.pilot_id,
        totalFlightHours: 0,
        totalFlights: 0,
        missionsFlown: 0,
        completedFlights: 0,
        last30DaysFlights: 0,
        last30DaysHours: 0,
      };
      const hours = Number(log.flight_hours_contribution) || 0;
      existing.totalFlightHours += hours;
      existing.totalFlights += 1;
      if (log.outcome === "completed") existing.completedFlights += 1;

      if (new Date(log.flight_date) >= thirtyDaysAgo) {
        existing.last30DaysFlights += 1;
        existing.last30DaysHours += hours;
      }

      map.set(log.pilot_id, existing);
    }

    // Count unique missions per pilot
    const pilotMissions = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!log.mission_id) continue;
      if (!pilotMissions.has(log.pilot_id)) pilotMissions.set(log.pilot_id, new Set());
      pilotMissions.get(log.pilot_id)!.add(log.mission_id);
    }
    for (const [pid, missions] of pilotMissions) {
      const p = map.get(pid);
      if (p) p.missionsFlown = missions.size;
    }

    return Array.from(map.values()).sort((a, b) => b.totalFlightHours - a.totalFlightHours);
  }, [logs]);

  return { pilots, isLoading, hasData: logs.length > 0 };
}

/** Aggregated drone model utilization from flight logs */
export function useDroneUtilization() {
  const { data: logs = [], isLoading } = useFlightLogStats();

  const drones = useMemo(() => {
    if (logs.length === 0) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const map = new Map<string, DroneUtilization>();
    for (const log of logs) {
      if (!log.drone_model_id) continue;
      const existing = map.get(log.drone_model_id) || {
        droneModelId: log.drone_model_id,
        totalFlightHours: 0,
        totalFlights: 0,
        missionsFlown: 0,
        completedFlights: 0,
        last30DaysFlights: 0,
        last30DaysHours: 0,
      };
      const hours = Number(log.flight_hours_contribution) || 0;
      existing.totalFlightHours += hours;
      existing.totalFlights += 1;
      if (log.outcome === "completed") existing.completedFlights += 1;

      if (new Date(log.flight_date) >= thirtyDaysAgo) {
        existing.last30DaysFlights += 1;
        existing.last30DaysHours += hours;
      }

      map.set(log.drone_model_id, existing);
    }

    // Count unique missions per drone
    const droneMissions = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!log.drone_model_id || !log.mission_id) continue;
      if (!droneMissions.has(log.drone_model_id)) droneMissions.set(log.drone_model_id, new Set());
      droneMissions.get(log.drone_model_id)!.add(log.mission_id);
    }
    for (const [did, missions] of droneMissions) {
      const d = map.get(did);
      if (d) d.missionsFlown = missions.size;
    }

    return Array.from(map.values()).sort((a, b) => b.totalFlightHours - a.totalFlightHours);
  }, [logs]);

  return { drones, isLoading, hasData: logs.length > 0 };
}

/** Get utilization for a single pilot */
export function usePilotStats(userId: string | undefined) {
  const { pilots, isLoading, hasData } = usePilotUtilization();
  const stats = useMemo(() => pilots.find(p => p.userId === userId) || null, [pilots, userId]);
  return { stats, isLoading, hasData };
}

/** Get utilization for a single drone model */
export function useDroneModelStats(droneModelId: string | undefined) {
  const { drones, isLoading, hasData } = useDroneUtilization();
  const stats = useMemo(() => drones.find(d => d.droneModelId === droneModelId) || null, [drones, droneModelId]);
  return { stats, isLoading, hasData };
}
