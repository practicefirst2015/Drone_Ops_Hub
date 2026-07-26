export type ProjectWithLocation = {
  id: string;
  name: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  flight_radius_m: number | null;
  flight_altitude_m: number | null;
  location_name: string | null;
  start_date: string | null;
  end_date: string | null;
  client_id: string | null;
  clients?: { name: string } | null;
};

export type MapLayers = {
  projectPins: boolean;
  flightAreas: boolean;
  missionPins: boolean;
  missionFlightZones: boolean;
};

/**
 * Tracks which advisory overlays are enabled.
 * Keys correspond to AdvisoryLayerDef.key in mapConstants.
 */
export type AdvisoryLayerState = Record<string, boolean>;

export type MapFilters = {
  statuses: string[];
  clientIds: string[];
  dateFrom: string;
  dateTo: string;
};

export type MissionMapItem = {
  id: string;
  title: string;
  status: string;
  mission_date: string | null;
  latitude: number | null;
  longitude: number | null;
  launch_location: string | null;
  target_area: string | null;
  planned_flight_zone: string | null;
  go_status: string;
  preflight_status: string;
  objective: string | null;
  altitude_notes: string | null;
  flight_duration_estimate_min: number | null;
  risk_notes: string | null;
  weather_notes: string | null;
  airspace_notes: string | null;
  readiness_notes: string | null;
  postflight_notes: string | null;
  project_id: string;
  projects?: {
    id: string;
    name: string;
    status: string;
    latitude: number | null;
    longitude: number | null;
    location_name: string | null;
    flight_radius_m: number | null;
  } | null;
};

export type MissionMapFilters = {
  missionStatuses: string[];
  projectIds: string[];
  dateFrom: string;
  dateTo: string;
  goStatus: string;
};

export type MapViewMode = "projects" | "missions" | "assets";
