import { useMemo } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ProjectWithLocation, MapFilters } from "./mapTypes";

export function useMapProjects(filters: MapFilters) {
  const { currentOrg } = useOrg();

  const { data: projects = [] } = useQuery({
    queryKey: ["map_projects", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, latitude, longitude, flight_radius_m, flight_altitude_m, location_name, start_date, end_date, client_id, clients(name)")
        .eq("organization_id", currentOrg!.id)
        .order("name")
        .limit(500);
      if (error) throw error;
      return (data || []) as ProjectWithLocation[];
    },
    enabled: !!currentOrg,
    staleTime: 60_000,
  });

  // Unique clients for filter options
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => {
      if (p.client_id && p.clients?.name) map.set(p.client_id, p.clients.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
      if (filters.clientIds.length > 0 && (!p.client_id || !filters.clientIds.includes(p.client_id))) return false;
      if (filters.dateFrom && (!p.start_date || p.start_date < filters.dateFrom)) return false;
      if (filters.dateTo && (!p.start_date || p.start_date > filters.dateTo)) return false;
      return true;
    });
  }, [projects, filters]);

  const locatedProjects = useMemo(() => filteredProjects.filter((p) => p.latitude && p.longitude), [filteredProjects]);
  const unlocatedProjects = useMemo(() => filteredProjects.filter((p) => !p.latitude || !p.longitude), [filteredProjects]);

  return { projects: filteredProjects, locatedProjects, unlocatedProjects, clientOptions };
}
