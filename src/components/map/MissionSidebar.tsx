import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MissionBriefExport } from "@/components/missions/MissionBriefExport";
import { MapPin, Crosshair, Eye, EyeOff, Filter, X, ChevronDown, ChevronRight, Clock, Shield, AlertTriangle, Edit2, FileText, LocateFixed } from "lucide-react";
import { MISSION_STATUS_COLORS, GO_STATUS_COLORS, MISSION_STATUS_OPTIONS } from "./mapConstants";
import { MapLayers, MissionMapFilters, MissionMapItem, AdvisoryLayerState } from "./mapTypes";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useMissionReadiness } from "@/hooks/useMissionReadiness";
import { MissionReadinessPanel } from "@/components/missions/MissionReadinessPanel";
import { PreflightChecklist } from "@/components/missions/PreflightChecklist";
import { AdvisoryLayersPanel } from "./AdvisoryLayersPanel";
import { MissionAdvisoryPanels } from "./MissionAdvisoryPanels";
import { MissionDroneViewer } from "./MissionDroneViewer";

type Props = {
  layers: MapLayers;
  toggleLayer: (key: keyof MapLayers) => void;
  advisoryLayers: AdvisoryLayerState;
  toggleAdvisoryLayer: (key: string) => void;
  filters: MissionMapFilters;
  setFilters: React.Dispatch<React.SetStateAction<MissionMapFilters>>;
  missions: MissionMapItem[];
  locatedMissions: MissionMapItem[];
  projectLocatedMissions: MissionMapItem[];
  projectOptions: { id: string; name: string }[];
  onFlyTo: (lat: number, lng: number) => void;
  onSelectMission: (mission: MissionMapItem) => void;
  selectedMission: MissionMapItem | null;
  onEditMission: (mission: MissionMapItem) => void;
};

export const MissionSidebar = ({
  layers, toggleLayer, advisoryLayers, toggleAdvisoryLayer, filters, setFilters, missions, locatedMissions, projectLocatedMissions, projectOptions, onFlyTo, onSelectMission, selectedMission, onEditMission
}: Props) => {
  const [expandedSection, setExpandedSection] = useState<string | null>("missions");
  const navigate = useNavigate();

  const toggleStatus = (s: string) => {
    setFilters((prev) => ({
      ...prev,
      missionStatuses: prev.missionStatuses.includes(s) ? prev.missionStatuses.filter((x) => x !== s) : [...prev.missionStatuses, s],
    }));
  };

  const toggleProject = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      projectIds: prev.projectIds.includes(id) ? prev.projectIds.filter((x) => x !== id) : [...prev.projectIds, id],
    }));
  };

  const clearFilters = () => setFilters({ missionStatuses: [], projectIds: [], dateFrom: "", dateTo: "", goStatus: "" });
  const hasFilters = filters.missionStatuses.length > 0 || filters.projectIds.length > 0 || filters.dateFrom || filters.dateTo || filters.goStatus;

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  const goLabel = (s: string) => s === "go" ? "GO" : s === "no_go" ? "NO-GO" : "PENDING";

  return (
    <div className="w-80 border-l border-border bg-card overflow-y-auto shrink-0">
      {/* Internal Mission Layers */}
      <div className="p-4 border-b border-border">
        <p className="stat-label mb-0.5">Mission Data</p>
        <p className="font-mono text-[10px] text-muted-foreground mb-3">Your organization's mission overlays</p>
        <div className="space-y-1">
          {([
            { key: "missionPins" as const, label: "Mission Locations", icon: Crosshair },
            { key: "missionFlightZones" as const, label: "Flight Zones", icon: MapPin },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors"
            >
              <Icon className={`w-3.5 h-3.5 ${layers[key] ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`font-mono text-xs flex-1 text-left ${layers[key] ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {layers[key] ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          ))}
        </div>
      </div>

      {/* Advisory Layers */}
      <AdvisoryLayersPanel advisoryLayers={advisoryLayers} toggleAdvisoryLayer={toggleAdvisoryLayer} />

      {/* Filters */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="stat-label mb-0">Mission Filters</p>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Mission Status</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {MISSION_STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                filters.missionStatuses.length === 0 || filters.missionStatuses.includes(s)
                  ? "border-primary/50 text-foreground bg-primary/10"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: MISSION_STATUS_COLORS[s] }} />
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Go/No-Go</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {["pending", "go", "no_go"].map((g) => (
            <button
              key={g}
              onClick={() => setFilters((p) => ({ ...p, goStatus: p.goStatus === g ? "" : g }))}
              className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                !filters.goStatus || filters.goStatus === g
                  ? "border-primary/50 text-foreground bg-primary/10"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: GO_STATUS_COLORS[g] }} />
              {goLabel(g)}
            </button>
          ))}
        </div>

        {projectOptions.length > 0 && (
          <>
            <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Project</p>
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto">
              {projectOptions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleProject(p.id)}
                  className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                    filters.projectIds.length === 0 || filters.projectIds.includes(p.id)
                      ? "border-primary/50 text-foreground bg-primary/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Mission Date</p>
        <div className="flex gap-2">
          <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} className="h-7 text-xs font-mono" />
          <Input type="date" value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} className="h-7 text-xs font-mono" />
        </div>
      </div>

      {/* Mission List */}
      <div className="p-4 border-b border-border">
        <button onClick={() => toggleSection("missions")} className="flex items-center gap-2 w-full mb-3">
          {expandedSection === "missions" ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          <p className="stat-label mb-0">
            Missions <span className="text-primary">{missions.length}</span>
          </p>
        </button>
        {expandedSection === "missions" && (
          missions.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No missions found.</p>
          ) : (
            <div className="space-y-1 max-h-[320px] overflow-y-auto">
              {missions.map((m) => {
                const lat = m.latitude || m.projects?.latitude;
                const lng = m.longitude || m.projects?.longitude;
                const isSelected = selectedMission?.id === m.id;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-2 px-2 py-1.5 transition-colors group cursor-pointer ${isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-secondary/50"}`}
                    onClick={() => {
                      onSelectMission(m);
                      if (lat && lng) onFlyTo(lat, lng);
                    }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: MISSION_STATUS_COLORS[m.status] }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-foreground truncate">{m.title}</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">{m.projects?.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.mission_date && (
                          <span className="font-mono text-[9px] text-muted-foreground">{format(new Date(m.mission_date), "MMM d")}</span>
                        )}
                        <span className="font-mono text-[9px] px-1 py-0.5" style={{ color: GO_STATUS_COLORS[m.go_status], background: `${GO_STATUS_COLORS[m.go_status]}15` }}>
                          {goLabel(m.go_status)}
                        </span>
                        {!m.latitude && !m.longitude && m.projects?.latitude && (
                          <span className="font-mono text-[9px] text-warning flex items-center gap-0.5" title="Using project coordinates">
                            <LocateFixed className="w-2.5 h-2.5" /> proj
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditMission(m); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary"
                      title="Edit mission"
                    >
                      <Edit2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Selected Mission Detail */}
      {selectedMission && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label mb-0">Mission Detail</p>
            <button onClick={() => onSelectMission(null as any)} className="font-mono text-[10px] text-primary hover:underline">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-mono text-xs font-medium text-foreground">{selectedMission.title}</p>
              {selectedMission.projects?.name && (
                <button
                  onClick={() => navigate(`/projects/${selectedMission.project_id}`)}
                  className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                >
                  {selectedMission.projects.name} →
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Status</p>
                <p className="font-mono text-[10px]" style={{ color: MISSION_STATUS_COLORS[selectedMission.status] }}>
                  {selectedMission.status.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Go Status</p>
                <p className="font-mono text-[10px]" style={{ color: GO_STATUS_COLORS[selectedMission.go_status] }}>
                  {goLabel(selectedMission.go_status)}
                </p>
              </div>
              {selectedMission.mission_date && (
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase">Date</p>
                  <p className="font-mono text-[10px] text-foreground">{format(new Date(selectedMission.mission_date), "MMM d, yyyy")}</p>
                </div>
              )}
              {selectedMission.flight_duration_estimate_min && (
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase">Duration</p>
                  <p className="font-mono text-[10px] text-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{selectedMission.flight_duration_estimate_min}min
                  </p>
                </div>
              )}
            </div>

            {selectedMission.objective && (
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Objective</p>
                <p className="font-mono text-[10px] text-foreground leading-relaxed">{selectedMission.objective}</p>
              </div>
            )}

            {selectedMission.launch_location && (
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Launch Point</p>
                <p className="font-mono text-[10px] text-foreground">{selectedMission.launch_location}</p>
              </div>
            )}

            {selectedMission.target_area && (
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Target Area</p>
                <p className="font-mono text-[10px] text-foreground">{selectedMission.target_area}</p>
              </div>
            )}

            {selectedMission.altitude_notes && (
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Altitude Notes</p>
                <p className="font-mono text-[10px] text-foreground">{selectedMission.altitude_notes}</p>
              </div>
            )}

            {(selectedMission.risk_notes || selectedMission.weather_notes || selectedMission.airspace_notes) && (
              <div className="space-y-2 pt-1 border-t border-border">
                {selectedMission.risk_notes && (
                  <div className="flex items-start gap-2">
                    <Shield className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-mono text-[9px] text-muted-foreground uppercase">Risk</p>
                      <p className="font-mono text-[10px] text-foreground">{selectedMission.risk_notes}</p>
                    </div>
                  </div>
                )}
                {selectedMission.weather_notes && (
                  <div>
                    <p className="font-mono text-[9px] text-muted-foreground uppercase">Weather</p>
                    <p className="font-mono text-[10px] text-foreground">{selectedMission.weather_notes}</p>
                  </div>
                )}
                {selectedMission.airspace_notes && (
                  <div>
                    <p className="font-mono text-[9px] text-muted-foreground uppercase">Airspace</p>
                    <p className="font-mono text-[10px] text-foreground">{selectedMission.airspace_notes}</p>
                  </div>
                )}
              </div>
            )}

            {selectedMission.readiness_notes && (
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Readiness</p>
                <p className="font-mono text-[10px] text-foreground">{selectedMission.readiness_notes}</p>
              </div>
            )}

            {selectedMission.postflight_notes && (
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Postflight Notes</p>
                <p className="font-mono text-[10px] text-foreground">{selectedMission.postflight_notes}</p>
              </div>
            )}

            <MissionDroneViewer missionId={selectedMission.id} />

            <MissionReadinessInline mission={selectedMission} />

            <PreflightChecklist missionId={selectedMission.id} mission={selectedMission} />

            <MissionAdvisoryPanels mission={selectedMission} />

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditMission(selectedMission)}
                className="flex-1 h-7 flex items-center justify-center gap-2 font-mono text-[10px] bg-primary text-primary-foreground hover:opacity-80 transition-opacity"
              >
                <Edit2 className="w-3 h-3" /> Edit Mission Plan
              </button>
              <MissionBriefExport missionId={selectedMission.id} missionTitle={selectedMission.title} />
            </div>
          </div>
        </div>
      )}

      {/* Advisory */}
      <div className="p-4">
        <p className="stat-label mb-3">Planning Advisory</p>
        <div className="surface border border-border p-3">
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              Mission plans are linked to projects. Mission coordinates override project coordinates when set.
              Always verify airspace, weather, and TFRs before marking Go status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function MissionReadinessInline({ mission }: { mission: MissionMapItem }) {
  const readiness = useMissionReadiness(mission.id, mission);
  return <MissionReadinessPanel readiness={readiness} title="Readiness" />;
}
