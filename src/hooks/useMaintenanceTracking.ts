import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useMemo } from "react";

export interface MaintenanceStatus {
  droneId: string;
  droneName: string;
  hoursSinceMaintenance: number;
  missionsSinceMaintenance: number;
  intervalHours: number | null;
  intervalMissions: number | null;
  hoursProgress: number | null;
  missionsProgress: number | null;
  status: "ok" | "approaching" | "due" | "overdue";
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
}

/** Fetch flight logs grouped by drone for maintenance calculations — limited */
function useFlightLogsByDrone() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["maintenance_flight_logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, mission_id, drone_model_id, flight_date, flight_hours_contribution")
        .eq("organization_id", orgId!)
        .order("flight_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

/** Fetch drones with maintenance columns */
function useOrgDronesWithMaintenance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["org_drones_maintenance", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drones")
        .select("id, name, status, flight_hours, next_maintenance, drone_model_id, maintenance_interval_hours, maintenance_interval_missions, last_maintenance_date, last_maintenance_flight_hours, last_maintenance_missions")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

function deriveStatus(hoursProgress: number | null, missionsProgress: number | null): MaintenanceStatus["status"] {
  const maxProgress = Math.max(hoursProgress ?? 0, missionsProgress ?? 0);
  if (maxProgress >= 1) return "overdue";
  if (maxProgress >= 0.9) return "due";
  if (maxProgress >= 0.75) return "approaching";
  return "ok";
}

export function useMaintenanceTracking() {
  const { data: drones = [], isLoading: dronesLoading } = useOrgDronesWithMaintenance();
  const { data: logs = [], isLoading: logsLoading } = useFlightLogsByDrone();

  const statuses = useMemo(() => {
    if (drones.length === 0) return [];

    const logsByModel = new Map<string, { totalHours: number; missionIds: Set<string>; logsByDate: { date: string; hours: number; missionId: string | null }[] }>();
    for (const log of logs) {
      if (!log.drone_model_id) continue;
      if (!logsByModel.has(log.drone_model_id)) {
        logsByModel.set(log.drone_model_id, { totalHours: 0, missionIds: new Set(), logsByDate: [] });
      }
      const entry = logsByModel.get(log.drone_model_id)!;
      const hours = Number(log.flight_hours_contribution) || 0;
      entry.totalHours += hours;
      if (log.mission_id) entry.missionIds.add(log.mission_id);
      entry.logsByDate.push({ date: log.flight_date, hours, missionId: log.mission_id });
    }

    return drones.map((drone): MaintenanceStatus => {
      const modelLogs = drone.drone_model_id ? logsByModel.get(drone.drone_model_id) : null;
      const lastMaintDate = (drone as any).last_maintenance_date as string | null;
      const lastMaintHours = Number((drone as any).last_maintenance_flight_hours) || 0;
      const lastMaintMissions = Number((drone as any).last_maintenance_missions) || 0;
      const intervalHours = (drone as any).maintenance_interval_hours != null ? Number((drone as any).maintenance_interval_hours) : null;
      const intervalMissions = (drone as any).maintenance_interval_missions != null ? Number((drone as any).maintenance_interval_missions) : null;

      let hoursSince = 0;
      let missionsSince = 0;

      if (modelLogs) {
        if (lastMaintDate) {
          const missionIds = new Set<string>();
          for (const l of modelLogs.logsByDate) {
            if (l.date > lastMaintDate) {
              hoursSince += l.hours;
              if (l.missionId) missionIds.add(l.missionId);
            }
          }
          missionsSince = missionIds.size;
        } else {
          hoursSince = modelLogs.totalHours - lastMaintHours;
          missionsSince = modelLogs.missionIds.size - lastMaintMissions;
        }
      }

      hoursSince = Math.max(0, hoursSince);
      missionsSince = Math.max(0, missionsSince);

      const hoursProgress = intervalHours && intervalHours > 0 ? hoursSince / intervalHours : null;
      const missionsProgress = intervalMissions && intervalMissions > 0 ? missionsSince / intervalMissions : null;

      return {
        droneId: drone.id,
        droneName: drone.name,
        hoursSinceMaintenance: hoursSince,
        missionsSinceMaintenance: missionsSince,
        intervalHours,
        intervalMissions,
        hoursProgress,
        missionsProgress,
        status: (intervalHours || intervalMissions) ? deriveStatus(hoursProgress, missionsProgress) : "ok",
        lastMaintenanceDate: lastMaintDate,
        nextMaintenanceDate: drone.next_maintenance,
      };
    });
  }, [drones, logs]);

  const isLoading = dronesLoading || logsLoading;

  const counts = useMemo(() => ({
    total: statuses.length,
    overdue: statuses.filter(s => s.status === "overdue").length,
    due: statuses.filter(s => s.status === "due").length,
    approaching: statuses.filter(s => s.status === "approaching").length,
    ok: statuses.filter(s => s.status === "ok").length,
    withIntervals: statuses.filter(s => s.intervalHours || s.intervalMissions).length,
  }), [statuses]);

  return { statuses, isLoading, counts };
}

/** Get maintenance status for a single drone */
export function useDroneMaintenanceStatus(droneId: string | undefined) {
  const { statuses, isLoading } = useMaintenanceTracking();
  const status = useMemo(() => statuses.find(s => s.droneId === droneId) || null, [statuses, droneId]);
  return { status, isLoading };
}

/** Record maintenance completion for a drone */
export function useRecordMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ droneId, notes }: { droneId: string; notes?: string }) => {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase
        .from("drones")
        .update({
          last_maintenance_date: today,
          last_maintenance_flight_hours: 0,
          last_maintenance_missions: 0,
          next_maintenance: null,
          status: "available",
        } as any)
        .eq("id", droneId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_drones_maintenance"] });
      qc.invalidateQueries({ queryKey: ["org_drones"] });
      qc.invalidateQueries({ queryKey: ["alerts_drones"] });
      qc.invalidateQueries({ queryKey: ["dash_drones"] });
    },
  });
}

/** Update maintenance intervals for a drone */
export function useUpdateMaintenanceIntervals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ droneId, intervalHours, intervalMissions }: { droneId: string; intervalHours: number | null; intervalMissions: number | null }) => {
      const { error } = await supabase
        .from("drones")
        .update({
          maintenance_interval_hours: intervalHours,
          maintenance_interval_missions: intervalMissions,
        } as any)
        .eq("id", droneId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_drones_maintenance"] });
      qc.invalidateQueries({ queryKey: ["org_drones"] });
    },
  });
}
