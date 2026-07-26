import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, Eye, EyeOff, Filter, X, ChevronDown, ChevronRight, AlertTriangle, ExternalLink, Activity, ShieldAlert } from "lucide-react";
import { RISK_COLORS, DRONE_STATUS_COLORS } from "./mapConstants";
import { AdvisoryLayerState } from "./mapTypes";
import { AdvisoryLayersPanel } from "./AdvisoryLayersPanel";
import { AssetMapItem, AssetMapFilters } from "./useMapAssets";
import { RiskLevel } from "@/hooks/useInspectionIntelligence";
import { format } from "date-fns";

type Props = {
  advisoryLayers: AdvisoryLayerState;
  toggleAdvisoryLayer: (key: string) => void;
  filters: AssetMapFilters;
  setFilters: React.Dispatch<React.SetStateAction<AssetMapFilters>>;
  assets: AssetMapItem[];
  locatedAssets: AssetMapItem[];
  unlocatedAssets: AssetMapItem[];
  onFlyTo: (lat: number, lng: number) => void;
  selectedAsset: AssetMapItem | null;
  onSelectAsset: (asset: AssetMapItem | null) => void;
  showAssetPins: boolean;
  toggleAssetPins: () => void;
};

const RISK_OPTIONS: RiskLevel[] = ["low", "moderate", "high", "critical"];
const STATUS_OPTIONS = ["available", "in_use", "maintenance", "retired"];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#6b7280",
};

export const AssetsSidebar = ({
  advisoryLayers, toggleAdvisoryLayer, filters, setFilters,
  assets, locatedAssets, unlocatedAssets, onFlyTo,
  selectedAsset, onSelectAsset, showAssetPins, toggleAssetPins,
}: Props) => {
  const [expandedSection, setExpandedSection] = useState<string | null>("assets");
  const navigate = useNavigate();

  const toggleRisk = (r: RiskLevel) => {
    setFilters((prev) => ({
      ...prev,
      riskLevels: prev.riskLevels.includes(r) ? prev.riskLevels.filter((x) => x !== r) : [...prev.riskLevels, r],
    }));
  };

  const toggleStatus = (s: string) => {
    setFilters((prev) => ({
      ...prev,
      droneStatuses: prev.droneStatuses.includes(s) ? prev.droneStatuses.filter((x) => x !== s) : [...prev.droneStatuses, s],
    }));
  };

  const clearFilters = () => setFilters({ riskLevels: [], droneStatuses: [], projectIds: [] });
  const hasFilters = filters.riskLevels.length > 0 || filters.droneStatuses.length > 0;

  const toggleSection = (s: string) => setExpandedSection((prev) => prev === s ? null : s);

  return (
    <div className="w-80 border-l border-border bg-card overflow-y-auto shrink-0">
      {/* Layers */}
      <div className="p-4 border-b border-border">
        <p className="stat-label mb-0.5">Asset Data</p>
        <p className="font-mono text-[10px] text-muted-foreground mb-3">Fleet asset locations and condition</p>
        <button
          onClick={toggleAssetPins}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors"
        >
          <Cpu className={`w-3.5 h-3.5 ${showAssetPins ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`font-mono text-xs flex-1 text-left ${showAssetPins ? "text-foreground" : "text-muted-foreground"}`}>
            Asset Locations
          </span>
          {showAssetPins ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      </div>

      {/* Advisory */}
      <AdvisoryLayersPanel advisoryLayers={advisoryLayers} toggleAdvisoryLayer={toggleAdvisoryLayer} />

      {/* Filters */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="stat-label mb-0">Filters</p>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Risk Level</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {RISK_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => toggleRisk(r)}
              className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                filters.riskLevels.length === 0 || filters.riskLevels.includes(r)
                  ? "border-primary/50 text-foreground bg-primary/10"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: RISK_COLORS[r] }} />
              {r}
            </button>
          ))}
        </div>

        <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Drone Status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                filters.droneStatuses.length === 0 || filters.droneStatuses.includes(s)
                  ? "border-primary/50 text-foreground bg-primary/10"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: DRONE_STATUS_COLORS[s] || "#6b7280" }} />
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Asset List */}
      <div className="p-4 border-b border-border">
        <button onClick={() => toggleSection("assets")} className="flex items-center gap-2 w-full mb-3">
          {expandedSection === "assets" ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          <p className="stat-label mb-0">
            Assets <span className="text-primary">{assets.length}</span>
            {locatedAssets.length < assets.length && (
              <span className="text-muted-foreground ml-1">({locatedAssets.length} on map)</span>
            )}
          </p>
        </button>
        {expandedSection === "assets" && (
          assets.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No assets found.</p>
          ) : (
            <div className="space-y-1 max-h-[320px] overflow-y-auto">
              {assets.map((a) => {
                const isSelected = selectedAsset?.id === a.id;
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2 px-2 py-1.5 transition-colors group cursor-pointer ${
                      isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-secondary/50"
                    }`}
                    onClick={() => {
                      onSelectAsset(a);
                      if (a.latitude && a.longitude) onFlyTo(a.latitude, a.longitude);
                    }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: RISK_COLORS[a.riskLevel] }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-foreground truncate">{a.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">{a.model}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[9px] px-1 py-0.5" style={{ color: RISK_COLORS[a.riskLevel], background: `${RISK_COLORS[a.riskLevel]}15` }}>
                          {a.conditionScore}/100
                        </span>
                        {a.openIssues > 0 && (
                          <span className="font-mono text-[9px] text-warning">{a.openIssues} open</span>
                        )}
                        {!a.latitude && (
                          <span className="font-mono text-[9px] text-muted-foreground">no location</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/drones?unit=${a.id}`); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary"
                      title="View asset"
                    >
                      <ExternalLink className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Selected Asset Detail */}
      {selectedAsset && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="stat-label mb-0">Asset Detail</p>
            <button onClick={() => onSelectAsset(null)} className="font-mono text-[10px] text-primary hover:underline">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-mono text-xs font-medium text-foreground">{selectedAsset.name}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{selectedAsset.model}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Condition</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: RISK_COLORS[selectedAsset.riskLevel] }} />
                  <p className="font-mono text-[10px] font-medium" style={{ color: RISK_COLORS[selectedAsset.riskLevel] }}>
                    {selectedAsset.conditionScore}/100
                  </p>
                </div>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Risk</p>
                <p className="font-mono text-[10px] font-medium uppercase" style={{ color: RISK_COLORS[selectedAsset.riskLevel] }}>
                  {selectedAsset.riskLevel}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Status</p>
                <p className="font-mono text-[10px] text-foreground">{selectedAsset.status.replace("_", " ")}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Flights</p>
                <p className="font-mono text-[10px] text-foreground">{selectedAsset.totalFlights}</p>
              </div>
              {selectedAsset.lastFlightDate && (
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase">Last Flight</p>
                  <p className="font-mono text-[10px] text-foreground">{format(new Date(selectedAsset.lastFlightDate), "MMM d, yyyy")}</p>
                </div>
              )}
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Open Issues</p>
                <p className={`font-mono text-[10px] ${selectedAsset.openIssues > 0 ? "text-warning" : "text-foreground"}`}>
                  {selectedAsset.openIssues}{selectedAsset.criticalIssues > 0 && ` (${selectedAsset.criticalIssues} critical)`}
                </p>
              </div>
            </div>

            {selectedAsset.locationLabel && (
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">Last Known Location</p>
                <p className="font-mono text-[10px] text-foreground">{selectedAsset.locationLabel}</p>
                <p className="font-mono text-[9px] text-muted-foreground">via {selectedAsset.locationSource}</p>
              </div>
            )}

            {/* Condition Bar */}
            <div>
              <p className="font-mono text-[9px] text-muted-foreground uppercase mb-1">Condition Score</p>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${selectedAsset.conditionScore}%`,
                    background: RISK_COLORS[selectedAsset.riskLevel],
                  }}
                />
              </div>
            </div>

            {/* Recent Issues */}
            {selectedAsset.recentIssues.length > 0 && (
              <div>
                <p className="font-mono text-[9px] text-muted-foreground uppercase mb-1.5">Recent Findings</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedAsset.recentIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 px-2 py-1 bg-secondary/30">
                      <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: SEVERITY_COLORS[issue.severity] }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] text-foreground truncate">{issue.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-muted-foreground">{issue.category}</span>
                          <span className="font-mono text-[9px]" style={{ color: SEVERITY_COLORS[issue.severity] }}>{issue.severity}</span>
                          <span className={`font-mono text-[9px] ${issue.status === "open" ? "text-warning" : "text-muted-foreground"}`}>{issue.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAsset.recentIssues.length === 0 && (
              <div className="flex items-center gap-2 px-2 py-2 bg-secondary/30">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="font-mono text-[10px] text-muted-foreground">No inspection findings recorded</p>
              </div>
            )}

            <button
              onClick={() => navigate(`/drones?unit=${selectedAsset.id}`)}
              className="w-full h-7 flex items-center justify-center gap-2 font-mono text-[10px] bg-primary text-primary-foreground hover:opacity-80 transition-opacity"
            >
              <Cpu className="w-3 h-3" /> View Full Asset Detail
            </button>
          </div>
        </div>
      )}

      {/* Unlocated Assets */}
      {unlocatedAssets.length > 0 && !selectedAsset && (
        <div className="p-4 border-b border-border">
          <p className="stat-label mb-3">
            No Location Data <span className="text-warning">{unlocatedAssets.length}</span>
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mb-2">
            Assets without flight history — no map position available.
          </p>
        </div>
      )}

      {/* Advisory */}
      <div className="p-4">
        <p className="stat-label mb-3">Digital Twin Advisory</p>
        <div className="surface border border-border p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              Asset positions reflect last known flight location from mission data.
              Condition scores are derived from postflight inspection findings.
              This is not a live telemetry feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
