import { useMemo } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { RiskLevel } from "@/hooks/useInspectionIntelligence";

export type AssetMapItem = {
  id: string;
  name: string;
  model: string;
  status: string;
  conditionScore: number;
  riskLevel: RiskLevel;
  openIssues: number;
  criticalIssues: number;
  totalFlights: number;
  lastFlightDate: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: "flight" | "mission" | "project" | null;
  locationLabel: string | null;
  recentIssues: { title: string; severity: string; category: string; status: string; date: string }[];
};

export type AssetMapFilters = {
  riskLevels: RiskLevel[];
  droneStatuses: string[];
  projectIds: string[];
};

const SEVERITY_WEIGHTS: Record<string, number> = { critical: 25, high: 15, medium: 8, low: 3 };
const STATUS_MULT: Record<string, number> = { open: 1.0, investigating: 0.8, resolved: 0.2, dismissed: 0.0 };

function calcScore(issues: any[]): number {
  if (!issues.length) return 100;
  let penalty = 0;
  for (const i of issues) {
    penalty += (SEVERITY_WEIGHTS[i.severity] ?? 5) * (STATUS_MULT[i.resolution_status] ?? 0.5);
  }
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function riskLevel(score: number, critOpen: number): RiskLevel {
  if (critOpen > 0 || score < 30) return "critical";
  if (score < 55) return "high";
  if (score < 75) return "moderate";
  return "low";
}

export function useMapAssets(filters: AssetMapFilters) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["map_assets", orgId],
    queryFn: async () => {
      // Fetch drones, their recent flight logs (for location), and postflight issues
      const [dronesRes, flightsRes, issuesRes] = await Promise.all([
        supabase
          .from("drones")
          .select("id, name, model, status")
          .eq("organization_id", orgId!)
          .limit(500),
        supabase
          .from("flight_logs")
          .select("id, drone_id, flight_date, launch_location, mission_id, missions(latitude, longitude, launch_location, title, projects(id, name, latitude, longitude, location_name))")
          .eq("organization_id", orgId!)
          .order("flight_date", { ascending: false })
          .limit(1000),
        supabase
          .from("postflight_issues")
          .select("id, title, severity, category, resolution_status, created_at, flight_logs!inner(drone_id)")
          .eq("organization_id", orgId!)
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      if (dronesRes.error) throw dronesRes.error;
      if (flightsRes.error) throw flightsRes.error;
      if (issuesRes.error) throw issuesRes.error;

      const drones = dronesRes.data || [];
      const flights = flightsRes.data || [];
      const issues = issuesRes.data || [];

      // Group flights by drone (most recent first)
      const flightsByDrone: Record<string, any[]> = {};
      for (const f of flights) {
        if (f.drone_id) {
          (flightsByDrone[f.drone_id] ??= []).push(f);
        }
      }

      // Group issues by drone
      const issuesByDrone: Record<string, any[]> = {};
      for (const i of issues) {
        const droneId = (i.flight_logs as any)?.drone_id;
        if (droneId) (issuesByDrone[droneId] ??= []).push(i);
      }

      return drones.map((drone): AssetMapItem => {
        const droneFlights = flightsByDrone[drone.id] || [];
        const droneIssues = issuesByDrone[drone.id] || [];
        const openIssues = droneIssues.filter((i) => i.resolution_status === "open" || i.resolution_status === "investigating");
        const criticalOpen = openIssues.filter((i) => i.severity === "critical");
        const score = calcScore(droneIssues);

        // Determine location from most recent flight's mission or project
        let lat: number | null = null;
        let lng: number | null = null;
        let locationSource: AssetMapItem["locationSource"] = null;
        let locationLabel: string | null = null;

        for (const f of droneFlights) {
          const m = f.missions as any;
          if (m?.latitude && m?.longitude) {
            lat = m.latitude;
            lng = m.longitude;
            locationSource = "mission";
            locationLabel = m.launch_location || m.title;
            break;
          }
          if (m?.projects?.latitude && m?.projects?.longitude) {
            lat = m.projects.latitude;
            lng = m.projects.longitude;
            locationSource = "project";
            locationLabel = m.projects.location_name || m.projects.name;
            break;
          }
        }

        return {
          id: drone.id,
          name: drone.name,
          model: drone.model,
          status: drone.status,
          conditionScore: score,
          riskLevel: riskLevel(score, criticalOpen.length),
          openIssues: openIssues.length,
          criticalIssues: criticalOpen.length,
          totalFlights: droneFlights.length,
          lastFlightDate: droneFlights[0]?.flight_date || null,
          latitude: lat,
          longitude: lng,
          locationSource,
          locationLabel,
          recentIssues: droneIssues.slice(0, 10).map((i) => ({
            title: i.title,
            severity: i.severity,
            category: i.category,
            status: i.resolution_status,
            date: i.created_at,
          })),
        };
      });
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  // Derive project options from flight data
  const projectOptions = useMemo(() => {
    // We don't have direct project associations for filtering, skip for now
    return [] as { id: string; name: string }[];
  }, []);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(a.riskLevel)) return false;
      if (filters.droneStatuses.length > 0 && !filters.droneStatuses.includes(a.status)) return false;
      return true;
    });
  }, [assets, filters]);

  const locatedAssets = useMemo(() => filtered.filter((a) => a.latitude && a.longitude), [filtered]);
  const unlocatedAssets = useMemo(() => filtered.filter((a) => !a.latitude || !a.longitude), [filtered]);

  return { assets: filtered, locatedAssets, unlocatedAssets, isLoading, projectOptions };
}
