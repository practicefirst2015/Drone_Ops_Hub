import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Shield, MessageSquare, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { usePreflightChecklist, ChecklistItem } from "@/hooks/usePreflightChecklist";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  missionId: string;
  mission?: any;
  compact?: boolean;
}

const statusIcon = (item: ChecklistItem, passed: boolean) => {
  if (passed) return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
  if (item.is_critical) return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-warning" />;
};

const goStatusConfig = {
  go: { label: "GO", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
  no_go: { label: "NO-GO", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
  pending: { label: "PENDING", color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
};

export function PreflightChecklist({ missionId, mission, compact = false }: Props) {
  const {
    items, isLoading, goStatus, blockedReasons, passedCount, totalCount,
    ensureChecklist, toggleCheck, saveOverride,
  } = usePreflightChecklist(missionId, mission);

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [overrideText, setOverrideText] = useState("");
  const initRef = useRef(false);

  // Auto-initialize checklist items when first viewing — guarded by ref to prevent double-fire
  useEffect(() => {
    if (missionId && !initRef.current && items.length === 0 && !isLoading && !ensureChecklist.isPending) {
      initRef.current = true;
      ensureChecklist.mutate(missionId);
    }
  }, [missionId, items.length, isLoading, ensureChecklist.isPending]);

  // Reset init ref when missionId changes
  useEffect(() => {
    initRef.current = false;
  }, [missionId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">Loading checklist…</span>
      </div>
    );
  }

  if (items.length === 0 && ensureChecklist.isPending) {
    return (
      <div className="flex items-center gap-2 p-4">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">Initializing checklist…</span>
      </div>
    );
  }

  if (items.length === 0) return null;

  const itemIsPassed = (item: ChecklistItem) => {
    if (item.override_note) return true;
    if (item.is_auto) return item.auto_status === "ready";
    return item.manual_checked;
  };

  const goCfg = goStatusConfig[goStatus];
  const GoIcon = goCfg.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <GoIcon className={`w-3.5 h-3.5 ${goCfg.color}`} />
        <span className={`font-mono text-[10px] px-1.5 py-0.5 ${goCfg.color} ${goCfg.bg}`}>
          {passedCount}/{totalCount} {goCfg.label}
        </span>
      </div>
    );
  }

  return (
    <div className="surface border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Preflight Checklist</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{passedCount}/{totalCount}</span>
          <span className={`font-mono text-[10px] px-2 py-0.5 font-medium ${goCfg.color} ${goCfg.bg}`}>
            {goCfg.label}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {items.map((item) => {
          const passed = itemIsPassed(item);
          const isExpanded = expandedItem === item.id;
          const hasAutoDetail = item.is_auto && item.auto_status !== "ready" && item.auto_status !== "pending";

          return (
            <div key={item.id} className={`${passed ? "bg-success/5" : item.is_critical && !passed ? "bg-destructive/5" : ""}`}>
              <div className="flex items-center gap-3 px-4 py-2.5">
                {/* Check control */}
                {item.is_auto ? (
                  <div className="shrink-0">{statusIcon(item, passed)}</div>
                ) : (
                  <Checkbox
                    checked={item.manual_checked || !!item.override_note}
                    onCheckedChange={(checked) => {
                      toggleCheck.mutate({ itemId: item.id, checked: !!checked });
                    }}
                    className="shrink-0"
                    disabled={toggleCheck.isPending}
                  />
                )}

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs ${passed ? "text-foreground" : "text-foreground"}`}>
                      {item.label}
                    </span>
                    {item.is_critical && (
                      <span className="font-mono text-[9px] text-destructive bg-destructive/10 px-1 py-0.5">CRITICAL</span>
                    )}
                    {item.is_auto && (
                      <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1 py-0.5">AUTO</span>
                    )}
                  </div>
                  {item.override_note && (
                    <p className="font-mono text-[10px] text-primary mt-0.5 flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" /> Override: {item.override_note}
                    </p>
                  )}
                </div>

                {/* Expand for override */}
                <button
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedItem(null);
                    } else {
                      setExpandedItem(item.id);
                      setOverrideText(item.override_note || "");
                    }
                  }}
                  className="shrink-0 p-1 hover:bg-secondary/50 transition-colors"
                  title="Add review note / override"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Expanded: override note */}
              {isExpanded && (
                <div className="px-4 pb-3 pl-11">
                  {hasAutoDetail && (
                    <p className="font-mono text-[10px] text-warning mb-2">
                      Auto-check status: {item.auto_status}
                    </p>
                  )}
                  <Textarea
                    value={overrideText}
                    onChange={(e) => setOverrideText(e.target.value)}
                    placeholder="Add a review note to override this item…"
                    className="h-16 text-xs font-mono bg-background border-border resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 font-mono text-[10px]"
                      onClick={() => setExpandedItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 font-mono text-[10px]"
                      disabled={saveOverride.isPending}
                      onClick={() => {
                        saveOverride.mutate({ itemId: item.id, note: overrideText });
                        setExpandedItem(null);
                      }}
                    >
                      {overrideText ? "Save Override" : "Clear Override"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blocked Reasons */}
      {blockedReasons.length > 0 && (
        <div className="p-4 border-t border-border bg-destructive/5">
          <p className="font-mono text-[10px] text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <XCircle className="w-3 h-3" /> Blocked Reasons
          </p>
          <ul className="space-y-1">
            {blockedReasons.map((reason, i) => (
              <li key={i} className="font-mono text-[10px] text-destructive/80 flex items-start gap-1.5">
                <span className="mt-1 w-1 h-1 bg-destructive rounded-full shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
