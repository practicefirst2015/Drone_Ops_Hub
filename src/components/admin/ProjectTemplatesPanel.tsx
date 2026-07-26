import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Copy, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORIES = [
  "roof_inspection", "solar_inspection", "construction_progress",
  "utility_inspection", "mapping", "real_estate_media",
  "thermal_inspection", "agriculture", "emergency", "survey", "general",
];

const DRONE_CATEGORIES = ["multirotor", "fixed_wing", "vtol", "hybrid"];
const PAYLOAD_TYPES = ["camera", "thermal_camera", "lidar", "multispectral", "gas_sensor", "spotlight"];

const categoryLabel = (c: string) => c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

interface TemplateForm {
  name: string;
  description: string;
  category: string;
  required_skills: string[];
  suggested_drone_categories: string[];
  suggested_payload_types: string[];
  estimated_budget_min: string;
  estimated_budget_max: string;
  estimated_duration_days: string;
  risk_notes: string;
}

const emptyForm: TemplateForm = {
  name: "", description: "", category: "general",
  required_skills: [], suggested_drone_categories: [], suggested_payload_types: [],
  estimated_budget_min: "", estimated_budget_max: "", estimated_duration_days: "", risk_notes: "",
};

export function ProjectTemplatesPanel() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["project_templates", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const { data: orgSkills = [] } = useQuery({
    queryKey: ["org_skills", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("skills").select("id, name").eq("organization_id", currentOrg!.id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg && formOpen,
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || "",
      category: t.category || "general",
      required_skills: t.required_skills || [],
      suggested_drone_categories: t.suggested_drone_categories || [],
      suggested_payload_types: t.suggested_payload_types || [],
      estimated_budget_min: t.estimated_budget_min?.toString() || "",
      estimated_budget_max: t.estimated_budget_max?.toString() || "",
      estimated_duration_days: t.estimated_duration_days?.toString() || "",
      risk_notes: t.risk_notes || "",
    });
    setFormOpen(true);
  };
  const close = () => { setFormOpen(false); setEditing(null); };

  const toggleArr = (field: keyof TemplateForm, val: string) => {
    const arr = form[field] as string[];
    setForm({ ...form, [field]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] });
  };

  const save = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        required_skills: form.required_skills,
        suggested_drone_categories: form.suggested_drone_categories,
        suggested_payload_types: form.suggested_payload_types,
        estimated_budget_min: form.estimated_budget_min ? Number(form.estimated_budget_min) : null,
        estimated_budget_max: form.estimated_budget_max ? Number(form.estimated_budget_max) : null,
        estimated_duration_days: form.estimated_duration_days ? Number(form.estimated_duration_days) : null,
        risk_notes: form.risk_notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("project_templates").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { error } = await supabase.from("project_templates").insert({ ...payload, organization_id: currentOrg.id });
        if (error) throw error;
        toast.success("Template created");
      }
      qc.invalidateQueries({ queryKey: ["project_templates"] });
      close();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (t: any) => {
    if (!currentOrg) return;
    const { id, created_at, updated_at, ...rest } = t;
    const { error } = await supabase.from("project_templates").insert({ ...rest, name: `${t.name} (Copy)`, organization_id: currentOrg.id });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["project_templates"] });
    toast.success("Template duplicated");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("project_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["project_templates"] });
    toast.success("Template deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">Project Templates ({templates.length})</p>
        <button onClick={openCreate} className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {formOpen && (
        <div className="surface border border-border p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-sm font-medium text-foreground">{editing ? "Edit Template" : "New Template"}</h3>
            <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="stat-label block mb-1.5">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="stat-label block mb-1.5">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1.5">Est. Duration (days)</label>
                <input type="number" value={form.estimated_duration_days} onChange={(e) => setForm({ ...form, estimated_duration_days: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div>
              <label className="stat-label block mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="stat-label block mb-1.5">Budget Min ($)</label>
                <input type="number" value={form.estimated_budget_min} onChange={(e) => setForm({ ...form, estimated_budget_min: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="stat-label block mb-1.5">Budget Max ($)</label>
                <input type="number" value={form.estimated_budget_max} onChange={(e) => setForm({ ...form, estimated_budget_max: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div>
              <label className="stat-label block mb-1.5">Required Skills</label>
              <div className="flex flex-wrap gap-1.5">
                {orgSkills.map((s: any) => (
                  <button key={s.id} type="button" onClick={() => toggleArr("required_skills", s.name)}
                    className={`font-mono text-[10px] px-2 py-1 border transition-colors ${form.required_skills.includes(s.name) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {s.name}
                  </button>
                ))}
                {orgSkills.length === 0 && <span className="font-mono text-xs text-muted-foreground">No skills defined. Seed skills first.</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="stat-label block mb-1.5">Drone Categories</label>
                <div className="flex flex-wrap gap-1.5">
                  {DRONE_CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => toggleArr("suggested_drone_categories", c)}
                      className={`font-mono text-[10px] px-2 py-1 border transition-colors ${form.suggested_drone_categories.includes(c) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      {categoryLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="stat-label block mb-1.5">Payload Types</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYLOAD_TYPES.map((p) => (
                    <button key={p} type="button" onClick={() => toggleArr("suggested_payload_types", p)}
                      className={`font-mono text-[10px] px-2 py-1 border transition-colors ${form.suggested_payload_types.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      {categoryLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="stat-label block mb-1.5">Risk Notes</label>
              <textarea value={form.risk_notes} onChange={(e) => setForm({ ...form, risk_notes: e.target.value })} rows={2} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary resize-none" placeholder="Weather sensitivity, airspace restrictions, etc." />
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={close} className="h-8 px-3 font-mono text-xs border border-border text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={save} disabled={saving || !form.name} className="h-8 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="surface border border-border divide-y divide-border">
        {templates.length === 0 && (
          <p className="px-6 py-8 text-center font-mono text-sm text-muted-foreground">No project templates yet. Seed starter data or create one above.</p>
        )}
        {templates.map((t: any) => (
          <div key={t.id}>
            <div className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
              <div className="flex items-center gap-3">
                {expanded === t.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                <div>
                  <p className="text-sm text-foreground font-medium">{t.name}</p>
                  {t.description && <p className="font-mono text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground uppercase">{categoryLabel(t.category)}</span>
                <button onClick={() => duplicate(t)} className="text-muted-foreground hover:text-foreground" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEdit(t)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {expanded === t.id && (
              <div className="px-5 pb-4 pt-1 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-border bg-secondary/10">
                <div>
                  <p className="stat-label mb-1">Budget Range</p>
                  <p className="font-mono text-xs text-foreground">
                    {t.estimated_budget_min || t.estimated_budget_max
                      ? `$${(t.estimated_budget_min || 0).toLocaleString()} – $${(t.estimated_budget_max || 0).toLocaleString()}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="stat-label mb-1">Duration</p>
                  <p className="font-mono text-xs text-foreground">{t.estimated_duration_days ? `${t.estimated_duration_days} days` : "—"}</p>
                </div>
                <div>
                  <p className="stat-label mb-1">Drone Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {(t.suggested_drone_categories || []).map((c: string) => (
                      <span key={c} className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground">{categoryLabel(c)}</span>
                    ))}
                    {(!t.suggested_drone_categories || t.suggested_drone_categories.length === 0) && <span className="font-mono text-[10px] text-muted-foreground">—</span>}
                  </div>
                </div>
                <div>
                  <p className="stat-label mb-1">Payload Types</p>
                  <div className="flex flex-wrap gap-1">
                    {(t.suggested_payload_types || []).map((p: string) => (
                      <span key={p} className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground">{categoryLabel(p)}</span>
                    ))}
                    {(!t.suggested_payload_types || t.suggested_payload_types.length === 0) && <span className="font-mono text-[10px] text-muted-foreground">—</span>}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="stat-label mb-1">Required Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {(t.required_skills || []).map((s: string) => (
                      <span key={s} className="font-mono text-[10px] px-1.5 py-0.5 border border-primary/30 bg-primary/5 text-primary">{s}</span>
                    ))}
                    {(!t.required_skills || t.required_skills.length === 0) && <span className="font-mono text-[10px] text-muted-foreground">—</span>}
                  </div>
                </div>
                {t.risk_notes && (
                  <div className="col-span-2">
                    <p className="stat-label mb-1">Risk Notes</p>
                    <p className="font-mono text-xs text-muted-foreground">{t.risk_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
