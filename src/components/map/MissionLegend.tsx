import { MISSION_STATUS_COLORS, GO_STATUS_COLORS } from "./mapConstants";

export const MissionLegend = () => (
  <div className="absolute bottom-4 left-4 z-[1000] surface border border-border px-4 py-3">
    <p className="stat-label mb-2">Legend</p>
    <div className="space-y-1.5">
      <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">Mission Status</p>
      {Object.entries({
        draft: "Draft", planning: "Planning", approved: "Approved",
        ready: "Ready", in_progress: "In Progress", completed: "Completed"
      }).map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: MISSION_STATUS_COLORS[key] }} />
          <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
        </div>
      ))}
      <div className="pt-1 border-t border-border mt-1">
        <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Go Status</p>
        {Object.entries({ go: "GO", pending: "Pending", no_go: "NO-GO" }).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: GO_STATUS_COLORS[key] }} />
            <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <div className="pt-1 border-t border-border mt-1">
        <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Map Markers</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5" style={{ background: "#00e5ff" }} />
          <span className="font-mono text-[10px] text-muted-foreground">Mission Pin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 border-2 border-dashed" style={{ borderColor: "#8b5cf6" }} />
          <span className="font-mono text-[10px] text-muted-foreground">Flight Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <span className="font-mono text-[10px] text-muted-foreground">Restricted Airspace</span>
        </div>
      </div>
    </div>
  </div>
);
