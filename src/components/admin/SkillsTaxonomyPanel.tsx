import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgSkills } from "@/hooks/useProjectData";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export function SkillsTaxonomyPanel() {
  const { currentOrg } = useOrg();
  const { data: skills = [] } = useOrgSkills();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "" }); setFormOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ name: s.name, description: s.description || "" }); setFormOpen(true); };
  const close = () => { setFormOpen(false); setEditing(null); };

  const save = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("skills").update({ name: form.name, description: form.description || null }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Skill updated");
      } else {
        const { error } = await supabase.from("skills").insert({ name: form.name, description: form.description || null, organization_id: currentOrg.id });
        if (error) throw error;
        toast.success("Skill added");
      }
      qc.invalidateQueries({ queryKey: ["org_skills"] });
      close();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("skills").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["org_skills"] });
    toast.success("Skill deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">Skills Taxonomy ({skills.length})</p>
        <button onClick={openCreate} className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {formOpen && (
        <div className="surface border border-border p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-sm font-medium text-foreground">{editing ? "Edit Skill" : "Add Skill"}</h3>
            <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="stat-label block mb-1.5">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="stat-label block mb-1.5">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={close} className="h-8 px-3 font-mono text-xs border border-border text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={save} disabled={saving || !form.name} className="h-8 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Update" : "Add"}
            </button>
          </div>
        </div>
      )}

      <div className="surface border border-border divide-y divide-border">
        {skills.length === 0 && (
          <p className="px-6 py-8 text-center font-mono text-sm text-muted-foreground">No skills yet. Seed starter data or add one above.</p>
        )}
        {skills.map((s: any) => (
          <div key={s.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors">
            <div>
              <p className="text-sm text-foreground font-medium">{s.name}</p>
              {s.description && <p className="font-mono text-xs text-muted-foreground mt-0.5">{s.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
