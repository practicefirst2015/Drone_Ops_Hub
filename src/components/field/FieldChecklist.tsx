import { CheckCircle2, Circle, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { usePreflightChecklist } from "@/hooks/usePreflightChecklist";
import type { ChecklistItem } from "@/hooks/usePreflightChecklist";

interface FieldChecklistProps {
  missionId: string;
  mission: any;
}

function itemStatus(item: ChecklistItem): "pass" | "fail" | "pending" {
  if (item.override_note) return "pass";
  if (item.is_auto) return item.auto_status === "ready" ? "pass" : item.auto_status === "blocked" ? "fail" : "pending";
  return item.manual_checked ? "pass" : "pending";
}

export function FieldChecklist({ missionId, mission }: FieldChecklistProps) {
  const { items, isLoading, goStatus, passedCount, totalCount, toggleCheck, ensureChecklist } = usePreflightChecklist(missionId, mission);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-4">
        <button
          onClick={() => ensureChecklist.mutate(missionId)}
          className="w-full h-12 bg-secondary text-foreground font-mono text-sm tracking-wide flex items-center justify-center gap-2 active:bg-secondary/70 transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          Initialize Checklist
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {goStatus === "go" ? (
            <ShieldCheck className="w-4 h-4 text-success" />
          ) : goStatus === "no_go" ? (
            <ShieldAlert className="w-4 h-4 text-destructive" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {passedCount}/{totalCount} passed
          </span>
        </div>
        <span
          className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 ${
            goStatus === "go"
              ? "bg-success/20 text-success"
              : goStatus === "no_go"
              ? "bg-destructive/20 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {goStatus === "go" ? "GO" : goStatus === "no_go" ? "NO-GO" : "PENDING"}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => {
          const status = itemStatus(item);
          const canToggle = !item.is_auto;

          return (
            <button
              key={item.id}
              onClick={() => canToggle && toggleCheck.mutate({ itemId: item.id, checked: !item.manual_checked })}
              disabled={item.is_auto}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${
                canToggle ? "active:bg-secondary/70" : ""
              } ${item.is_auto ? "opacity-80" : ""}`}
            >
              {status === "pass" ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              ) : status === "fail" ? (
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className={`font-mono text-sm ${status === "pass" ? "text-muted-foreground" : "text-foreground"}`}>
                {item.label}
              </span>
              {item.is_critical && status !== "pass" && (
                <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-destructive">req</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
