import { Cloud, Wind, AlertTriangle, Radio, Mountain, ShieldAlert, Info, TreePine } from "lucide-react";
import { ADVISORY_LAYERS, AdvisoryLayerDef, DATA_SOURCE_CATEGORIES } from "./mapConstants";
import { AdvisoryLayerState } from "./mapTypes";

interface Props {
  advisoryLayers: AdvisoryLayerState;
  toggleAdvisoryLayer: (key: string) => void;
}

const categoryIcon: Record<string, typeof Cloud> = {
  airspace: ShieldAlert,
  weather: Cloud,
  notam: AlertTriangle,
  terrain: Mountain,
  environmental: TreePine,
};

const categoryLabel: Record<string, string> = {
  airspace: "Airspace",
  weather: "Weather",
  notam: "NOTAMs & TFRs",
  terrain: "Terrain & Obstacles",
  environmental: "Environmental",
};

const statusBadge = (status: AdvisoryLayerDef["status"]) => {
  switch (status) {
    case "connected":
      return <span className="font-mono text-[8px] px-1 py-0.5 text-success bg-success/10">LIVE</span>;
    case "static":
      return <span className="font-mono text-[8px] px-1 py-0.5 text-primary bg-primary/10">REF</span>;
    case "planned":
      return <span className="font-mono text-[8px] px-1 py-0.5 text-muted-foreground bg-muted">PLANNED</span>;
  }
};

export function AdvisoryLayersPanel({ advisoryLayers, toggleAdvisoryLayer }: Props) {
  // Group layers by category
  const grouped = ADVISORY_LAYERS.reduce<Record<string, AdvisoryLayerDef[]>>((acc, layer) => {
    (acc[layer.category] ??= []).push(layer);
    return acc;
  }, {});

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-2 mb-1">
        <Radio className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {DATA_SOURCE_CATEGORIES.advisory.label}
        </p>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground mb-3 leading-relaxed">
        {DATA_SOURCE_CATEGORIES.advisory.description}
      </p>

      <div className="space-y-3">
        {Object.entries(grouped).map(([cat, layers]) => {
          const CatIcon = categoryIcon[cat] || Info;
          return (
            <div key={cat}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <CatIcon className="w-3 h-3 text-muted-foreground" />
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                  {categoryLabel[cat] || cat}
                </p>
              </div>
              <div className="space-y-0.5">
                {layers.map((layer) => {
                  const enabled = advisoryLayers[layer.key] ?? false;
                  const isPlanned = layer.status === "planned";
                  return (
                    <button
                      key={layer.key}
                      onClick={() => !isPlanned && toggleAdvisoryLayer(layer.key)}
                      disabled={isPlanned}
                      className={`w-full flex items-center gap-2 px-3 py-2 transition-colors text-left ${
                        isPlanned
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-secondary/50"
                      }`}
                      title={layer.description}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: enabled ? layer.color : "hsl(228 10% 30%)" }}
                      />
                      <span
                        className={`font-mono text-[10px] flex-1 ${
                          enabled ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {layer.label}
                      </span>
                      {statusBadge(layer.status)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mt-3 px-3 py-2 bg-secondary/30 border border-border">
        <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
          <span className="text-warning">⚠</span> Advisory data is for planning reference only. Always verify airspace
          authorization, weather conditions, and NOTAMs through official sources before flight operations.
        </p>
      </div>
    </div>
  );
}
