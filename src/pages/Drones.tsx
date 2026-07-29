import { useState, useEffect } from "react";
import { Plus, Search, LayoutGrid, LayoutList, GitCompare, X, Plane, ChevronRight, Pencil, Trash2, Save } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { useDroneModels, useManufacturers } from "@/hooks/useDroneCatalog";
import { useOrgDrones } from "@/hooks/useProjectData";
import { AddManufacturerDialog } from "@/components/drones/AddManufacturerDialog";
import { AddModelDialog } from "@/components/drones/AddModelDialog";
import { DroneModelDetail } from "@/components/drones/DroneModelDetail";
import { DroneCompare } from "@/components/drones/DroneCompare";
import { getModelCapabilities, CapabilityBadges } from "@/components/drones/capabilityBadges";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { logActivity } from "@/lib/activityLogger";
import { MaintenancePanel } from "@/components/drones/MaintenancePanel";
import { DroneUnitDetail } from "@/components/drones/DroneUnitDetail";

type Tab = "catalog" | "fleet" | "compare";

const Drones = () => {
  const [tab, setTab] = useState<Tab>("catalog");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [fleetSearch, setFleetSearch] = useState("");
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addMfgOpen, setAddMfgOpen] = useState(false);
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const modelParam = searchParams.get("model");
    if (modelParam) {
      setSelectedModelId(modelParam);
      searchParams.delete("model");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [showMfgPanel, setShowMfgPanel] = useState(false);
  const [editingMfg, setEditingMfg] = useState<any>(null);
  const [mfgForm, setMfgForm] = useState({ name: "", country: "", website: "" });
  const { models: { data: models = [], isLoading: modelsLoading } } = useDroneModels();
  const { manufacturers: { data: manufacturers = [] }, deleteManufacturer, updateManufacturer } = useManufacturers();
  const { data: fleetDrones = [], isLoading: fleetLoading } = useOrgDrones();
  const { currentOrg } = useOrg();
  const { canManage, isAdmin } = useOrgRole();
  const qc = useQueryClient();
  const { confirm, ConfirmationDialog } = useConfirm();

  const [addDroneOpen, setAddDroneOpen] = useState(false);
  const [droneForm, setDroneForm] = useState({ name: "", model: "", serial_number: "", drone_model_id: "", acquisition_date: "" });
  const [editingDrone, setEditingDrone] = useState<any>(null);
  const [editDroneForm, setEditDroneForm] = useState({ name: "", model: "", serial_number: "", status: "available", battery_level: "100", flight_hours: "0", next_maintenance: "", maintenance_interval_hours: "", maintenance_interval_missions: "" });

  // Escape key for fleet modals
  useEffect(() => {
    if (!addDroneOpen && !editingDrone) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAddDroneOpen(false); setEditingDrone(null); }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [addDroneOpen, editingDrone]);

  const createFleetDrone = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("drones").insert({
        name: droneForm.name,
        model: droneForm.model,
        serial_number: droneForm.serial_number || null,
        drone_model_id: droneForm.drone_model_id || null,
        acquisition_date: droneForm.acquisition_date || null,
        organization_id: currentOrg!.id,
      } as any).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["org_drones"] });
      setAddDroneOpen(false);
      toast.success("Drone registered");
      logActivity({ organizationId: currentOrg!.id, action: "created", entityType: "drone", entityId: data.id, entityName: droneForm.name });
      setDroneForm({ name: "", model: "", serial_number: "", drone_model_id: "", acquisition_date: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateFleetDrone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("drones").update({
        name: editDroneForm.name,
        model: editDroneForm.model,
        serial_number: editDroneForm.serial_number || null,
        status: editDroneForm.status,
        battery_level: parseInt(editDroneForm.battery_level) || 100,
        flight_hours: parseFloat(editDroneForm.flight_hours) || 0,
        next_maintenance: editDroneForm.next_maintenance || null,
        maintenance_interval_hours: editDroneForm.maintenance_interval_hours ? parseFloat(editDroneForm.maintenance_interval_hours) : null,
        maintenance_interval_missions: editDroneForm.maintenance_interval_missions ? parseInt(editDroneForm.maintenance_interval_missions) : null,
      } as any).eq("id", editingDrone.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_drones"] });
      qc.invalidateQueries({ queryKey: ["org_drones_maintenance"] });
      toast.success("Drone updated");
      logActivity({ organizationId: currentOrg!.id, action: "updated", entityType: "drone", entityId: editingDrone.id, entityName: editDroneForm.name });
      setEditingDrone(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteFleetDrone = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("drones").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["org_drones"] });
      toast.success("Drone removed");
      logActivity({ organizationId: currentOrg!.id, action: "deleted", entityType: "drone", entityId: result.id, entityName: result.name });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEditDrone = (d: any) => {
    setEditingDrone(d);
    setEditDroneForm({
      name: d.name, model: d.model, serial_number: d.serial_number || "",
      status: d.status, battery_level: String(d.battery_level ?? 100),
      flight_hours: String(d.flight_hours ?? 0), next_maintenance: d.next_maintenance || "",
      maintenance_interval_hours: d.maintenance_interval_hours != null ? String(d.maintenance_interval_hours) : "",
      maintenance_interval_missions: d.maintenance_interval_missions != null ? String(d.maintenance_interval_missions) : "",
    });
  };

  const categories = [...new Set(models.map((m: any) => m.category))];

  const filtered = models.filter((m: any) => {
    const matchesSearch = m.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      m.drone_manufacturers?.name?.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesMfg = !filterManufacturer || m.manufacturer_id === filterManufacturer;
    const matchesCat = !filterCategory || m.category === filterCategory;
    return matchesSearch && matchesMfg && matchesCat;
  });

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  if (selectedDroneId) {
    return (
      <div className="p-8">
        <DroneUnitDetail droneId={selectedDroneId} onBack={() => setSelectedDroneId(null)} />
      </div>
    );
  }

  if (selectedModelId) {
    return <DroneModelDetail modelId={selectedModelId} onBack={() => setSelectedModelId(null)} />;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">Fleet</p>
          <h1 className="page-title">Drone Database</h1>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMfgPanel(!showMfgPanel)}
              className="h-9 px-3 border border-border text-muted-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:text-foreground hover:border-foreground transition-colors"
            >
              Manufacturers
            </button>
            <button
              onClick={() => setAddMfgOpen(true)}
              className="h-9 px-3 border border-border text-muted-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:text-foreground hover:border-foreground transition-colors"
            >
              <Plus className="w-3 h-3" /> Manufacturer
            </button>
            <button
              onClick={() => setAddModelOpen(true)}
              className="h-9 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3 h-3" /> Model
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6 flex items-center justify-between">
        <div className="flex gap-0">
          {([
            { key: "catalog", label: "Model Catalog" },
            { key: "fleet", label: "Fleet Registry" },
            { key: "compare", label: `Compare${compareIds.length > 0 ? ` (${compareIds.length})` : ""}` },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 font-mono text-xs tracking-wide transition-colors border-b-2 -mb-px ${
                tab === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "catalog" && (
          <div className="flex items-center gap-1 mb-px">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 ${viewMode === "grid" ? "text-primary" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 ${viewMode === "list" ? "text-primary" : "text-muted-foreground"}`}>
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {tab === "catalog" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 surface border border-border flex items-center px-4">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search models..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full bg-transparent px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <select
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
              className="bg-card border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-card border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Categories</option>
              {categories.map((c: any) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Manufacturer Management Panel */}
          {showMfgPanel && (
            <div className="surface border border-border mb-6">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="font-mono text-xs font-medium text-foreground">Manufacturers</p>
                <button onClick={() => setShowMfgPanel(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="divide-y divide-border">
                {manufacturers.length === 0 ? (
                  <div className="p-4 text-center font-mono text-xs text-muted-foreground">No manufacturers yet.</div>
                ) : manufacturers.map((mfg: any) => (
                  <div key={mfg.id} className="px-4 py-3 flex items-center justify-between">
                    {editingMfg?.id === mfg.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input type="text" value={mfgForm.name} onChange={(e) => setMfgForm({ ...mfgForm, name: e.target.value })}
                          className="bg-background border border-border px-2 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary flex-1" placeholder="Name" />
                        <input type="text" value={mfgForm.country} onChange={(e) => setMfgForm({ ...mfgForm, country: e.target.value })}
                          className="bg-background border border-border px-2 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary w-24" placeholder="Country" />
                        <input type="text" value={mfgForm.website} onChange={(e) => setMfgForm({ ...mfgForm, website: e.target.value })}
                          className="bg-background border border-border px-2 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary w-40" placeholder="Website" />
                        <button onClick={async () => {
                          try {
                            await updateManufacturer.mutateAsync({ id: mfg.id, name: mfgForm.name, country: mfgForm.country || null, website: mfgForm.website || null });
                            setEditingMfg(null);
                            toast.success("Manufacturer updated");
                          } catch (err: any) { toast.error(err.message); }
                        }} className="text-primary hover:opacity-80"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingMfg(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-foreground">{mfg.name}</span>
                          {mfg.country && <span className="font-mono text-[10px] text-muted-foreground">{mfg.country}</span>}
                          {mfg.website && <a href={mfg.website} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-primary hover:underline">{mfg.website}</a>}
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setEditingMfg(mfg); setMfgForm({ name: mfg.name, country: mfg.country || "", website: mfg.website || "" }); }}
                              className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                            {isAdmin && (
                              <button onClick={() => confirm({
                                title: "Delete Manufacturer",
                                description: `Delete "${mfg.name}"? Drone models linked to this manufacturer may be affected.`,
                                confirmLabel: "Delete",
                                variant: "destructive",
                                onConfirm: async () => { await deleteManufacturer.mutateAsync(mfg.id); toast.success("Manufacturer deleted"); },
                              })} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {modelsLoading ? (
            <div className="p-8 text-center"><div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Plane}
              title={catalogSearch || filterManufacturer || filterCategory ? "No models match your filters" : "No drone models in catalog"}
              description={catalogSearch || filterManufacturer || filterCategory
                ? "Try adjusting your search or filter criteria."
                : "Build your drone catalog by adding manufacturers and their models. This powers mission planning, fleet tracking, and capability matching."}
              action={!catalogSearch && !filterManufacturer && !filterCategory && canManage
                ? { label: "Add Manufacturer", onClick: () => setAddMfgOpen(true) }
                : undefined}
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {filtered.map((m: any) => (
                <div key={m.id} className="surface p-5 group relative">
                  {/* Compare checkbox */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => toggleCompare(m.id)}
                      className={`w-5 h-5 border flex items-center justify-center font-mono text-[9px] transition-colors ${
                        compareIds.includes(m.id) ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary"
                      }`}
                      title="Add to compare"
                    >
                      {compareIds.includes(m.id) ? "✓" : ""}
                    </button>
                  </div>

                  <div className="cursor-pointer" onClick={() => setSelectedModelId(m.id)}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                        {m.drone_manufacturers?.name}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground">{m.category}</span>
                    </div>
                    <h3 className="font-mono text-sm font-medium text-foreground mb-3 group-hover:text-primary transition-colors">
                      {m.name}
                    </h3>

                    {/* Key specs */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {m.max_flight_time_min && (
                        <div>
                          <p className="font-mono text-[9px] text-muted-foreground uppercase">Flight Time</p>
                          <p className="font-mono text-xs text-foreground">{m.max_flight_time_min} min</p>
                        </div>
                      )}
                      {m.max_range_km && (
                        <div>
                          <p className="font-mono text-[9px] text-muted-foreground uppercase">Range</p>
                          <p className="font-mono text-xs text-foreground">{m.max_range_km} km</p>
                        </div>
                      )}
                      {m.weight_kg && (
                        <div>
                          <p className="font-mono text-[9px] text-muted-foreground uppercase">Weight</p>
                          <p className="font-mono text-xs text-foreground">{m.weight_kg} kg</p>
                        </div>
                      )}
                      {m.max_payload_kg && (
                        <div>
                          <p className="font-mono text-[9px] text-muted-foreground uppercase">Payload</p>
                          <p className="font-mono text-xs text-foreground">{m.max_payload_kg} kg</p>
                        </div>
                      )}
                    </div>

                    {/* Capability Badges */}
                    {(() => {
                      const caps = getModelCapabilities(m);
                      return caps.length > 0 ? <div className="mt-3"><CapabilityBadges capabilities={caps} size="xs" /></div> : null;
                    })()}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {m.ip_rating || "—"} · {m.faa_category || "—"}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface border border-border">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-8 px-3 py-3"></th>
                    <th className="px-4 py-3 text-left stat-label">Model</th>
                    <th className="px-4 py-3 text-left stat-label">Manufacturer</th>
                    <th className="px-4 py-3 text-left stat-label">Category</th>
                    <th className="px-4 py-3 text-left stat-label">Flight Time</th>
                    <th className="px-4 py-3 text-left stat-label">Range</th>
                    <th className="px-4 py-3 text-left stat-label">Weight</th>
                    <th className="px-4 py-3 text-left stat-label">Payload</th>
                     <th className="px-4 py-3 text-left stat-label">IP</th>
                     <th className="px-4 py-3 text-left stat-label">Capabilities</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((m: any) => (
                    <tr key={m.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setSelectedModelId(m.id)}>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleCompare(m.id)}
                          className={`w-4 h-4 border flex items-center justify-center font-mono text-[8px] ${
                            compareIds.includes(m.id) ? "border-primary bg-primary/20 text-primary" : "border-border"
                          }`}
                        >
                          {compareIds.includes(m.id) ? "✓" : ""}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{m.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.drone_manufacturers?.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.category}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{m.max_flight_time_min ? `${m.max_flight_time_min}m` : "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{m.max_range_km ? `${m.max_range_km}km` : "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{m.weight_kg ? `${m.weight_kg}kg` : "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{m.max_payload_kg ? `${m.max_payload_kg}kg` : "—"}</td>
                       <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.ip_rating || "—"}</td>
                       <td className="px-4 py-3"><CapabilityBadges capabilities={getModelCapabilities(m)} size="xs" /></td>
                     </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "fleet" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 surface border border-border flex items-center px-4 mr-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input placeholder="Search fleet..." value={fleetSearch} onChange={(e) => setFleetSearch(e.target.value)}
                className="w-full bg-transparent px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
            {canManage && (
              <button onClick={() => setAddDroneOpen(true)}
                className="h-9 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90">
                <Plus className="w-3 h-3" /> Register Drone
              </button>
            )}
          </div>

          {addDroneOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setAddDroneOpen(false)}>
              <div className="surface border border-border w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="font-mono text-sm font-medium text-foreground">Register Drone</h2>
                  <button onClick={() => setAddDroneOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); createFleetDrone.mutate(); }} className="p-6 space-y-4">
                  <div>
                    <label className="stat-label block mb-2">Name *</label>
                    <input type="text" value={droneForm.name} onChange={(e) => setDroneForm({ ...droneForm, name: e.target.value })} required
                      className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="DJI-M300-01" />
                  </div>
                  <div>
                    <label className="stat-label block mb-2">Model Label *</label>
                    <input type="text" value={droneForm.model} onChange={(e) => setDroneForm({ ...droneForm, model: e.target.value })} required
                      className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="DJI Matrice 300 RTK" />
                  </div>
                  <div>
                    <label className="stat-label block mb-2">Catalog Model</label>
                    <select value={droneForm.drone_model_id} onChange={(e) => setDroneForm({ ...droneForm, drone_model_id: e.target.value })}
                      className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                      <option value="">None</option>
                      {models.map((m: any) => <option key={m.id} value={m.id}>{m.drone_manufacturers?.name} — {m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="stat-label block mb-2">Serial Number</label>
                    <input type="text" value={droneForm.serial_number} onChange={(e) => setDroneForm({ ...droneForm, serial_number: e.target.value })}
                      className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="Optional" />
                  </div>
                  <button type="submit" disabled={createFleetDrone.isPending}
                    className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
                    {createFleetDrone.isPending ? "Registering..." : "Register Drone"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Edit Fleet Drone Modal */}
          {editingDrone && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setEditingDrone(null)}>
              <div className="surface border border-border w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="font-mono text-sm font-medium text-foreground">Edit Drone</h2>
                  <button onClick={() => setEditingDrone(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); updateFleetDrone.mutate(); }} className="p-6 space-y-4">
                  <div>
                    <label className="stat-label block mb-2">Name *</label>
                    <input type="text" value={editDroneForm.name} onChange={(e) => setEditDroneForm({ ...editDroneForm, name: e.target.value })} required
                      className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="stat-label block mb-2">Model Label *</label>
                    <input type="text" value={editDroneForm.model} onChange={(e) => setEditDroneForm({ ...editDroneForm, model: e.target.value })} required
                      className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="stat-label block mb-2">Status</label>
                      <select value={editDroneForm.status} onChange={(e) => setEditDroneForm({ ...editDroneForm, status: e.target.value })}
                        className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                        <option value="available">Available</option>
                        <option value="in_flight">In Flight</option>
                        <option value="charging">Charging</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div>
                      <label className="stat-label block mb-2">Battery (%)</label>
                      <input type="number" min="0" max="100" value={editDroneForm.battery_level} onChange={(e) => setEditDroneForm({ ...editDroneForm, battery_level: e.target.value })}
                        className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="stat-label block mb-2">Flight Hours</label>
                      <input type="number" step="0.1" value={editDroneForm.flight_hours} onChange={(e) => setEditDroneForm({ ...editDroneForm, flight_hours: e.target.value })}
                        className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="stat-label block mb-2">Next Maintenance</label>
                      <input type="date" value={editDroneForm.next_maintenance} onChange={(e) => setEditDroneForm({ ...editDroneForm, next_maintenance: e.target.value })}
                        className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                   <div>
                     <label className="stat-label block mb-2">Serial Number</label>
                     <input type="text" value={editDroneForm.serial_number} onChange={(e) => setEditDroneForm({ ...editDroneForm, serial_number: e.target.value })}
                       className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="stat-label block mb-2">Maint. Interval (hours)</label>
                       <input type="number" step="any" value={editDroneForm.maintenance_interval_hours} onChange={(e) => setEditDroneForm({ ...editDroneForm, maintenance_interval_hours: e.target.value })}
                         placeholder="e.g. 50"
                         className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                     </div>
                     <div>
                       <label className="stat-label block mb-2">Maint. Interval (missions)</label>
                       <input type="number" value={editDroneForm.maintenance_interval_missions} onChange={(e) => setEditDroneForm({ ...editDroneForm, maintenance_interval_missions: e.target.value })}
                         placeholder="e.g. 20"
                         className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                     </div>
                   </div>
                  <button type="submit" disabled={updateFleetDrone.isPending}
                    className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
                    {updateFleetDrone.isPending ? "Saving..." : "Update Drone"}
                  </button>
                </form>
              </div>
            </div>
          )}

          <MaintenancePanel />

          <div className="surface border border-border mt-6">
            {fleetLoading ? (
              <div className="p-8 text-center"><div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" /></div>
            ) : fleetDrones.length === 0 ? (
              <div className="p-8 text-center font-mono text-sm text-muted-foreground">No drones registered yet.</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left stat-label">Name</th>
                    <th className="px-6 py-3 text-left stat-label">Model</th>
                    <th className="px-6 py-3 text-left stat-label">Battery</th>
                    <th className="px-6 py-3 text-left stat-label">Hours</th>
                    <th className="px-6 py-3 text-left stat-label">Status</th>
                    <th className="px-6 py-3 text-left stat-label">Next Maint.</th>
                    <th className="px-6 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fleetDrones.filter((d: any) => d.name.toLowerCase().includes(fleetSearch.toLowerCase())).map((d: any) => (
                    <tr key={d.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setSelectedDroneId(d.id)}>
                      <td className="px-6 py-4 font-mono text-xs text-primary">{d.name}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{d.model}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-border">
                            <div className={`h-full ${(d.battery_level ?? 100) > 50 ? "bg-success" : (d.battery_level ?? 100) > 20 ? "bg-warning" : "bg-destructive"}`}
                              style={{ width: `${d.battery_level ?? 100}%` }} />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">{d.battery_level ?? 100}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{d.flight_hours ?? 0}h</td>
                      <td className="px-6 py-4">
                        <span className={`font-mono text-xs px-2 py-1 ${
                          d.status === "available" ? "text-success bg-success/10" :
                          d.status === "in_flight" ? "text-primary bg-primary/10" :
                          d.status === "charging" ? "text-warning bg-warning/10" :
                          "text-destructive bg-destructive/10"
                        }`}>{d.status}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{d.next_maintenance || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {canManage && (
                            <button onClick={() => openEditDrone(d)} className="text-muted-foreground hover:text-foreground transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => confirm({
                              title: "Delete Drone",
                              description: `Remove "${d.name}" from the fleet? This cannot be undone.`,
                              confirmLabel: "Delete Drone",
                              variant: "destructive",
                              onConfirm: async () => { await deleteFleetDrone.mutateAsync({ id: d.id, name: d.name }); },
                            })}
                              className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "compare" && (
        <DroneCompare modelIds={compareIds} allModels={models} onRemove={(id) => setCompareIds(prev => prev.filter(x => x !== id))} />
      )}

      <AddManufacturerDialog open={addMfgOpen} onOpenChange={setAddMfgOpen} />
      <AddModelDialog open={addModelOpen} onOpenChange={setAddModelOpen} />
      <ConfirmationDialog />
    </div>
  );
};

export default Drones;
