import { RISK_COLORS } from "./mapConstants";

export const AssetLegend = () => (
  <div className="absolute bottom-4 left-4 z-[1000] surface border border-border px-4 py-3">
    <p className="stat-label mb-2">Legend</p>
    <div className="space-y-1.5">
      <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">Asset Condition</p>
      {Object.entries({ low: "Low Risk", moderate: "Moderate", high: "High Risk", critical: "Critical" }).map(
        ([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[key] }} />
            <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
          </div>
        )
      )}
      <div className="pt-1 border-t border-border mt-1">
        <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Markers</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: "#ffffff" }} />
          <span className="font-mono text-[10px] text-muted-foreground">Selected Asset</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <span className="font-mono text-[10px] text-muted-foreground">Restricted Airspace</span>
        </div>
      </div>
    </div>
  </div>
);
