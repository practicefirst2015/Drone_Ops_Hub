/**
 * Integration Registry
 * 
 * Defines all available integrations the platform can connect to.
 * Each entry describes the integration's metadata, category, required
 * credential fields, and current implementation status.
 * 
 * To add a new integration:
 * 1. Add a new entry to INTEGRATION_REGISTRY below
 * 2. Implement the connector logic in a dedicated hook or edge function
 * 3. The settings UI will automatically pick up the new entry
 */

export type IntegrationCategory =
  | "weather"
  | "airspace"
  | "mapping"
  | "photogrammetry"
  | "telemetry"
  | "storage"
  | "communication"
  | "analytics";

export type IntegrationStatus =
  | "available"      // Ready to configure and use
  | "coming_soon"    // Planned but not yet implemented
  | "beta";          // Partially implemented, may have limitations

export interface IntegrationCredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  required: boolean;
}

export interface IntegrationConfigField {
  key: string;
  label: string;
  type: "text" | "select" | "toggle";
  options?: { value: string; label: string }[];
  defaultValue?: string | boolean;
  description?: string;
}

export interface IntegrationDefinition {
  key: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  icon: string; // Lucide icon name
  docsUrl?: string;
  credentialFields: IntegrationCredentialField[];
  configFields: IntegrationConfigField[];
  /** Data this integration provides */
  dataScope: string[];
}

export const INTEGRATION_CATEGORIES: Record<IntegrationCategory, { label: string; description: string }> = {
  weather: {
    label: "Weather Services",
    description: "Real-time and forecast weather data for flight planning.",
  },
  airspace: {
    label: "Airspace & Regulatory",
    description: "Airspace authorization, NOTAMs, and TFR data.",
  },
  mapping: {
    label: "Mapping & GIS",
    description: "Base maps, elevation data, and geospatial services.",
  },
  photogrammetry: {
    label: "Photogrammetry & Processing",
    description: "Automated processing of imagery into maps and 3D models.",
  },
  telemetry: {
    label: "Telemetry & Fleet",
    description: "Live drone telemetry, Remote ID, and fleet tracking.",
  },
  storage: {
    label: "Cloud Storage",
    description: "External storage for large datasets and deliverables.",
  },
  communication: {
    label: "Communication",
    description: "Notifications, messaging, and team communication.",
  },
  analytics: {
    label: "Analytics & Reporting",
    description: "Advanced analytics and business intelligence.",
  },
};

export const INTEGRATION_REGISTRY: IntegrationDefinition[] = [
  // ── Weather ──────────────────────────────────────────
  {
    key: "openweather",
    name: "OpenWeather",
    description: "Surface weather, forecasts, and wind data via OpenWeather API. Provides METAR-equivalent conditions for mission planning.",
    category: "weather",
    status: "available",
    icon: "Cloud",
    docsUrl: "https://openweathermap.org/api",
    credentialFields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Your OpenWeather API key", required: true },
    ],
    configFields: [
      { key: "units", label: "Units", type: "select", options: [{ value: "metric", label: "Metric" }, { value: "imperial", label: "Imperial" }], defaultValue: "metric" },
      { key: "auto_fetch", label: "Auto-fetch before missions", type: "toggle", defaultValue: true, description: "Automatically retrieve weather data when viewing mission details." },
    ],
    dataScope: ["surface_weather", "wind_forecast", "precipitation"],
  },
  {
    key: "tomorrow_io",
    name: "Tomorrow.io",
    description: "Hyper-local weather intelligence with minute-level precipitation and aviation-grade visibility forecasts.",
    category: "weather",
    status: "coming_soon",
    icon: "CloudRain",
    docsUrl: "https://docs.tomorrow.io/",
    credentialFields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Your Tomorrow.io API key", required: true },
    ],
    configFields: [],
    dataScope: ["micro_weather", "visibility", "precipitation_nowcast"],
  },

  // ── Airspace ─────────────────────────────────────────
  {
    key: "faa_laanc",
    name: "FAA LAANC",
    description: "Low Altitude Authorization and Notification Capability for automated airspace authorization in controlled airspace.",
    category: "airspace",
    status: "coming_soon",
    icon: "ShieldCheck",
    credentialFields: [],
    configFields: [],
    dataScope: ["airspace_authorization", "uas_facility_maps"],
  },
  {
    key: "airmap",
    name: "AirMap",
    description: "Airspace intelligence, digital NOTAMs, and real-time advisories for UAS operations.",
    category: "airspace",
    status: "coming_soon",
    icon: "Radar",
    docsUrl: "https://developers.airmap.com/",
    credentialFields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Your AirMap API key", required: true },
      { key: "client_id", label: "Client ID", type: "text", placeholder: "OAuth Client ID", required: false },
    ],
    configFields: [
      { key: "jurisdiction", label: "Jurisdiction", type: "select", options: [{ value: "usa", label: "United States" }, { value: "eu", label: "European Union" }, { value: "uk", label: "United Kingdom" }], defaultValue: "usa" },
    ],
    dataScope: ["notams", "tfrs", "airspace_advisories"],
  },

  // ── Mapping ──────────────────────────────────────────
  {
    key: "mapbox",
    name: "Mapbox",
    description: "Custom map styles, satellite imagery, elevation data, and geocoding services.",
    category: "mapping",
    status: "coming_soon",
    icon: "Map",
    docsUrl: "https://docs.mapbox.com/",
    credentialFields: [
      { key: "access_token", label: "Access Token", type: "password", placeholder: "pk.eyJ1...", required: true },
    ],
    configFields: [
      { key: "style", label: "Default Map Style", type: "select", options: [{ value: "satellite-v9", label: "Satellite" }, { value: "dark-v11", label: "Dark" }, { value: "outdoors-v12", label: "Outdoors" }], defaultValue: "satellite-v9" },
    ],
    dataScope: ["base_maps", "elevation", "geocoding"],
  },

  // ── Photogrammetry ───────────────────────────────────
  {
    key: "dronedeploy",
    name: "DroneDeploy",
    description: "Automated photogrammetry processing — orthomosaics, 3D models, and NDVI analysis from drone imagery.",
    category: "photogrammetry",
    status: "coming_soon",
    icon: "Layers",
    docsUrl: "https://developer.dronedeploy.com/",
    credentialFields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Your DroneDeploy API key", required: true },
    ],
    configFields: [
      { key: "auto_upload", label: "Auto-upload flight imagery", type: "toggle", defaultValue: false, description: "Automatically send captured imagery for processing after flight completion." },
    ],
    dataScope: ["orthomosaics", "3d_models", "ndvi_analysis"],
  },
  {
    key: "pix4d",
    name: "Pix4D",
    description: "Professional photogrammetry suite for surveying, inspection, and precision agriculture mapping.",
    category: "photogrammetry",
    status: "coming_soon",
    icon: "Box",
    docsUrl: "https://developer.pix4d.com/",
    credentialFields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Your Pix4D API key", required: true },
    ],
    configFields: [],
    dataScope: ["point_clouds", "dsm", "orthophotos"],
  },

  // ── Telemetry ────────────────────────────────────────
  {
    key: "dji_cloud",
    name: "DJI FlightHub 2",
    description: "Fleet management, live telemetry, and Remote ID compliance for DJI enterprise drones.",
    category: "telemetry",
    status: "coming_soon",
    icon: "Radio",
    credentialFields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Your DJI Cloud API key", required: true },
      { key: "app_id", label: "App ID", type: "text", placeholder: "Application ID", required: true },
    ],
    configFields: [
      { key: "sync_flights", label: "Sync flight logs automatically", type: "toggle", defaultValue: true },
    ],
    dataScope: ["live_telemetry", "remote_id", "fleet_status"],
  },

  // ── Storage ──────────────────────────────────────────
  {
    key: "aws_s3",
    name: "Amazon S3",
    description: "Scalable cloud storage for large datasets, orthomosaics, and archival data.",
    category: "storage",
    status: "coming_soon",
    icon: "HardDrive",
    credentialFields: [
      { key: "access_key_id", label: "Access Key ID", type: "text", required: true },
      { key: "secret_access_key", label: "Secret Access Key", type: "password", required: true },
      { key: "bucket_name", label: "Bucket Name", type: "text", placeholder: "my-drone-data", required: true },
      { key: "region", label: "Region", type: "text", placeholder: "us-east-1", required: true },
    ],
    configFields: [],
    dataScope: ["external_storage", "archival"],
  },

  // ── Communication ────────────────────────────────────
  {
    key: "slack_notify",
    name: "Slack Notifications",
    description: "Send mission alerts, flight completions, and system notifications to Slack channels.",
    category: "communication",
    status: "available",
    icon: "MessageSquare",
    credentialFields: [
      { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/...", required: true },
    ],
    configFields: [
      { key: "notify_mission_complete", label: "Mission completion alerts", type: "toggle", defaultValue: true },
      { key: "notify_maintenance_due", label: "Maintenance reminders", type: "toggle", defaultValue: true },
    ],
    dataScope: ["notifications"],
  },
];

/** Helper to get a definition by key */
export function getIntegrationDef(key: string): IntegrationDefinition | undefined {
  return INTEGRATION_REGISTRY.find((i) => i.key === key);
}

/** Group integrations by category */
export function getIntegrationsByCategory(): Record<IntegrationCategory, IntegrationDefinition[]> {
  const grouped = {} as Record<IntegrationCategory, IntegrationDefinition[]>;
  for (const def of INTEGRATION_REGISTRY) {
    (grouped[def.category] ??= []).push(def);
  }
  return grouped;
}
