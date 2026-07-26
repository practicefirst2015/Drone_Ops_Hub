import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useManufacturers } from "@/hooks/useDroneCatalog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, ExternalLink, Globe } from "lucide-react";

export function ManufacturersPanel() {
  const { currentOrg } = useOrg();
  const { manufacturers: { data: manufacturers = [] } } = useManufacturers();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", country: "", website: "" });
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ name: "", country: "", website: "" }); setFormOpen(true); };
  const openEdit = (m: any) => { setEditing(m); setForm({ name: m.name, country: m.country || "", website: m.website || "" }); setFormOpen(true); };
  const close = () => { setFormOpen(false); setEditing(null); };

  const save = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("drone_manufacturers").update({ name: form.name, country: form.country || null, website: form.website || null }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Manufacturer updated");
      } else {
        const { error } = await supabase.from("drone_manufacturers").insert({ name: form.name, country: form.country || null, website: form.website || null, organization_id: currentOrg.id });
        if (error) throw error;
        toast.success("Manufacturer added");
      }
      qc.invalidateQueries({ queryKey: ["drone_manufacturers"] });
      close();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("drone_manufacturers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["drone_manufacturers"] });
    toast.success("Manufacturer deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">Drone Manufacturers ({manufacturers.length})</p>
        <button onClick={openCreate} className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {formOpen && (
        <div className="surface border border-border p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-sm font-medium text-foreground">{editing ? "Edit Manufacturer" : "Add Manufacturer"}</h3>
            <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="stat-label block mb-1.5">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="stat-label block mb-1.5">Country</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="stat-label block mb-1.5">Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="https://" />
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
        {manufacturers.length === 0 && (
          <p className="px-6 py-8 text-center font-mono text-sm text-muted-foreground">No manufacturers yet. Seed starter data or add one above.</p>
        )}
        {manufacturers.map((m: any) => (
          <div key={m.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm text-foreground font-medium">{m.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{m.country || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.website && (
                <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Globe className="w-3.5 h-3.5" /></a>
              )}
              <button onClick={() => openEdit(m)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
