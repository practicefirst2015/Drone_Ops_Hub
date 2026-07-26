import { MapPin, Navigation, AlertTriangle, Eye, EyeOff, Filter, X, Edit2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { STATUS_COLORS } from "./mapConstants";
import { ProjectWithLocation, MapLayers, MapFilters, AdvisoryLayerState } from "./mapTypes";
import { Input } from "@/components/ui/input";
import { AdvisoryLayersPanel } from "./AdvisoryLayersPanel";

type Props = {
  layers: MapLayers;
  toggleLayer: (key: keyof MapLayers) => void;
  advisoryLayers: AdvisoryLayerState;
  toggleAdvisoryLayer: (key: string) => void;
  filters: MapFilters;
  setFilters: React.Dispatch<React.SetStateAction<MapFilters>>;
  locatedProjects: ProjectWithLocation[];
  unlocatedProjects: ProjectWithLocation[];
  clientOptions: { id: string; name: string }[];
  onFlyTo: (lat: number, lng: number) => void;
  onEditLocation: (project: ProjectWithLocation) => void;
};

const STATUS_OPTIONS = ["active", "draft", "pending", "complete", "archived"];

export const MapSidebar = ({ layers, toggleLayer, advisoryLayers, toggleAdvisoryLayer, filters, setFilters, locatedProjects, unlocatedProjects, clientOptions, onFlyTo, onEditLocation }: Props) => {
  const navigate = useNavigate();
  const toggleStatus = (s: string) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(s) ? prev.statuses.filter((x) => x !== s) : [...prev.statuses, s],
    }));
  };

  const toggleClient = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      clientIds: prev.clientIds.includes(id) ? prev.clientIds.filter((x) => x !== id) : [...prev.clientIds, id],
    }));
  };

  const clearFilters = () => setFilters({ statuses: [], clientIds: [], dateFrom: "", dateTo: "" });
  const hasFilters = filters.statuses.length > 0 || filters.clientIds.length > 0 || filters.dateFrom || filters.dateTo;

  return (
    <div className="w-80 border-l border-border bg-card overflow-y-auto shrink-0">
      {/* Layers */}
      <div className="p-4 border-b border-border">
        <p className="stat-label mb-1">Map Layers</p>
        <p className="font-mono text-[10px] text-muted-foreground mb-3">Toggle data overlays on map</p>
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Project Data</p>
          {([
            { key: "projectPins" as const, label: "Project Locations", icon: MapPin },
            { key: "flightAreas" as const, label: "Planned Mission Areas", icon: Navigation },
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
            <p className="stat-label mb-0">Filters</p>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Status</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                filters.statuses.length === 0 || filters.statuses.includes(s)
                  ? "border-primary/50 text-foreground bg-primary/10"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: STATUS_COLORS[s] }} />
              {s}
            </button>
          ))}
        </div>

        {clientOptions.length > 0 && (
          <>
            <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Client</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {clientOptions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleClient(c.id)}
                  className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                    filters.clientIds.length === 0 || filters.clientIds.includes(c.id)
                      ? "border-primary/50 text-foreground bg-primary/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Date Range</p>
        <div className="flex gap-2">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
            className="h-7 text-xs font-mono"
            placeholder="From"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
            className="h-7 text-xs font-mono"
            placeholder="To"
          />
        </div>
      </div>

      {/* Located Projects */}
      <div className="p-4 border-b border-border">
        <p className="stat-label mb-3">
          Projects on Map <span className="text-primary">{locatedProjects.length}</span>
        </p>
        {locatedProjects.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            No projects with locations set. Edit a project to add coordinates.
          </p>
        ) : (
          <div className="space-y-1">
            {locatedProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 transition-colors group">
                <button
                  onClick={() => p.latitude && p.longitude && onFlyTo(p.latitude, p.longitude)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[p.status] }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-foreground truncate">{p.name}</p>
                    {p.location_name && <p className="font-mono text-[10px] text-muted-foreground truncate">{p.location_name}</p>}
                    {p.clients?.name && <p className="font-mono text-[10px] text-muted-foreground/60 truncate">{p.clients.name}</p>}
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary"
                  title="View project"
                >
                  <ExternalLink className="w-3 h-3 text-primary" />
                </button>
                <button
                  onClick={() => onEditLocation(p)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary"
                  title="Edit location"
                >
                  <Edit2 className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unlocated */}
      {unlocatedProjects.length > 0 && (
        <div className="p-4 border-b border-border">
          <p className="stat-label mb-3">
            Needs Location <span className="text-warning">{unlocatedProjects.length}</span>
          </p>
          <div className="space-y-1">
            {unlocatedProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => onEditLocation(p)}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 transition-colors text-left group"
              >
                <div className="w-2 h-2 rounded-full shrink-0 bg-muted-foreground" />
                <p className="font-mono text-xs text-muted-foreground truncate flex-1">{p.name}</p>
                <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advisory */}
      <div className="p-4">
        <p className="stat-label mb-3">Airspace Advisory</p>
        <div className="surface border border-border p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              Always check FAA LAANC and local TFRs before flight operations. Class B/C/D airspace
              requires prior authorization. Zones shown are approximate and for planning reference only.
              This map does not provide live telemetry or real-time airspace data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
