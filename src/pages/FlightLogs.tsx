import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList, CheckCircle2, AlertTriangle, XCircle, Clock, Calendar, Users, Plane, MapPin, Filter, X, Plus, Pencil, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { useFlightLogs } from "@/hooks/useFlightLogs";
import { Input } from "@/components/ui/input";
import { FlightLogFormDialog } from "@/components/flightlogs/FlightLogFormDialog";

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "text-success", icon: CheckCircle2 },
  partial: { label: "Partial", color: "text-warning", icon: AlertTriangle },
  aborted: { label: "Aborted", color: "text-destructive", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-muted-foreground", icon: XCircle },
};

const OUTCOME_OPTIONS = ["completed", "partial", "aborted", "cancelled"];

export default function FlightLogs() {
  const { data: logs = [], isLoading } = useFlightLogs();
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string[]>([]);
  const [pilotFilter, setPilotFilter] = useState("");
  const [droneFilter, setDroneFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Record<string, any> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      openCreate();
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Derive unique pilots, drones, projects for filter dropdowns
  const filterOptions = useMemo(() => {
    const allLogs = logs as any[];
    const pilots = new Map<string, string>();
    const drones = new Map<string, string>();
    const projects = new Map<string, string>();
    allLogs.forEach(l => {
      if (l.pilot_id && l.profiles?.full_name) pilots.set(l.pilot_id, l.profiles.full_name);
      if (l.drone_model_id && l.drone_models) {
        const label = `${l.drone_models.drone_manufacturers?.name || ""} ${l.drone_models.name}`.trim();
        drones.set(l.drone_model_id, label);
      }
      if (l.project_id && l.projects?.name) projects.set(l.project_id, l.projects.name);
    });
    return {
      pilots: Array.from(pilots, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      drones: Array.from(drones, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      projects: Array.from(projects, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [logs]);

  const filtered = useMemo(() => {
    let result = logs as any[];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.projects?.name?.toLowerCase().includes(q) ||
          l.missions?.title?.toLowerCase().includes(q)
      );
    }
    if (outcomeFilter.length > 0) {
      result = result.filter((l) => outcomeFilter.includes(l.outcome));
    }
    if (pilotFilter) {
      result = result.filter((l) => l.pilot_id === pilotFilter);
    }
    if (droneFilter) {
      result = result.filter((l) => l.drone_model_id === droneFilter);
    }
    if (projectFilter) {
      result = result.filter((l) => l.project_id === projectFilter);
    }
    if (dateFrom) {
      result = result.filter((l) => l.flight_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((l) => l.flight_date <= dateTo);
    }
    return result;
  }, [logs, search, outcomeFilter, pilotFilter, droneFilter, projectFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const all = logs as any[];
    return {
      total: all.length,
      completed: all.filter((l) => l.outcome === "completed").length,
      totalHours: all.reduce((sum, l) => sum + (Number(l.flight_hours_contribution) || 0), 0),
      incidents: all.filter((l) => l.incidents).length,
    };
  }, [logs]);

  const toggleOutcome = (o: string) =>
    setOutcomeFilter((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  const clearFilters = () => { setOutcomeFilter([]); setSearch(""); setPilotFilter(""); setDroneFilter(""); setProjectFilter(""); setDateFrom(""); setDateTo(""); };
  const hasFilters = outcomeFilter.length > 0 || search || pilotFilter || droneFilter || projectFilter || dateFrom || dateTo;

  function openCreate() {
    setEditingLog(null);
    setDialogOpen(true);
  }

  function openEdit(log: any) {
    setEditingLog(log);
    setDialogOpen(true);
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-title">Flight History</p>
          <h1 className="page-title">Flight Logs</h1>
        </div>
        <button onClick={openCreate} className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <Plus className="w-3.5 h-3.5" /> New Flight Log
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="surface border border-border p-5">
          <p className="stat-label">Total Flights</p>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="surface border border-border p-5">
          <p className="stat-label text-success">Completed</p>
          <p className="stat-value">{stats.completed}</p>
        </div>
        <div className="surface border border-border p-5">
          <p className="stat-label">Total Hours</p>
          <p className="stat-value">{stats.totalHours.toFixed(1)}</p>
        </div>
        <div className="surface border border-border p-5">
          <p className="stat-label text-warning">With Incidents</p>
          <p className="stat-value">{stats.incidents}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="surface border border-border p-5 mb-6">
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
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Search</p>
            <Input placeholder="Search flights..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-48 text-xs font-mono" />
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Outcome</p>
            <div className="flex gap-1.5">
              {OUTCOME_OPTIONS.map((o) => {
                const cfg = OUTCOME_CONFIG[o];
                return (
                  <button key={o} onClick={() => toggleOutcome(o)} className={`font-mono text-[10px] px-2 py-1 border transition-colors ${outcomeFilter.length === 0 || outcomeFilter.includes(o) ? "border-primary/50 text-foreground bg-primary/10" : "border-border text-muted-foreground hover:border-muted-foreground"}`}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Date Range</p>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs font-mono w-32" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs font-mono w-32" />
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Pilot</p>
            <select value={pilotFilter} onChange={(e) => setPilotFilter(e.target.value)} className="h-8 px-2 text-xs font-mono bg-background border border-border text-foreground min-w-[120px]">
              <option value="">All Pilots</option>
              {filterOptions.pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Drone</p>
            <select value={droneFilter} onChange={(e) => setDroneFilter(e.target.value)} className="h-8 px-2 text-xs font-mono bg-background border border-border text-foreground min-w-[120px]">
              <option value="">All Drones</option>
              {filterOptions.drones.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Project</p>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="h-8 px-2 text-xs font-mono bg-background border border-border text-foreground min-w-[120px]">
              <option value="">All Projects</option>
              {filterOptions.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="font-mono text-[10px] text-muted-foreground mb-3">
          Showing {filtered.length} of {stats.total} flights
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={hasFilters ? "No flight logs match your filters" : "No flight logs yet"}
          description={hasFilters
            ? "Try adjusting your filters to see more results."
            : "Flight logs capture every flight — pilot, drone, duration, weather, and deliverables. Create one after completing a mission flight."}
          action={!hasFilters ? { label: "New Flight Log", onClick: openCreate } : undefined}
          hints={!hasFilters ? [
            { label: "Create a project first", href: "/projects" },
            { label: "Plan a mission", href: "/missions" },
          ] : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((log: any) => {
            const cfg = OUTCOME_CONFIG[log.outcome] || OUTCOME_CONFIG.completed;
            const Icon = cfg.icon;
            return (
              <div key={log.id} className="surface border border-border p-5 hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link to={`/flight-logs/${log.id}`} className="font-mono text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                        {log.title}
                      </Link>
                      <span className={`font-mono text-[10px] px-2 py-0.5 border border-current/20 ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground font-mono text-[11px] flex-wrap">
                      {log.projects?.name && (
                        <Link to={`/projects/${log.project_id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <ClipboardList className="w-3 h-3" /> {log.projects.name}
                        </Link>
                      )}
                      {log.missions?.title && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {log.missions.title}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(log.flight_date), "MMM d, yyyy")}</span>
                      {log.duration_minutes && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {log.duration_minutes}min</span>
                      )}
                      {log.profiles?.full_name && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {log.profiles.full_name}</span>
                      )}
                      {log.drone_models && (
                        <span className="flex items-center gap-1"><Plane className="w-3 h-3" /> {(log.drone_models as any).drone_manufacturers?.name} {log.drone_models.name}</span>
                      )}
                    </div>
                    {log.incidents && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-warning" />
                        <span className="font-mono text-[10px] text-warning truncate">{log.incidents}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <button onClick={() => openEdit(log)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <Link to={`/flight-logs/${log.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" title="View Details">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    {log.flight_hours_contribution > 0 && (
                      <span className="font-mono text-[10px] text-muted-foreground">{Number(log.flight_hours_contribution).toFixed(1)}h</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FlightLogFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editData={editingLog} />
    </div>
  );
}
