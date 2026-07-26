import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, Crosshair, MapPin, Maximize2, Cpu } from "lucide-react";
import { STATUS_COLORS, MISSION_STATUS_COLORS, GO_STATUS_COLORS, RISK_COLORS, TILE_LAYERS, AIRSPACE_ZONES } from "@/components/map/mapConstants";
import { MapLayers, MapFilters, MissionMapFilters, MissionMapItem, MapViewMode, ProjectWithLocation, AdvisoryLayerState } from "@/components/map/mapTypes";
import { useMapProjects } from "@/components/map/useMapProjects";
import { useMapMissions } from "@/components/map/useMapMissions";
import { useMapAssets, AssetMapItem, AssetMapFilters } from "@/components/map/useMapAssets";
import { MapSidebar } from "@/components/map/MapSidebar";
import { MissionSidebar } from "@/components/map/MissionSidebar";
import { AssetsSidebar } from "@/components/map/AssetsSidebar";
import { MapLegend } from "@/components/map/MapLegend";
import { MissionLegend } from "@/components/map/MissionLegend";
import { AssetLegend } from "@/components/map/AssetLegend";
import { EditLocationDialog } from "@/components/map/EditLocationDialog";
import { EditMissionDialog } from "@/components/map/EditMissionDialog";
import { useOrg } from "@/contexts/OrgContext";

const MapPage = () => {
  const { currentOrg } = useOrg();
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const areasLayerRef = useRef<L.LayerGroup | null>(null);
  const airspaceLayerRef = useRef<L.LayerGroup | null>(null);
  const missionLayerRef = useRef<L.LayerGroup | null>(null);
  const assetLayerRef = useRef<L.LayerGroup | null>(null);
  const initialFitDoneRef = useRef(false);

  const [viewMode, setViewMode] = useState<MapViewMode>("projects");
  const [layers, setLayers] = useState<MapLayers>({
    projectPins: true,
    flightAreas: true,
    missionPins: true,
    missionFlightZones: true,
  });
  const [advisoryLayers, setAdvisoryLayers] = useState<AdvisoryLayerState>({
    class_b_airspace: true,
  });
  const [baseLayer, setBaseLayer] = useState<"dark" | "satellite" | "street">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState<MapFilters>({ statuses: [], clientIds: [], dateFrom: "", dateTo: "" });
  const [missionFilters, setMissionFilters] = useState<MissionMapFilters>({ missionStatuses: [], projectIds: [], dateFrom: "", dateTo: "", goStatus: "" });
  const [assetFilters, setAssetFilters] = useState<AssetMapFilters>({ riskLevels: [], droneStatuses: [], projectIds: [] });
  const [editProject, setEditProject] = useState<ProjectWithLocation | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<MissionMapItem | null>(null);
  const [editMission, setEditMission] = useState<MissionMapItem | null>(null);
  const [editMissionOpen, setEditMissionOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetMapItem | null>(null);
  const [showAssetPins, setShowAssetPins] = useState(true);

  const { locatedProjects, unlocatedProjects, clientOptions } = useMapProjects(filters);
  const { missions, locatedMissions, projectLocatedMissions, projectOptions } = useMapMissions(missionFilters);
  const { assets, locatedAssets, unlocatedAssets } = useMapAssets(assetFilters);

  const flyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo([lat, lng], 14, { duration: 1.2 });
  }, []);

  const handleEditLocation = useCallback((project: ProjectWithLocation) => {
    setEditProject(project);
    setEditOpen(true);
  }, []);

  const handleEditMission = useCallback((mission: MissionMapItem) => {
    setEditMission(mission);
    setEditMissionOpen(true);
  }, []);

  const fitToData = useCallback(() => {
    if (!mapRef.current) return;
    if (viewMode === "projects" && locatedProjects.length > 0) {
      const bounds = L.latLngBounds(locatedProjects.map((p) => [p.latitude!, p.longitude!] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
    } else if (viewMode === "missions") {
      const allMissions = [
        ...locatedMissions.map((m) => [m.latitude!, m.longitude!] as [number, number]),
        ...projectLocatedMissions.map((m) => [m.projects!.latitude!, m.projects!.longitude!] as [number, number]),
      ];
      if (allMissions.length > 0) {
        mapRef.current.fitBounds(L.latLngBounds(allMissions), { padding: [60, 60], maxZoom: 12 });
      }
    } else if (viewMode === "assets" && locatedAssets.length > 0) {
      const bounds = L.latLngBounds(locatedAssets.map((a) => [a.latitude!, a.longitude!] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
    }
  }, [viewMode, locatedProjects, locatedMissions, projectLocatedMissions, locatedAssets]);

  // Reset initial fit when view mode changes
  useEffect(() => {
    initialFitDoneRef.current = false;
  }, [viewMode]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [39.8283, -98.5795], zoom: 4, zoomControl: false });
    tileLayerRef.current = L.tileLayer(TILE_LAYERS.dark.url, { attribution: TILE_LAYERS.dark.attribution }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    areasLayerRef.current = L.layerGroup().addTo(map);
    airspaceLayerRef.current = L.layerGroup().addTo(map);
    missionLayerRef.current = L.layerGroup().addTo(map);
    assetLayerRef.current = L.layerGroup().addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.on("popupopen", (e: L.PopupEvent) => {
      const container = e.popup.getElement();
      if (!container) return;
      container.querySelectorAll<HTMLAnchorElement>("a[data-nav-path]").forEach((link) => {
        link.addEventListener("click", (ev) => {
          ev.preventDefault();
          const path = link.getAttribute("data-nav-path");
          if (path) navigate(path);
        });
      });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update tile layer
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(TILE_LAYERS[baseLayer].url);
  }, [baseLayer]);

  // Update project markers (only in projects view)
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    if (viewMode !== "projects" || !layers.projectPins) return;

    locatedProjects.forEach((p) => {
      const color = STATUS_COLORS[p.status] || "#6b7280";
      const marker = L.circleMarker([p.latitude!, p.longitude!], {
        radius: 8, color, fillColor: color, fillOpacity: 0.8, weight: 2,
      });
      marker.bindPopup(`
        <div style="font-family:monospace;font-size:12px;min-width:200px">
          <div style="font-weight:600;margin-bottom:4px">${p.name}</div>
          ${p.location_name ? `<div style="color:#999;margin-bottom:2px">${p.location_name}</div>` : ""}
          <div style="color:#999">Status: <span style="color:${color}">${p.status}</span></div>
          ${p.clients?.name ? `<div style="color:#999">Client: ${p.clients.name}</div>` : ""}
          ${p.flight_altitude_m ? `<div style="color:#999">Alt: ${p.flight_altitude_m}m AGL</div>` : ""}
          ${p.flight_radius_m ? `<div style="color:#999">Radius: ${p.flight_radius_m}m</div>` : ""}
          <div style="margin-top:6px;display:flex;gap:6px">
            <a href="#" data-nav-path="/projects/${p.id}" style="color:#00e5ff;font-size:11px;text-decoration:none;cursor:pointer">View Project →</a>
          </div>
        </div>
      `);
      markersLayerRef.current!.addLayer(marker);
    });

    if (!initialFitDoneRef.current && locatedProjects.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(locatedProjects.map((p) => [p.latitude!, p.longitude!] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
      initialFitDoneRef.current = true;
    }
  }, [locatedProjects, layers.projectPins, viewMode]);

  // Update flight areas (projects view)
  useEffect(() => {
    if (!areasLayerRef.current) return;
    areasLayerRef.current.clearLayers();
    if (viewMode !== "projects" || !layers.flightAreas) return;

    locatedProjects
      .filter((p) => p.flight_radius_m && p.status !== "archived" && p.status !== "complete")
      .forEach((p) => {
        const color = STATUS_COLORS[p.status] || "#6b7280";
        L.circle([p.latitude!, p.longitude!], {
          radius: p.flight_radius_m!, color, fillColor: color, fillOpacity: 0.08, weight: 1, dashArray: "6 4",
        }).addTo(areasLayerRef.current!);
      });
  }, [locatedProjects, layers.flightAreas, viewMode]);

  // Update airspace zones (all views)
  useEffect(() => {
    if (!airspaceLayerRef.current) return;
    airspaceLayerRef.current.clearLayers();
    if (!advisoryLayers.class_b_airspace) return;

    AIRSPACE_ZONES.forEach((zone) => {
      const circle = L.circle(zone.center, {
        radius: zone.radius, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.06, weight: 1, dashArray: "4 6",
      });
      circle.bindPopup(`
        <div style="font-family:monospace;font-size:12px">
          <div style="font-weight:600;color:#ef4444">${zone.label}</div>
          <div style="color:#999;font-size:11px">Advisory — Restricted Airspace (Approximate)</div>
          <div style="color:#999;font-size:10px;margin-top:4px">Authorization required. Verify with FAA LAANC.</div>
        </div>
      `);
      airspaceLayerRef.current!.addLayer(circle);
    });
  }, [advisoryLayers.class_b_airspace]);

  // Update mission markers (missions view)
  useEffect(() => {
    if (!missionLayerRef.current) return;
    missionLayerRef.current.clearLayers();
    if (viewMode !== "missions") return;

    const allMissions = [
      ...locatedMissions.map((m) => ({ ...m, lat: m.latitude!, lng: m.longitude!, source: "mission" as const })),
      ...projectLocatedMissions.map((m) => ({ ...m, lat: m.projects!.latitude!, lng: m.projects!.longitude!, source: "project" as const })),
    ];

    if (layers.missionPins) {
      allMissions.forEach((m) => {
        const color = MISSION_STATUS_COLORS[m.status] || "#6b7280";
        const goColor = GO_STATUS_COLORS[m.go_status] || "#f59e0b";
        const isSelected = selectedMission?.id === m.id;

        const marker = L.circleMarker([m.lat, m.lng], {
          radius: isSelected ? 12 : 8,
          color: isSelected ? "#ffffff" : color,
          fillColor: color,
          fillOpacity: isSelected ? 1 : 0.8,
          weight: isSelected ? 3 : 2,
        });

        const goLabel = m.go_status === "go" ? "GO" : m.go_status === "no_go" ? "NO-GO" : "PENDING";
        marker.bindPopup(`
          <div style="font-family:monospace;font-size:12px;min-width:220px">
            <div style="font-weight:600;margin-bottom:4px">${m.title}</div>
            <div style="color:#999;margin-bottom:2px">${m.projects?.name || ""}</div>
            <div style="color:#999">Status: <span style="color:${color}">${m.status.replace("_", " ")}</span></div>
            <div style="color:#999">Go: <span style="color:${goColor}">${goLabel}</span></div>
            ${m.mission_date ? `<div style="color:#999">Date: ${m.mission_date}</div>` : ""}
            ${m.launch_location ? `<div style="color:#999">Launch: ${m.launch_location}</div>` : ""}
            ${m.target_area ? `<div style="color:#999">Target: ${m.target_area}</div>` : ""}
            ${m.source === "project" ? `<div style="color:#f59e0b;font-size:10px;margin-top:4px">📍 Using project location</div>` : ""}
            <div style="margin-top:6px;display:flex;gap:8px">
              ${m.project_id ? `<a href="#" data-nav-path="/projects/${m.project_id}" style="color:#00e5ff;font-size:11px;text-decoration:none;cursor:pointer">View Project →</a>` : ""}
            </div>
          </div>
        `);
        missionLayerRef.current!.addLayer(marker);
      });
    }

    if (layers.missionFlightZones) {
      allMissions.forEach((m) => {
        const radius = m.projects?.flight_radius_m;
        if (!radius) return;
        const color = MISSION_STATUS_COLORS[m.status] || "#8b5cf6";
        L.circle([m.lat, m.lng], {
          radius, color, fillColor: color, fillOpacity: 0.06, weight: 1, dashArray: "8 4",
        }).addTo(missionLayerRef.current!);
      });
    }

    if (!initialFitDoneRef.current && allMissions.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(allMissions.map((m) => [m.lat, m.lng] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
      initialFitDoneRef.current = true;
    }
  }, [locatedMissions, projectLocatedMissions, layers.missionPins, layers.missionFlightZones, viewMode, selectedMission]);

  // Update asset markers (assets view)
  useEffect(() => {
    if (!assetLayerRef.current) return;
    assetLayerRef.current.clearLayers();
    if (viewMode !== "assets" || !showAssetPins) return;

    locatedAssets.forEach((a) => {
      const color = RISK_COLORS[a.riskLevel] || "#6b7280";
      const isSelected = selectedAsset?.id === a.id;

      // Outer ring for risk emphasis on high/critical
      if (a.riskLevel === "critical" || a.riskLevel === "high") {
        L.circleMarker([a.latitude!, a.longitude!], {
          radius: 14, color, fillColor: color, fillOpacity: 0.15, weight: 1,
        }).addTo(assetLayerRef.current!);
      }

      const marker = L.circleMarker([a.latitude!, a.longitude!], {
        radius: isSelected ? 12 : 8,
        color: isSelected ? "#ffffff" : color,
        fillColor: color,
        fillOpacity: isSelected ? 1 : 0.85,
        weight: isSelected ? 3 : 2,
      });

      const issuesSummary = a.openIssues > 0
        ? `<div style="color:#f59e0b">Open Issues: ${a.openIssues}${a.criticalIssues > 0 ? ` (${a.criticalIssues} critical)` : ""}</div>`
        : "";

      marker.bindPopup(`
        <div style="font-family:monospace;font-size:12px;min-width:200px">
          <div style="font-weight:600;margin-bottom:4px">${a.name}</div>
          <div style="color:#999;margin-bottom:2px">${a.model}</div>
          <div style="color:#999">Condition: <span style="color:${color};font-weight:600">${a.conditionScore}/100</span></div>
          <div style="color:#999">Risk: <span style="color:${color};text-transform:uppercase">${a.riskLevel}</span></div>
          <div style="color:#999">Status: ${a.status.replace("_", " ")}</div>
          <div style="color:#999">Flights: ${a.totalFlights}</div>
          ${issuesSummary}
          ${a.locationLabel ? `<div style="color:#666;font-size:10px;margin-top:4px">📍 ${a.locationLabel} (via ${a.locationSource})</div>` : ""}
          <div style="margin-top:6px">
            <a href="#" data-nav-path="/drones?unit=${a.id}" style="color:#00e5ff;font-size:11px;text-decoration:none;cursor:pointer">View Asset →</a>
          </div>
        </div>
      `);
      assetLayerRef.current!.addLayer(marker);
    });

    if (!initialFitDoneRef.current && locatedAssets.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(locatedAssets.map((a) => [a.latitude!, a.longitude!] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
      initialFitDoneRef.current = true;
    }
  }, [locatedAssets, showAssetPins, viewMode, selectedAsset]);

  const toggleLayer = (key: keyof MapLayers) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAdvisoryLayer = (key: string) => setAdvisoryLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const viewModeLabel = viewMode === "projects"
    ? "Project locations and planned mission areas · Advisory airspace for reference only"
    : viewMode === "missions"
    ? "Mission planning view · Select missions to view operational details"
    : "Fleet asset positions and condition indicators · Last known flight locations";

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
        <div>
          <p className="stat-label mb-1">Operations</p>
          <h1 className="page-title">
            {viewMode === "assets" ? "Operational Digital Twin" : "Airspace & Public Flight Awareness"}
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">{viewModeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border">
            <button
              onClick={() => setViewMode("projects")}
              className={`h-9 px-3 font-mono text-xs tracking-wide flex items-center gap-2 transition-all ${
                viewMode === "projects" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Projects
            </button>
            <button
              onClick={() => setViewMode("missions")}
              className={`h-9 px-3 font-mono text-xs tracking-wide flex items-center gap-2 transition-all ${
                viewMode === "missions" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              Missions
            </button>
            <button
              onClick={() => setViewMode("assets")}
              className={`h-9 px-3 font-mono text-xs tracking-wide flex items-center gap-2 transition-all ${
                viewMode === "assets" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Assets
            </button>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 px-3 bg-secondary text-secondary-foreground font-mono text-xs tracking-wide flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Layers className="w-3.5 h-3.5" />
            Layers
          </button>
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" style={{ background: "hsl(240 10% 5%)" }} />
          {viewMode === "projects" ? <MapLegend /> : viewMode === "missions" ? <MissionLegend /> : <AssetLegend />}
          <div className="absolute top-4 right-4 z-[1000] flex gap-1">
            <button
              onClick={fitToData}
              className="h-8 px-3 font-mono text-[10px] tracking-wider uppercase bg-card/90 text-muted-foreground hover:text-foreground border border-border transition-all flex items-center gap-1.5"
              title="Fit map to all data points"
            >
              <Maximize2 className="w-3 h-3" />
              Fit
            </button>
            {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((key) => (
              <button
                key={key}
                onClick={() => setBaseLayer(key)}
                className={`h-8 px-3 font-mono text-[10px] tracking-wider uppercase transition-all ${
                  baseLayer === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/90 text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {TILE_LAYERS[key].label}
              </button>
            ))}
          </div>
        </div>

        {sidebarOpen && viewMode === "projects" && (
          <MapSidebar
            layers={layers}
            toggleLayer={toggleLayer}
            advisoryLayers={advisoryLayers}
            toggleAdvisoryLayer={toggleAdvisoryLayer}
            filters={filters}
            setFilters={setFilters}
            locatedProjects={locatedProjects}
            unlocatedProjects={unlocatedProjects}
            clientOptions={clientOptions}
            onFlyTo={flyTo}
            onEditLocation={handleEditLocation}
          />
        )}

        {sidebarOpen && viewMode === "missions" && (
          <MissionSidebar
            layers={layers}
            toggleLayer={toggleLayer}
            advisoryLayers={advisoryLayers}
            toggleAdvisoryLayer={toggleAdvisoryLayer}
            filters={missionFilters}
            setFilters={setMissionFilters}
            missions={missions}
            locatedMissions={locatedMissions}
            projectLocatedMissions={projectLocatedMissions}
            projectOptions={projectOptions}
            onFlyTo={flyTo}
            onSelectMission={setSelectedMission}
            selectedMission={selectedMission}
            onEditMission={handleEditMission}
          />
        )}

        {sidebarOpen && viewMode === "assets" && (
          <AssetsSidebar
            advisoryLayers={advisoryLayers}
            toggleAdvisoryLayer={toggleAdvisoryLayer}
            filters={assetFilters}
            setFilters={setAssetFilters}
            assets={assets}
            locatedAssets={locatedAssets}
            unlocatedAssets={unlocatedAssets}
            onFlyTo={flyTo}
            selectedAsset={selectedAsset}
            onSelectAsset={setSelectedAsset}
            showAssetPins={showAssetPins}
            toggleAssetPins={() => setShowAssetPins((p) => !p)}
          />
        )}
      </div>

      <EditLocationDialog
        project={editProject}
        open={editOpen}
        onOpenChange={setEditOpen}
        orgId={currentOrg?.id || ""}
      />

      <EditMissionDialog
        mission={editMission}
        open={editMissionOpen}
        onOpenChange={setEditMissionOpen}
      />
    </div>
  );
};

export default MapPage;
