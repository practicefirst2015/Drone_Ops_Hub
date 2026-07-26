import { useMemo } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MissionMapItem, MissionMapFilters } from "./mapTypes";

export function useMapMissions(filters: MissionMapFilters) {
  const { currentOrg } = useOrg();

  const { data: missions = [] } = useQuery({
    queryKey: ["map_missions", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("id, title, status, mission_date, latitude, longitude, launch_location, target_area, planned_flight_zone, go_status, preflight_status, objective, altitude_notes, flight_duration_estimate_min, risk_notes, weather_notes, airspace_notes, readiness_notes, postflight_notes, project_id, projects(id, name, status, latitude, longitude, location_name, flight_radius_m)")
        .eq("organization_id", currentOrg!.id)
        .order("mission_date", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as MissionMapItem[];
    },
    enabled: !!currentOrg,
    staleTime: 60_000,
  });

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    missions.forEach((m) => {
      if (m.project_id && m.projects?.name) map.set(m.project_id, m.projects.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [missions]);

  const filtered = useMemo(() => {
    return missions.filter((m) => {
      if (filters.missionStatuses.length > 0 && !filters.missionStatuses.includes(m.status)) return false;
      if (filters.projectIds.length > 0 && !filters.projectIds.includes(m.project_id)) return false;
      if (filters.dateFrom && (!m.mission_date || m.mission_date < filters.dateFrom)) return false;
      if (filters.dateTo && (!m.mission_date || m.mission_date > filters.dateTo)) return false;
      if (filters.goStatus && m.go_status !== filters.goStatus) return false;
      return true;
    });
  }, [missions, filters]);

  const locatedMissions = useMemo(() => filtered.filter((m) => m.latitude && m.longitude), [filtered]);
  const projectLocatedMissions = useMemo(
    () => filtered.filter((m) => !m.latitude && !m.longitude && m.projects?.latitude && m.projects?.longitude),
    [filtered]
  );

  return { missions: filtered, locatedMissions, projectLocatedMissions, projectOptions };
}
