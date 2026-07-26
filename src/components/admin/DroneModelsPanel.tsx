import { useDroneModels, useManufacturers } from "@/hooks/useDroneCatalog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  multirotor: "Multirotor",
  fixed_wing: "Fixed Wing",
  vtol: "VTOL",
  helicopter: "Helicopter",
  hybrid: "Hybrid",
};

export function DroneModelsPanel() {
  const { models: { data: models = [] } } = useDroneModels();
  const { manufacturers: { data: manufacturers = [] } } = useManufacturers();
  const qc = useQueryClient();

  const mfrMap = Object.fromEntries((manufacturers as any[]).map((m) => [m.id, m.name]));

  const remove = async (id: string) => {
    const { error } = await supabase.from("drone_models").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["drone_models"] });
    toast.success("Model deleted");
  };

  // Group by category
  const byCategory = (models as any[]).reduce<Record<string, any[]>>((acc, m) => {
    const cat = m.category || "multirotor";
    (acc[cat] = acc[cat] || []).push(m);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">Drone Models ({models.length})</p>
        <p className="font-mono text-xs text-muted-foreground">Manage models on the Drones page → Catalog tab</p>
      </div>

      {Object.entries(byCategory).map(([cat, items]) => (
      <div key={cat} className="mb-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 px-1">{CATEGORY_LABELS[cat] || cat} ({(items as any[]).length})</p>
          <div className="surface border border-border divide-y divide-border">
            {(items as any[]).map((m: any) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <div>
                  <p className="text-sm text-foreground font-medium">{m.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {mfrMap[m.manufacturer_id] || "Unknown"} · {m.weight_kg ? `${m.weight_kg} kg` : "—"} · {m.max_flight_time_min ? `${m.max_flight_time_min} min` : "—"}
                  </p>
                </div>
                <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {models.length === 0 && (
        <div className="surface border border-border p-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">No drone models yet. Seed starter data to populate.</p>
        </div>
      )}
    </div>
  );
}
