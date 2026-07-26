import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plane, FolderKanban, Award, CheckCircle, Loader2, Users, FileText, DollarSign, Package, Wrench, Target, ClipboardList, BoxIcon, ListChecks } from "lucide-react";

// ── Manufacturers ──
const MANUFACTURERS = [
  { name: "DJI", country: "China", website: "https://www.dji.com" },
  { name: "Autel Robotics", country: "United States", website: "https://www.autelrobotics.com" },
  { name: "Skydio", country: "United States", website: "https://www.skydio.com" },
  { name: "senseFly (AgEagle)", country: "Switzerland", website: "https://www.sensefly.com" },
  { name: "Parrot", country: "France", website: "https://www.parrot.com" },
  { name: "Freefly Systems", country: "United States", website: "https://freeflysystems.com" },
  { name: "Wingtra", country: "Switzerland", website: "https://wingtra.com" },
  { name: "Quantum-Systems", country: "Germany", website: "https://www.quantum-systems.com" },
];

// ── Drone Models ──
const DRONE_MODELS = [
  { name: "Mavic 3 Enterprise", mfr: "DJI", category: "multirotor", weight_kg: 0.92, max_flight_time_min: 45, max_range_km: 15, max_speed_ms: 21, max_altitude_m: 6000, ip_rating: "IP45", has_built_in_camera: true, camera_resolution: "20MP", video_resolution: "5.1K", obstacle_avoidance: "Omnidirectional", remote_id_capable: true, faa_category: "Category 1" },
  { name: "Matrice 350 RTK", mfr: "DJI", category: "multirotor", weight_kg: 6.47, max_flight_time_min: 55, max_range_km: 20, max_speed_ms: 23, max_altitude_m: 7000, ip_rating: "IP55", has_built_in_camera: false, obstacle_avoidance: "Omnidirectional", remote_id_capable: true, faa_category: "Category 4", max_payload_kg: 2.73, gps_type: "RTK" },
  { name: "Matrice 30T", mfr: "DJI", category: "multirotor", weight_kg: 3.77, max_flight_time_min: 41, max_range_km: 15, max_speed_ms: 23, max_altitude_m: 7000, ip_rating: "IP55", has_built_in_camera: true, camera_resolution: "48MP", video_resolution: "4K", obstacle_avoidance: "Omnidirectional", remote_id_capable: true, faa_category: "Category 3" },
  { name: "Mini 4 Pro", mfr: "DJI", category: "multirotor", weight_kg: 0.249, max_flight_time_min: 34, max_range_km: 20, max_speed_ms: 16, max_altitude_m: 4000, has_built_in_camera: true, camera_resolution: "48MP", video_resolution: "4K", obstacle_avoidance: "Omnidirectional", remote_id_capable: true, faa_category: "Category 1" },
  { name: "EVO II Pro V3", mfr: "Autel Robotics", category: "multirotor", weight_kg: 1.19, max_flight_time_min: 42, max_range_km: 15, max_speed_ms: 20, max_altitude_m: 7000, ip_rating: "IP43", has_built_in_camera: true, camera_resolution: "20MP", video_resolution: "6K", obstacle_avoidance: "Omnidirectional", remote_id_capable: true, faa_category: "Category 2" },
  { name: "EVO Max 4T", mfr: "Autel Robotics", category: "multirotor", weight_kg: 1.46, max_flight_time_min: 42, max_range_km: 20, max_speed_ms: 23, max_altitude_m: 7000, ip_rating: "IP43", has_built_in_camera: true, camera_resolution: "50MP", video_resolution: "4K", obstacle_avoidance: "Omnidirectional", remote_id_capable: true, faa_category: "Category 2" },
  { name: "Skydio X10", mfr: "Skydio", category: "multirotor", weight_kg: 2.25, max_flight_time_min: 35, max_range_km: 12, max_speed_ms: 18, max_altitude_m: 4500, ip_rating: "IP55", has_built_in_camera: true, camera_resolution: "48MP", video_resolution: "4K", obstacle_avoidance: "360° AI Vision", remote_id_capable: true, faa_category: "Category 3" },
  { name: "eBee X", mfr: "senseFly (AgEagle)", category: "fixed_wing", weight_kg: 1.6, max_flight_time_min: 90, max_range_km: 40, max_speed_ms: 30, max_altitude_m: 5000, has_built_in_camera: true, camera_resolution: "24MP", remote_id_capable: true, faa_category: "Category 2" },
  { name: "ANAFI USA", mfr: "Parrot", category: "multirotor", weight_kg: 0.5, max_flight_time_min: 32, max_range_km: 4, max_speed_ms: 15, max_altitude_m: 5000, has_built_in_camera: true, camera_resolution: "21MP", video_resolution: "4K", obstacle_avoidance: "None", remote_id_capable: true, faa_category: "Category 1" },
  { name: "Astro", mfr: "Freefly Systems", category: "multirotor", weight_kg: 8.4, max_flight_time_min: 29, max_range_km: 10, has_built_in_camera: false, max_payload_kg: 5.0, remote_id_capable: true, faa_category: "Category 4" },
  { name: "WingtraOne GEN II", mfr: "Wingtra", category: "vtol", weight_kg: 4.8, max_flight_time_min: 59, max_range_km: 35, max_speed_ms: 16, max_altitude_m: 5000, has_built_in_camera: true, camera_resolution: "42MP", remote_id_capable: true, faa_category: "Category 3" },
  { name: "Trinity F90+", mfr: "Quantum-Systems", category: "vtol", weight_kg: 5.0, max_flight_time_min: 90, max_range_km: 60, max_speed_ms: 19, max_altitude_m: 5000, has_built_in_camera: true, camera_resolution: "42MP", remote_id_capable: true, faa_category: "Category 3" },
];

// ── Payloads ──
const PAYLOADS = [
  { name: "Zenmuse H20T", type: "thermal_camera", manufacturer: "DJI", weight_kg: 0.828, description: "Hybrid thermal + visual + zoom + laser rangefinder payload" },
  { name: "Zenmuse L2", type: "lidar", manufacturer: "DJI", weight_kg: 0.905, description: "LiDAR scanner with integrated RGB camera for 3D mapping" },
  { name: "Zenmuse P1", type: "camera", manufacturer: "DJI", weight_kg: 0.8, description: "Full-frame 45MP photogrammetry camera with interchangeable lenses" },
  { name: "RedEdge-P", type: "multispectral", manufacturer: "MicaSense", weight_kg: 0.178, description: "5-band multispectral sensor for precision agriculture" },
  { name: "Wiris Pro", type: "thermal_camera", manufacturer: "Workswell", weight_kg: 0.4, description: "Radiometric thermal camera with 640×512 resolution" },
  { name: "YellowScan Mapper+", type: "lidar", manufacturer: "YellowScan", weight_kg: 1.6, description: "Survey-grade LiDAR with 240k pts/sec and IMU" },
  { name: "Phase One P3", type: "camera", manufacturer: "Phase One", weight_kg: 0.54, description: "100MP medium-format camera for aerial survey" },
  { name: "FLIR Vue TZ20-R", type: "thermal_camera", manufacturer: "Teledyne FLIR", weight_kg: 0.37, description: "Dual thermal zoom payload for Skydio and Autel platforms" },
];

// ── Payload-to-model mapping ──
const PAYLOAD_MODEL_MAP: Record<string, string[]> = {
  "Zenmuse H20T": ["Matrice 350 RTK", "Matrice 30T"],
  "Zenmuse L2": ["Matrice 350 RTK"],
  "Zenmuse P1": ["Matrice 350 RTK"],
  "RedEdge-P": ["Matrice 350 RTK", "WingtraOne GEN II", "Trinity F90+"],
  "Wiris Pro": ["Matrice 350 RTK", "Astro"],
  "YellowScan Mapper+": ["Matrice 350 RTK", "Astro"],
  "Phase One P3": ["Astro"],
  "FLIR Vue TZ20-R": ["Skydio X10", "EVO Max 4T"],
};

// ── Skills & Certifications ──
const SKILLS = [
  { name: "Part 107 Remote Pilot", description: "FAA Part 107 certification for commercial drone operations" },
  { name: "Night Operations", description: "Authorized for night-time UAS flights under Part 107.29" },
  { name: "Operations Over People", description: "Category 1–4 operations over people per Part 107.39" },
  { name: "BVLOS Waiver", description: "Beyond Visual Line of Sight waiver authorization" },
  { name: "Photogrammetry", description: "Aerial mapping, orthomosaic, and 3D model generation" },
  { name: "Thermal / IR Inspection", description: "Thermal imaging for infrastructure, solar, and roofing inspections" },
  { name: "LiDAR Operations", description: "Airborne LiDAR data acquisition and processing" },
  { name: "Construction Monitoring", description: "Progress tracking, volumetric analysis, and site surveys" },
  { name: "Agricultural Spraying", description: "Precision application of fertilizers and crop protection" },
  { name: "Powerline / Tower Inspection", description: "Close-range inspection of utility infrastructure" },
  { name: "Emergency Response", description: "Search-and-rescue, damage assessment, and public safety support" },
  { name: "Indoor / GPS-Denied Flight", description: "Manual flying in GPS-denied or confined spaces" },
];

// ── Project Templates (rich) ──
const PROJECT_TEMPLATES_RICH = [
  { name: "Rooftop Inspection", category: "roof_inspection", description: "Standard residential/commercial roof inspection flight plan", required_skills: ["Part 107 Remote Pilot", "Operations Over People"], suggested_drone_categories: ["multirotor"], suggested_payload_types: ["camera", "thermal_camera"], estimated_budget_min: 1500, estimated_budget_max: 5000, estimated_duration_days: 1, risk_notes: "Requires waiver for operations over people near occupied structures" },
  { name: "Solar Farm Thermal", category: "solar_inspection", description: "Thermal IR survey of solar panel arrays for hotspot detection", required_skills: ["Part 107 Remote Pilot", "Thermal / IR Inspection"], suggested_drone_categories: ["multirotor"], suggested_payload_types: ["thermal_camera"], estimated_budget_min: 5000, estimated_budget_max: 25000, estimated_duration_days: 3, risk_notes: "Best performed in early morning for optimal thermal contrast" },
  { name: "Construction Progress", category: "construction_progress", description: "Weekly construction site progress capture with orthomosaic", required_skills: ["Part 107 Remote Pilot", "Photogrammetry", "Construction Monitoring"], suggested_drone_categories: ["multirotor"], suggested_payload_types: ["camera"], estimated_budget_min: 2000, estimated_budget_max: 8000, estimated_duration_days: 1, risk_notes: "Active construction site — coordinate with site safety officer" },
  { name: "Utility Line Inspection", category: "utility_inspection", description: "Close-range visual and thermal inspection of transmission lines and towers", required_skills: ["Part 107 Remote Pilot", "Powerline / Tower Inspection", "Thermal / IR Inspection"], suggested_drone_categories: ["multirotor"], suggested_payload_types: ["camera", "thermal_camera"], estimated_budget_min: 8000, estimated_budget_max: 30000, estimated_duration_days: 5, risk_notes: "Requires coordination with utility company for line de-energization schedule" },
  { name: "Corridor Mapping", category: "mapping", description: "Linear corridor mapping for roads, pipelines, or power lines", required_skills: ["Part 107 Remote Pilot", "Photogrammetry", "BVLOS Waiver"], suggested_drone_categories: ["fixed_wing", "vtol"], suggested_payload_types: ["camera", "lidar"], estimated_budget_min: 10000, estimated_budget_max: 40000, estimated_duration_days: 7, risk_notes: "May require BVLOS waiver for long corridors" },
  { name: "Real Estate Media", category: "real_estate_media", description: "Aerial photography and videography for property marketing", required_skills: ["Part 107 Remote Pilot"], suggested_drone_categories: ["multirotor"], suggested_payload_types: ["camera"], estimated_budget_min: 500, estimated_budget_max: 3000, estimated_duration_days: 1, risk_notes: "Check local airspace — many properties near airports" },
  { name: "Thermal Building Inspection", category: "thermal_inspection", description: "Building envelope thermal inspection for energy efficiency assessment", required_skills: ["Part 107 Remote Pilot", "Thermal / IR Inspection"], suggested_drone_categories: ["multirotor"], suggested_payload_types: ["thermal_camera"], estimated_budget_min: 3000, estimated_budget_max: 12000, estimated_duration_days: 2, risk_notes: "Requires minimum 10°C temperature differential between interior and exterior" },
  { name: "Emergency Assessment", category: "emergency", description: "Rapid damage assessment flight after natural disaster", required_skills: ["Part 107 Remote Pilot", "Emergency Response"], suggested_drone_categories: ["multirotor", "vtol"], suggested_payload_types: ["camera", "thermal_camera"], estimated_budget_min: 5000, estimated_budget_max: 20000, estimated_duration_days: 3, risk_notes: "Emergency COA may be required; coordinate with incident command" },
];

// ── Sample Clients ──
const SAMPLE_CLIENTS = [
  { name: "Meridian Solar Group", contact_name: "Sarah Chen", contact_email: "sarah.chen@meridiansolar.com", phone: "(512) 555-0147", notes: "Large-scale solar farm operator in TX and AZ. Quarterly thermal inspections.", status: "active" as const },
  { name: "Apex Construction LLC", contact_name: "Marcus Rivera", contact_email: "m.rivera@apexconstruction.com", phone: "(404) 555-0283", notes: "Commercial and residential general contractor. Weekly progress flights on active sites.", status: "active" as const },
  { name: "Summit Utility Partners", contact_name: "James Whitfield", contact_email: "jwhitfield@summitutility.com", phone: "(303) 555-0194", notes: "Regional power utility. Bi-annual transmission line inspections.", status: "active" as const },
  { name: "Greenfield Agriculture Co-op", contact_name: "Linda Johansson", contact_email: "ljohansson@greenfieldcoop.org", phone: "(515) 555-0326", notes: "Farming cooperative managing 12,000 acres. Multispectral crop health surveys.", status: "active" as const },
  { name: "Coastal Engineering Inc.", contact_name: "David Park", contact_email: "dpark@coastaleng.com", phone: "(843) 555-0451", notes: "Civil engineering firm focused on coastal erosion monitoring and beach nourishment.", status: "active" as const },
  { name: "Metro Roofing Solutions", contact_name: "Angela Torres", contact_email: "atorres@metroroofing.com", phone: "(214) 555-0178", notes: "Residential roofing company. On-demand roof inspections for insurance claims.", status: "inactive" as const },
];

// ── Sample Projects (linked to clients by name) ──
const SAMPLE_PROJECTS = [
  { name: "Pecos Valley Solar Thermal Scan", client: "Meridian Solar Group", description: "Q1 thermal inspection of 45MW solar array in Pecos County, TX. Identify panel hotspots and string-level anomalies.", status: "active" as const, priority: "high", start_date: "2026-02-15", end_date: "2026-03-28", latitude: 30.88, longitude: -102.87, location_name: "Pecos County, TX", flight_altitude_m: 80, flight_radius_m: 2000, budget: 18500 },
  { name: "Buckhead Tower Phase II Progress", client: "Apex Construction LLC", description: "Weekly orthomosaic flights documenting Phase II vertical construction progress at Buckhead mixed-use development.", status: "active" as const, priority: "medium", start_date: "2026-01-06", end_date: "2026-06-30", latitude: 33.84, longitude: -84.37, location_name: "Buckhead, Atlanta, GA", flight_altitude_m: 120, flight_radius_m: 500, budget: 32000 },
  { name: "Front Range Transmission Corridor", client: "Summit Utility Partners", description: "115kV transmission line inspection covering 28 miles of corridor through mountainous terrain near Boulder.", status: "pending" as const, priority: "high", start_date: "2026-04-01", end_date: "2026-04-15", latitude: 40.01, longitude: -105.27, location_name: "Boulder County, CO", flight_altitude_m: 100, flight_radius_m: 5000, budget: 24000 },
  { name: "Spring Crop Health Assessment", client: "Greenfield Agriculture Co-op", description: "Multispectral survey of 3,200 acres of corn and soybean fields for early-season stress detection and variable rate prescriptions.", status: "draft" as const, priority: "medium", start_date: "2026-05-01", end_date: "2026-05-15", latitude: 41.99, longitude: -93.62, location_name: "Story County, IA", flight_altitude_m: 120, flight_radius_m: 4000, budget: 14500 },
  { name: "Folly Beach Erosion Survey", client: "Coastal Engineering Inc.", description: "LiDAR and photogrammetry survey of 3.5 miles of beachfront to measure volumetric sand loss after winter storms.", status: "active" as const, priority: "high", start_date: "2026-02-20", end_date: "2026-03-10", latitude: 32.65, longitude: -79.94, location_name: "Folly Beach, SC", flight_altitude_m: 60, flight_radius_m: 3000, budget: 21000 },
  { name: "Stockpile Inventory — Quarry West", client: "Apex Construction LLC", description: "Monthly volumetric measurement of aggregate stockpiles at the Quarry West materials yard.", status: "active" as const, priority: "low", start_date: "2026-01-15", end_date: "2026-12-31", latitude: 33.72, longitude: -84.55, location_name: "Austell, GA", flight_altitude_m: 90, flight_radius_m: 800, budget: 9600 },
];

// ── Sample Invoices (linked to projects by name) ──
const SAMPLE_INVOICES = [
  { project: "Pecos Valley Solar Thermal Scan", invoice_number: "INV-2026-001", status: "issued", subtotal: 8500, tax_rate: 8.25, issued_date: "2026-02-28", due_date: "2026-03-30", notes: "Mobilization and first flight block — 12 panels scanned", lines: [
    { description: "Mobilization & travel — Pecos County", quantity: 1, unit_price: 2500 },
    { description: "Thermal flight operations (4 hrs)", quantity: 4, unit_price: 850 },
    { description: "Data processing & anomaly report", quantity: 1, unit_price: 2600 },
  ]},
  { project: "Buckhead Tower Phase II Progress", invoice_number: "INV-2026-002", status: "paid", subtotal: 4800, tax_rate: 8.9, issued_date: "2026-02-01", due_date: "2026-03-03", notes: "January progress flights (4 weekly sessions)", lines: [
    { description: "Weekly progress flight — Jan 6", quantity: 1, unit_price: 1200 },
    { description: "Weekly progress flight — Jan 13", quantity: 1, unit_price: 1200 },
    { description: "Weekly progress flight — Jan 20", quantity: 1, unit_price: 1200 },
    { description: "Weekly progress flight — Jan 27", quantity: 1, unit_price: 1200 },
  ]},
  { project: "Folly Beach Erosion Survey", invoice_number: "INV-2026-003", status: "draft", subtotal: 12500, tax_rate: 6.0, issued_date: null, due_date: null, notes: "Full LiDAR survey + deliverables", lines: [
    { description: "LiDAR acquisition — 3.5 mi corridor (2 days)", quantity: 2, unit_price: 3200 },
    { description: "Ground control point survey", quantity: 1, unit_price: 1800 },
    { description: "Point cloud processing & DEM generation", quantity: 1, unit_price: 2500 },
    { description: "Volumetric change analysis report", quantity: 1, unit_price: 1800 },
  ]},
  { project: "Stockpile Inventory — Quarry West", invoice_number: "INV-2026-004", status: "paid", subtotal: 1600, tax_rate: 8.9, issued_date: "2026-01-31", due_date: "2026-03-02", notes: "January stockpile measurement", lines: [
    { description: "Stockpile volumetric flight", quantity: 1, unit_price: 800 },
    { description: "Volume calculation & comparison report", quantity: 1, unit_price: 800 },
  ]},
];

// ── Fleet Drones (instances of models) ──
const FLEET_DRONES = [
  { name: "M350-Alpha", model: "Matrice 350 RTK", serial_number: "1ZNBJ4K00CC0H1", status: "available", battery_level: 92, flight_hours: 147.3 },
  { name: "M350-Bravo", model: "Matrice 350 RTK", serial_number: "1ZNBJ4K00CC0H2", status: "available", battery_level: 85, flight_hours: 203.8 },
  { name: "M30T-Charlie", model: "Matrice 30T", serial_number: "1ZNDJ9800DB0K1", status: "in_use", battery_level: 64, flight_hours: 89.5 },
  { name: "Mavic3E-Delta", model: "Mavic 3 Enterprise", serial_number: "1ZNDK7200FA0M1", status: "available", battery_level: 100, flight_hours: 52.1 },
  { name: "Skydio-Echo", model: "Skydio X10", serial_number: "SK10-28491-A", status: "available", battery_level: 78, flight_hours: 34.7 },
  { name: "eBeeX-Foxtrot", model: "eBee X", serial_number: "EB-X-11294", status: "maintenance", battery_level: 0, flight_hours: 312.6, next_maintenance: "2026-03-15" },
];

// ── Sample Missions ──
const SAMPLE_MISSIONS = [
  { project: "Pecos Valley Solar Thermal Scan", title: "Solar Array Block A — Thermal Sweep", status: "completed" as const, go_status: "go" as const, preflight_status: "complete" as const, mission_date: "2026-02-20", objective: "Fly thermal grid pattern over Block A (rows 1–48). Capture radiometric imagery at 80m AGL for hotspot detection.", launch_location: "Pecos County staging area — south gate", latitude: 30.88, longitude: -102.87, flight_duration_estimate_min: 45, weather_notes: "Clear skies, 12°C at launch, wind 8 kt from SW", airspace_notes: "Class G — no TFRs active", risk_notes: "Moderate dust near access road, minimal obstruction risk" },
  { project: "Pecos Valley Solar Thermal Scan", title: "Solar Array Block B — Thermal Sweep", status: "ready" as const, go_status: "go" as const, preflight_status: "complete" as const, mission_date: "2026-03-14", objective: "Continue thermal survey covering Block B (rows 49–96). Morning flight for optimal thermal contrast.", launch_location: "Pecos County staging area — north gate", latitude: 30.89, longitude: -102.86, flight_duration_estimate_min: 50, weather_notes: "Forecast: clear, 14°C, wind <10 kt", airspace_notes: "Class G — NOTAM check pending", risk_notes: "Wildlife nesting season — avoid low passes near perimeter fence" },
  { project: "Buckhead Tower Phase II Progress", title: "Weekly Progress — Week 9", status: "completed" as const, go_status: "go" as const, preflight_status: "complete" as const, mission_date: "2026-03-03", objective: "Capture orthomosaic of Phase II construction site. Focus on foundation pour for Building C and crane positions.", launch_location: "Designated launch pad — SE corner lot", latitude: 33.84, longitude: -84.37, flight_duration_estimate_min: 25, weather_notes: "Overcast, 18°C, wind 5 kt", airspace_notes: "Within Atlanta Class B — Part 107.41 authorization active", risk_notes: "Active crane operations — maintain 50ft horizontal clearance" },
  { project: "Buckhead Tower Phase II Progress", title: "Weekly Progress — Week 10", status: "planning" as const, go_status: "pending" as const, preflight_status: "not_started" as const, mission_date: "2026-03-10", objective: "Standard weekly progress capture. Steel erection on floors 4–6 expected.", launch_location: "Designated launch pad — SE corner lot", latitude: 33.84, longitude: -84.37, flight_duration_estimate_min: 25, weather_notes: "TBD — check 48hr forecast", airspace_notes: "Within Atlanta Class B — authorization valid through June", risk_notes: "Tower crane repositioning scheduled mid-week" },
  { project: "Folly Beach Erosion Survey", title: "LiDAR Acquisition — Northern Segment", status: "completed" as const, go_status: "go" as const, preflight_status: "complete" as const, mission_date: "2026-02-25", objective: "LiDAR corridor scan of 1.8 miles of beachfront (north end to pier). Dual-pass at 60m AGL with 60% sidelap.", launch_location: "Folly Beach County Park parking area", latitude: 32.66, longitude: -79.94, flight_duration_estimate_min: 35, weather_notes: "Partly cloudy, 16°C, wind 12 kt from E", airspace_notes: "Class G — NOTAM issued for survey ops", risk_notes: "High tide at 14:22 — complete flight before 13:00 to capture exposed beach" },
  { project: "Folly Beach Erosion Survey", title: "LiDAR Acquisition — Southern Segment", status: "approved" as const, go_status: "go" as const, preflight_status: "in_progress" as const, mission_date: "2026-03-12", objective: "Complete southern 1.7 miles of beachfront. Match overlap zones with northern segment for seamless merge.", launch_location: "Folly Beach south access road", latitude: 32.64, longitude: -79.95, flight_duration_estimate_min: 35, weather_notes: "Forecast: clear, 19°C, wind 8 kt", airspace_notes: "Class G — existing NOTAM covers area", risk_notes: "Spring break crowds — fly before 08:00" },
  { project: "Stockpile Inventory — Quarry West", title: "February Volumetric Survey", status: "completed" as const, go_status: "go" as const, preflight_status: "complete" as const, mission_date: "2026-02-28", objective: "Photogrammetric capture of all active stockpiles for monthly volume comparison. 5 piles total.", launch_location: "Quarry office parking lot", latitude: 33.72, longitude: -84.55, flight_duration_estimate_min: 20, weather_notes: "Clear, 21°C, calm winds", airspace_notes: "Class G — no restrictions", risk_notes: "Haul trucks active until 07:00 — fly after operations pause" },
  { project: "Front Range Transmission Corridor", title: "Pre-Survey Route Reconnaissance", status: "draft" as const, go_status: "pending" as const, preflight_status: "not_started" as const, mission_date: "2026-03-25", objective: "Visual reconnaissance of first 8-mile segment to confirm access points, identify obstacles, and validate flight plan.", launch_location: "Hwy 93 pulloff — mile marker 12", latitude: 40.01, longitude: -105.27, flight_duration_estimate_min: 40, weather_notes: "Mountain weather — check day-of", airspace_notes: "Near Boulder Municipal airspace — coordinate with ATCT", risk_notes: "Mountainous terrain, variable winds above ridgeline" },
];

// ── Sample Flight Logs ──
const SAMPLE_FLIGHT_LOGS = [
  { project: "Pecos Valley Solar Thermal Scan", mission: "Solar Array Block A — Thermal Sweep", title: "Block A Thermal — Flight 1", flight_date: "2026-02-20", outcome: "completed" as const, duration_minutes: 42, launch_location: "Pecos County staging area — south gate", launch_time: "2026-02-20T07:15:00Z", landing_time: "2026-02-20T07:57:00Z", drone_model: "Matrice 350 RTK", objective: "Complete thermal grid of Block A rows 1–48", weather_summary: "Clear, 12°C, wind 8 kt SW", preflight_completed: true, postflight_notes: "Clean flight. 3 hotspot clusters identified in rows 12–15. Data quality excellent — minimal wind drift.", deliverables_summary: "Radiometric TIFF dataset, preliminary hotspot map" },
  { project: "Buckhead Tower Phase II Progress", mission: "Weekly Progress — Week 9", title: "Buckhead Week 9 Progress Flight", flight_date: "2026-03-03", outcome: "completed" as const, duration_minutes: 22, launch_location: "SE corner launch pad", launch_time: "2026-03-03T14:30:00Z", landing_time: "2026-03-03T14:52:00Z", drone_model: "Mavic 3 Enterprise", objective: "Orthomosaic of Phase II site — Building C foundation pour", weather_summary: "Overcast, 18°C, wind 5 kt", preflight_completed: true, postflight_notes: "Good coverage. Foundation pour 80% complete. Crane in position for steel delivery.", deliverables_summary: "Orthomosaic, annotated progress photos" },
  { project: "Folly Beach Erosion Survey", mission: "LiDAR Acquisition — Northern Segment", title: "Folly Beach North — LiDAR Pass", flight_date: "2026-02-25", outcome: "completed" as const, duration_minutes: 33, launch_location: "Folly Beach County Park", launch_time: "2026-02-25T11:00:00Z", landing_time: "2026-02-25T11:33:00Z", drone_model: "Matrice 350 RTK", objective: "Dual-pass LiDAR scan of northern 1.8 miles", weather_summary: "Partly cloudy, 16°C, wind 12 kt E", preflight_completed: true, postflight_notes: "Both passes completed before high tide. Point density exceeds spec at 45 pts/m². Overlap zones well-captured.", deliverables_summary: "LAS point cloud, flight trajectory log, GCP verification photos" },
  { project: "Stockpile Inventory — Quarry West", mission: "February Volumetric Survey", title: "Quarry West — Feb Stockpile Measurement", flight_date: "2026-02-28", outcome: "completed" as const, duration_minutes: 18, launch_location: "Quarry office lot", launch_time: "2026-02-28T07:30:00Z", landing_time: "2026-02-28T07:48:00Z", drone_model: "Mavic 3 Enterprise", objective: "Capture all 5 active stockpiles", weather_summary: "Clear, 21°C, calm", preflight_completed: true, postflight_notes: "All 5 piles captured. Pile #3 has grown significantly — flagged for site manager review.", deliverables_summary: "Orthomosaic, volumetric calculations, change comparison" },
];

// ── Sample Project Deliverables ──
const SAMPLE_DELIVERABLES = [
  { project: "Pecos Valley Solar Thermal Scan", deliverable_type: "thermal_imagery" as const, label: "Block A Radiometric Dataset", status: "completed" as const, description: "Full radiometric TIFF dataset from Block A thermal sweep" },
  { project: "Pecos Valley Solar Thermal Scan", deliverable_type: "inspection_notes" as const, label: "Block A Hotspot Analysis Report", status: "completed" as const, description: "Annotated report identifying 3 hotspot clusters in rows 12–15" },
  { project: "Pecos Valley Solar Thermal Scan", deliverable_type: "thermal_imagery" as const, label: "Block B Radiometric Dataset", status: "expected" as const, description: "Radiometric TIFF dataset from Block B — pending mission completion" },
  { project: "Buckhead Tower Phase II Progress", deliverable_type: "rgb_imagery" as const, label: "Week 9 Orthomosaic", status: "completed" as const, description: "High-res orthomosaic of Phase II construction site as of March 3" },
  { project: "Buckhead Tower Phase II Progress", deliverable_type: "rgb_imagery" as const, label: "Week 10 Orthomosaic", status: "expected" as const, description: "Scheduled weekly orthomosaic capture" },
  { project: "Folly Beach Erosion Survey", deliverable_type: "lidar_data" as const, label: "Northern Segment Point Cloud", status: "completed" as const, description: "Classified LAS point cloud — 45 pts/m² density, 1.8 mi corridor" },
  { project: "Folly Beach Erosion Survey", deliverable_type: "survey_data" as const, label: "DEM & Volumetric Change Map", status: "in_processing" as const, description: "Digital elevation model and sand volume change analysis vs. October baseline" },
  { project: "Folly Beach Erosion Survey", deliverable_type: "lidar_data" as const, label: "Southern Segment Point Cloud", status: "expected" as const, description: "Pending completion of southern LiDAR acquisition mission" },
  { project: "Stockpile Inventory — Quarry West", deliverable_type: "mapping_data" as const, label: "February Volume Report", status: "completed" as const, description: "Volumetric calculations for all 5 stockpiles with month-over-month comparison" },
  { project: "Stockpile Inventory — Quarry West", deliverable_type: "rgb_imagery" as const, label: "February Site Orthomosaic", status: "completed" as const, description: "Full-site orthomosaic for February inventory record" },
  { project: "Front Range Transmission Corridor", deliverable_type: "rgb_imagery" as const, label: "Reconnaissance Photo Log", status: "expected" as const, description: "Geo-tagged photos of access points, obstacles, and landing zones along 28-mile corridor" },
];

// ── Sample Tasks ──
const SAMPLE_TASKS = [
  { project: "Pecos Valley Solar Thermal Scan", title: "Process Block A thermal data", status: "done" as const, priority: "high" as const, description: "Run radiometric processing pipeline on Block A dataset. Generate hotspot map overlay." },
  { project: "Pecos Valley Solar Thermal Scan", title: "Deliver Block A anomaly report to client", status: "done" as const, priority: "high" as const, description: "Compile annotated PDF with hotspot locations, severity classifications, and recommended actions." },
  { project: "Pecos Valley Solar Thermal Scan", title: "Complete Block B thermal sweep", status: "todo" as const, priority: "high" as const, description: "Execute Block B mission on March 14. Morning flight required for thermal contrast." },
  { project: "Pecos Valley Solar Thermal Scan", title: "Final combined report", status: "todo" as const, priority: "medium" as const, description: "Merge Block A and Block B datasets into comprehensive site-wide thermal assessment." },
  { project: "Buckhead Tower Phase II Progress", title: "Upload Week 9 orthomosaic to client portal", status: "done" as const, priority: "medium" as const, description: "Process and upload Week 9 orthomosaic with progress annotations." },
  { project: "Buckhead Tower Phase II Progress", title: "Plan Week 10 flight path adjustment", status: "in_progress" as const, priority: "medium" as const, description: "Steel erection changing skyline — adjust GSD and altitude for floors 4–6 visibility." },
  { project: "Folly Beach Erosion Survey", title: "Process northern LiDAR data", status: "in_progress" as const, priority: "high" as const, description: "Generate classified point cloud, DEM, and cross-section profiles for northern segment." },
  { project: "Folly Beach Erosion Survey", title: "Schedule southern segment flight", status: "todo" as const, priority: "high" as const, description: "Confirm March 12 launch. Check tide tables and coordinate beach access with county." },
  { project: "Folly Beach Erosion Survey", title: "Volumetric change analysis", status: "todo" as const, priority: "medium" as const, description: "Compare current DEM against October 2025 baseline to quantify sand loss/gain." },
  { project: "Stockpile Inventory — Quarry West", title: "Deliver February volume report", status: "done" as const, priority: "medium" as const, description: "Send finalized volume calculations and change comparison to site manager." },
  { project: "Front Range Transmission Corridor", title: "Submit BVLOS waiver application", status: "todo" as const, priority: "critical" as const, description: "Prepare and submit FAA Part 107.31 waiver for 28-mile corridor inspection." },
  { project: "Front Range Transmission Corridor", title: "Coordinate with Summit Utility for line schedule", status: "todo" as const, priority: "high" as const, description: "Confirm de-energization windows for close-range tower inspection segments." },
];

// ── UI ──
interface SeedSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  count: number;
  loading: boolean;
  done: boolean;
  onSeed: () => Promise<void>;
}

function SeedSection({ title, description, icon: Icon, count, loading, done, onSeed }: SeedSectionProps) {
  return (
    <div className="surface border border-border p-5 flex items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 border border-border flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-mono text-sm font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          <p className="font-mono text-xs text-muted-foreground mt-1">{count} records</p>
        </div>
      </div>
      <button
        onClick={onSeed}
        disabled={loading || done}
        className="shrink-0 h-9 px-4 font-mono text-xs tracking-wide border border-border bg-background hover:bg-secondary/50 text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : done ? (
          <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-primary" /> Seeded</span>
        ) : (
          "Seed"
        )}
      </button>
    </div>
  );
}

export function SeedDataPanel() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  const markLoading = (key: string, v: boolean) => setLoading((p) => ({ ...p, [key]: v }));
  const markDone = (key: string) => setDone((p) => ({ ...p, [key]: true }));

  // ── Helpers ──
  const fetchNameIdMap = async (table: "drone_manufacturers" | "drone_models" | "drone_payloads" | "clients" | "projects") => {
    const { data } = await supabase.from(table).select("id, name").eq("organization_id", orgId!);
    return Object.fromEntries((data || []).map((r) => [r.name, r.id]));
  };

  // ── Seed Functions ──
  const seedManufacturers = async () => {
    if (!orgId) return;
    markLoading("mfr", true);
    try {
      let inserted = 0;
      for (const m of MANUFACTURERS) {
        const { error } = await supabase.from("drone_manufacturers").insert({ ...m, organization_id: orgId });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["drone_manufacturers"] });
      markDone("mfr");
      toast.success(`Seeded ${inserted} manufacturers`);
    } finally { markLoading("mfr", false); }
  };

  const seedDroneModels = async () => {
    if (!orgId) return;
    markLoading("models", true);
    try {
      const mfrMap = await fetchNameIdMap("drone_manufacturers");
      let inserted = 0;
      for (const dm of DRONE_MODELS) {
        const mfrId = mfrMap[dm.mfr];
        if (!mfrId) continue;
        const { mfr, ...rest } = dm;
        const { error } = await supabase.from("drone_models").insert({ ...rest, manufacturer_id: mfrId, organization_id: orgId });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["drone_models"] });
      markDone("models");
      toast.success(`Seeded ${inserted} drone models`);
    } finally { markLoading("models", false); }
  };

  const seedPayloads = async () => {
    if (!orgId) return;
    markLoading("payloads", true);
    try {
      // Insert payloads
      let inserted = 0;
      for (const p of PAYLOADS) {
        const { error } = await supabase.from("drone_payloads").insert({ ...p, organization_id: orgId });
        if (!error) inserted++;
      }

      // Link payloads to models
      const modelMap = await fetchNameIdMap("drone_models");
      const payloadMap = await fetchNameIdMap("drone_payloads");
      let linked = 0;
      for (const [payloadName, modelNames] of Object.entries(PAYLOAD_MODEL_MAP)) {
        const payloadId = payloadMap[payloadName];
        if (!payloadId) continue;
        for (const modelName of modelNames) {
          const modelId = modelMap[modelName];
          if (!modelId) continue;
          const { error } = await supabase.from("drone_model_payloads").insert({ payload_id: payloadId, model_id: modelId });
          if (!error) linked++;
        }
      }

      qc.invalidateQueries({ queryKey: ["drone_payloads"] });
      markDone("payloads");
      toast.success(`Seeded ${inserted} payloads, ${linked} model links`);
    } finally { markLoading("payloads", false); }
  };

  const seedSkills = async () => {
    if (!orgId) return;
    markLoading("skills", true);
    try {
      let inserted = 0;
      for (const s of SKILLS) {
        const { error } = await supabase.from("skills").insert({ ...s, organization_id: orgId });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["org_skills"] });
      markDone("skills");
      toast.success(`Seeded ${inserted} skills`);
    } finally { markLoading("skills", false); }
  };

  const seedProjectTemplates = async () => {
    if (!orgId) return;
    markLoading("templates", true);
    try {
      let inserted = 0;
      for (const p of PROJECT_TEMPLATES_RICH) {
        const { error } = await supabase.from("project_templates").insert({ ...p, organization_id: orgId });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["project_templates"] });
      markDone("templates");
      toast.success(`Seeded ${inserted} project templates`);
    } finally { markLoading("templates", false); }
  };

  const seedClients = async () => {
    if (!orgId) return;
    markLoading("clients", true);
    try {
      let inserted = 0;
      for (const c of SAMPLE_CLIENTS) {
        const { error } = await supabase.from("clients").insert({ ...c, organization_id: orgId });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["clients"] });
      markDone("clients");
      toast.success(`Seeded ${inserted} clients`);
    } finally { markLoading("clients", false); }
  };

  const seedProjects = async () => {
    if (!orgId) return;
    markLoading("projects", true);
    try {
      const clientMap = await fetchNameIdMap("clients");
      let inserted = 0;
      for (const p of SAMPLE_PROJECTS) {
        const clientId = clientMap[p.client];
        const { client, ...rest } = p;
        const { error } = await supabase.from("projects").insert({
          ...rest,
          organization_id: orgId,
          client_id: clientId || null,
          status: rest.status as any,
        });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["projects"] });
      markDone("projects");
      toast.success(`Seeded ${inserted} projects`);
    } finally { markLoading("projects", false); }
  };

  const seedInvoices = async () => {
    if (!orgId) return;
    markLoading("invoices", true);
    try {
      // Build maps
      const projectMap = await fetchNameIdMap("projects");
      // Get project-client relationships to link invoices to both
      // Get project-client relationships to link invoices to both
      const { data: projectRows } = await supabase.from("projects").select("id, name, client_id").eq("organization_id", orgId!);
      const projectClientMap: Record<string, string | null> = {};
      (projectRows || []).forEach((r: any) => {
        projectClientMap[r.name] = r.client_id;
      });

      let inserted = 0;
      for (const inv of SAMPLE_INVOICES) {
        const projectId = projectMap[inv.project];
        if (!projectId) continue;
        const clientId = projectClientMap[inv.project] || null;
        const taxAmount = Math.round(inv.subtotal * (inv.tax_rate / 100) * 100) / 100;
        const amount = Math.round((inv.subtotal + taxAmount) * 100) / 100;

        const { data: invRow, error } = await supabase.from("invoices").insert({
          invoice_number: inv.invoice_number,
          organization_id: orgId!,
          project_id: projectId,
          client_id: clientId,
          status: inv.status as any,
          subtotal: inv.subtotal,
          tax_rate: inv.tax_rate,
          tax_amount: taxAmount,
          amount,
          issued_date: inv.issued_date,
          due_date: inv.due_date,
          notes: inv.notes,
        }).select("id").single();
        if (error || !invRow) continue;
        inserted++;

        // Insert line items
        for (let i = 0; i < inv.lines.length; i++) {
          const line = inv.lines[i];
          await supabase.from("invoice_line_items").insert({
            invoice_id: invRow.id,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            amount: line.quantity * line.unit_price,
            sort_order: i,
          });
        }
      }
      qc.invalidateQueries({ queryKey: ["invoices"] });
      markDone("invoices");
      toast.success(`Seeded ${inserted} invoices with line items`);
    } finally { markLoading("invoices", false); }
  };

  const seedFleetDrones = async () => {
    if (!orgId) return;
    markLoading("fleet", true);
    try {
      const modelMap = await fetchNameIdMap("drone_models");
      let inserted = 0;
      for (const d of FLEET_DRONES) {
        const modelId = modelMap[d.model] || null;
        const { model, ...rest } = d;
        const { error } = await supabase.from("drones").insert({
          ...rest,
          model: d.model,
          drone_model_id: modelId,
          organization_id: orgId,
        });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["org_drones"] });
      markDone("fleet");
      toast.success(`Seeded ${inserted} fleet drones`);
    } finally { markLoading("fleet", false); }
  };

  const seedMissions = async () => {
    if (!orgId || !user) return;
    markLoading("missions", true);
    try {
      const projectMap = await fetchNameIdMap("projects");
      let inserted = 0;
      for (const m of SAMPLE_MISSIONS) {
        const projectId = projectMap[m.project];
        if (!projectId) continue;
        const { project, ...rest } = m;
        const { error } = await supabase.from("missions").insert({
          ...rest,
          project_id: projectId,
          organization_id: orgId,
          status: rest.status as any,
          go_status: rest.go_status as any,
          preflight_status: rest.preflight_status as any,
        });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["dash_cmd_missions"] });
      markDone("missions");
      toast.success(`Seeded ${inserted} missions`);
    } finally { markLoading("missions", false); }
  };

  const seedFlightLogs = async () => {
    if (!orgId || !user) return;
    markLoading("flightlogs", true);
    try {
      const projectMap = await fetchNameIdMap("projects");
      const { data: missionRows } = await supabase.from("missions").select("id, title").eq("organization_id", orgId!);
      const missionMap: Record<string, string> = {};
      (missionRows || []).forEach((r: any) => { missionMap[r.title] = r.id; });
      const modelMap = await fetchNameIdMap("drone_models");

      let inserted = 0;
      for (const fl of SAMPLE_FLIGHT_LOGS) {
        const projectId = projectMap[fl.project];
        if (!projectId) continue;
        const missionId = missionMap[fl.mission] || null;
        const droneModelId = modelMap[fl.drone_model] || null;
        const { project, mission, drone_model, ...rest } = fl;
        const { error } = await supabase.from("flight_logs").insert({
          ...rest,
          project_id: projectId,
          mission_id: missionId,
          drone_model_id: droneModelId,
          organization_id: orgId,
          pilot_id: user.id,
          outcome: rest.outcome as any,
        });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["flight_logs"] });
      qc.invalidateQueries({ queryKey: ["dash_cmd_flight_logs"] });
      markDone("flightlogs");
      toast.success(`Seeded ${inserted} flight logs`);
    } finally { markLoading("flightlogs", false); }
  };

  const seedDeliverables = async () => {
    if (!orgId) return;
    markLoading("deliverables", true);
    try {
      const projectMap = await fetchNameIdMap("projects");
      let inserted = 0;
      for (const d of SAMPLE_DELIVERABLES) {
        const projectId = projectMap[d.project];
        if (!projectId) continue;
        const { project, ...rest } = d;
        const { error } = await supabase.from("project_deliverables").insert({
          ...rest,
          project_id: projectId,
          organization_id: orgId,
          deliverable_type: rest.deliverable_type as any,
          status: rest.status as any,
        });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["project_deliverables"] });
      qc.invalidateQueries({ queryKey: ["dash_cmd_deliverables"] });
      markDone("deliverables");
      toast.success(`Seeded ${inserted} deliverables`);
    } finally { markLoading("deliverables", false); }
  };

  const seedTasks = async () => {
    if (!orgId) return;
    markLoading("tasks", true);
    try {
      const projectMap = await fetchNameIdMap("projects");
      let inserted = 0;
      for (const t of SAMPLE_TASKS) {
        const projectId = projectMap[t.project];
        if (!projectId) continue;
        const { project, ...rest } = t;
        const { error } = await supabase.from("tasks").insert({
          ...rest,
          project_id: projectId,
          organization_id: orgId,
          status: rest.status as any,
          priority: rest.priority as any,
        });
        if (!error) inserted++;
      }
      qc.invalidateQueries({ queryKey: ["tasks"] });
      markDone("tasks");
      toast.success(`Seeded ${inserted} tasks`);
    } finally { markLoading("tasks", false); }
  };

  const seedAll = async () => {
    await seedManufacturers();
    await seedDroneModels();
    await seedPayloads();
    await seedSkills();
    await seedProjectTemplates();
    await seedClients();
    await seedProjects();
    await seedInvoices();
    await seedFleetDrones();
    await seedMissions();
    await seedFlightLogs();
    await seedDeliverables();
    await seedTasks();
  };

  const anyLoading = Object.values(loading).some(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-title mb-0">Seed Starter Data</p>
          <p className="text-sm text-muted-foreground mt-1">Populate your organization with realistic reference and operational data for a complete demo workflow.</p>
        </div>
        <button
          onClick={seedAll}
          disabled={anyLoading}
          className="h-9 px-5 bg-primary text-primary-foreground font-mono text-xs tracking-wide hover:opacity-90 disabled:opacity-50"
        >
          Seed All
        </button>
      </div>

      <div className="space-y-px">
        <SeedSection title="Drone Manufacturers" description="Major commercial UAS manufacturers (DJI, Skydio, Autel, etc.)" icon={Plane} count={MANUFACTURERS.length} loading={!!loading.mfr} done={!!done.mfr} onSeed={seedManufacturers} />
        <SeedSection title="Drone Models" description="Popular models with full technical specifications" icon={Plane} count={DRONE_MODELS.length} loading={!!loading.models} done={!!done.models} onSeed={seedDroneModels} />
        <SeedSection title="Payloads & Sensors" description="Thermal cameras, LiDAR, multispectral, photogrammetry sensors with model compatibility" icon={Package} count={PAYLOADS.length} loading={!!loading.payloads} done={!!done.payloads} onSeed={seedPayloads} />
        <SeedSection title="Skills & Certifications" description="Part 107, night ops, photogrammetry, LiDAR, thermal, and more" icon={Award} count={SKILLS.length} loading={!!loading.skills} done={!!done.skills} onSeed={seedSkills} />
        <SeedSection title="Project Templates" description="Rich templates with skills, drone categories, budget ranges, and risk notes" icon={FolderKanban} count={PROJECT_TEMPLATES_RICH.length} loading={!!loading.templates} done={!!done.templates} onSeed={seedProjectTemplates} />
        <SeedSection title="Sample Clients" description="Realistic client companies across solar, construction, utility, and agriculture" icon={Users} count={SAMPLE_CLIENTS.length} loading={!!loading.clients} done={!!done.clients} onSeed={seedClients} />
        <SeedSection title="Sample Projects" description="Active projects with geo-coordinates, budgets, and client links" icon={FileText} count={SAMPLE_PROJECTS.length} loading={!!loading.projects} done={!!done.projects} onSeed={seedProjects} />
        <SeedSection title="Sample Invoices" description="Invoices with line items linked to projects and clients" icon={DollarSign} count={SAMPLE_INVOICES.length} loading={!!loading.invoices} done={!!done.invoices} onSeed={seedInvoices} />
        <SeedSection title="Fleet Drones" description="Organization-owned drone units linked to catalog models" icon={Wrench} count={FLEET_DRONES.length} loading={!!loading.fleet} done={!!done.fleet} onSeed={seedFleetDrones} />
        <SeedSection title="Missions" description="Field missions with objectives, weather, airspace notes, and readiness status" icon={Target} count={SAMPLE_MISSIONS.length} loading={!!loading.missions} done={!!done.missions} onSeed={seedMissions} />
        <SeedSection title="Flight Logs" description="Completed flight records with outcomes, durations, and postflight notes" icon={ClipboardList} count={SAMPLE_FLIGHT_LOGS.length} loading={!!loading.flightlogs} done={!!done.flightlogs} onSeed={seedFlightLogs} />
        <SeedSection title="Project Deliverables" description="Expected and completed deliverables — thermal datasets, LiDAR, orthomosaics, reports" icon={BoxIcon} count={SAMPLE_DELIVERABLES.length} loading={!!loading.deliverables} done={!!done.deliverables} onSeed={seedDeliverables} />
        <SeedSection title="Project Tasks" description="Kanban tasks across projects — processing, reporting, coordination, compliance" icon={ListChecks} count={SAMPLE_TASKS.length} loading={!!loading.tasks} done={!!done.tasks} onSeed={seedTasks} />
      </div>
    </div>
  );
}
