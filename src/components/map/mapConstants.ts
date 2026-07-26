/* ─── Status colors ─── */
export const STATUS_COLORS: Record<string, string> = {
  active: "#00e5ff",
  draft: "#6b7280",
  pending: "#f59e0b",
  complete: "#22c55e",
  archived: "#4b5563",
};

export const MISSION_STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  planning: "#8b5cf6",
  approved: "#3b82f6",
  ready: "#22c55e",
  in_progress: "#f59e0b",
  completed: "#10b981",
  aborted: "#ef4444",
  cancelled: "#4b5563",
};

export const GO_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  go: "#22c55e",
  no_go: "#ef4444",
};

export const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export const DRONE_STATUS_COLORS: Record<string, string> = {
  available: "#22c55e",
  in_use: "#3b82f6",
  maintenance: "#f59e0b",
  retired: "#6b7280",
};

export const MISSION_STATUS_OPTIONS = ["draft", "planning", "approved", "ready", "in_progress", "completed", "aborted", "cancelled"];

/* ─── Base tile layers ─── */
export const TILE_LAYERS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    label: "Dark",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    label: "Satellite",
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    label: "Street",
  },
};

/* ─── Static airspace zones (advisory reference) ─── */
export const AIRSPACE_ZONES = [
  { center: [40.6413, -73.7781] as [number, number], radius: 8000, label: "JFK Class B" },
  { center: [40.7769, -73.8740] as [number, number], radius: 6000, label: "LGA Class B" },
  { center: [34.0522, -118.2437] as [number, number], radius: 8000, label: "LAX Class B" },
  { center: [37.6213, -122.3790] as [number, number], radius: 8000, label: "SFO Class B" },
  { center: [41.9742, -87.9073] as [number, number], radius: 8000, label: "ORD Class B" },
  { center: [33.6407, -84.4277] as [number, number], radius: 8000, label: "ATL Class B" },
];

/* ─── Advisory overlay layer registry ─── */

/**
 * Each advisory layer is an external data source that can be toggled on/off.
 * Layers are categorised so the UI can group them:
 *   - "airspace"  : FAA / LAANC / controlled airspace
 *   - "weather"   : METAR, TAF, wind, visibility, precipitation
 *   - "notam"     : NOTAMs, TFRs, airspace closures
 *   - "terrain"   : elevation, obstacle databases
 *
 * `status` indicates integration readiness:
 *   - "static"    : uses hard-coded reference data (e.g. AIRSPACE_ZONES above)
 *   - "planned"   : placeholder – no data source connected yet
 *   - "connected" : live data feed is configured and active
 */
export interface AdvisoryLayerDef {
  key: string;
  label: string;
  category: "airspace" | "weather" | "notam" | "terrain" | "environmental";
  description: string;
  status: "static" | "planned" | "connected";
  /** Map overlay colour when rendered */
  color: string;
}

export const ADVISORY_LAYERS: AdvisoryLayerDef[] = [
  {
    key: "class_b_airspace",
    label: "Class B Airspace",
    category: "airspace",
    description: "Major airport controlled airspace (approximate). Verify via FAA LAANC before operating.",
    status: "static",
    color: "#ef4444",
  },
  {
    key: "tfr_zones",
    label: "Temporary Flight Restrictions",
    category: "airspace",
    description: "FAA TFRs – active restrictions that prohibit or restrict flight. Source: FAA NOTAM system.",
    status: "planned",
    color: "#f97316",
  },
  {
    key: "laanc_grid",
    label: "LAANC Authorization Grid",
    category: "airspace",
    description: "UAS Facility Maps showing max altitudes in controlled airspace. Source: FAA.",
    status: "planned",
    color: "#a855f7",
  },
  {
    key: "weather_metar",
    label: "Surface Weather (METAR)",
    category: "weather",
    description: "Current surface conditions at nearby airports — wind, visibility, cloud ceiling. Source: Aviation weather services.",
    status: "planned",
    color: "#3b82f6",
  },
  {
    key: "weather_wind",
    label: "Wind Forecast",
    category: "weather",
    description: "Surface and low-altitude wind speed/direction forecasts. Critical for flight planning.",
    status: "planned",
    color: "#06b6d4",
  },
  {
    key: "weather_precip",
    label: "Precipitation Radar",
    category: "weather",
    description: "Current precipitation overlay. Rain, snow, and storm cells.",
    status: "planned",
    color: "#22d3ee",
  },
  {
    key: "notams",
    label: "NOTAMs",
    category: "notam",
    description: "Notices to Air Missions — temporary hazards, closures, and special activity areas.",
    status: "planned",
    color: "#eab308",
  },
  {
    key: "obstacle_db",
    label: "Obstacle Database",
    category: "terrain",
    description: "Towers, power lines, and tall structures from the FAA Obstacle Database.",
    status: "planned",
    color: "#f43f5e",
  },
  {
    key: "protected_areas",
    label: "Protected Areas",
    category: "environmental",
    description: "National parks, wildlife refuges, and protected land boundaries. Source: USGS PAD-US.",
    status: "planned",
    color: "#22c55e",
  },
  {
    key: "noise_zones",
    label: "Noise Sensitivity Zones",
    category: "environmental",
    description: "Areas with noise restrictions — hospitals, schools, residential zones during quiet hours.",
    status: "planned",
    color: "#a3e635",
  },
  {
    key: "wildlife_corridors",
    label: "Wildlife & Migration",
    category: "environmental",
    description: "Seasonal wildlife corridors and nesting areas that may restrict drone operations.",
    status: "planned",
    color: "#4ade80",
  },
];

/**
 * Data source categories for sidebar grouping.
 * "internal" = your mission / project records.
 * "advisory" = external reference data — always verify independently.
 */
export const DATA_SOURCE_CATEGORIES = {
  internal: {
    label: "Mission Data",
    description: "Your organization's projects, missions, operators, and flight plans.",
  },
  advisory: {
    label: "Advisory Overlays",
    description: "External reference data. Always verify independently before flight operations.",
  },
} as const;
