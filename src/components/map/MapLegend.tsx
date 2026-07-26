import { STATUS_COLORS } from "./mapConstants";

export const MapLegend = () => (
  <div className="absolute bottom-4 left-4 z-[1000] surface border border-border px-4 py-3">
    <p className="stat-label mb-2">Legend</p>
    <div className="space-y-1.5">
      <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">Project Status</p>
      {Object.entries({ active: "Active", draft: "Draft", pending: "Pending", complete: "Complete" }).map(
        ([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[key] }} />
            <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
          </div>
        )
      )}
      <div className="pt-1 border-t border-border mt-1">
        <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Advisory</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <span className="font-mono text-[10px] text-muted-foreground">Restricted Airspace (Approx)</span>
        </div>
      </div>
    </div>
  </div>
);
