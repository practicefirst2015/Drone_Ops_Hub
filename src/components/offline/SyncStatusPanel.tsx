import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Trash2, Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useSyncManager, useOfflineFlightLogs, useOfflineNotes, useOfflineFiles } from "@/hooks/useOffline";
import { formatDistanceToNow } from "date-fns";

interface SyncStatusPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "synced":
      return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
    case "error":
      return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
    case "syncing":
      return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-warning" />;
  }
}

export function SyncStatusPanel({ open, onOpenChange }: SyncStatusPanelProps) {
  const { online, syncing, pendingCount, triggerSync } = useSyncManager();
  const { logs, remove: removeLog } = useOfflineFlightLogs();
  const { notes } = useOfflineNotes();
  const { files } = useOfflineFiles();

  const allItems = [
    ...logs.map((l) => ({
      id: l.localId,
      type: "Flight Log" as const,
      label: l.data.title || "Untitled Flight",
      status: l.status,
      error: l.error,
      time: l.createdAt,
      onDelete: () => removeLog(l.localId),
    })),
    ...notes.map((n) => ({
      id: n.localId,
      type: "Note" as const,
      label: `${n.entityType} — ${n.field}`,
      status: n.status,
      error: n.error,
      time: n.createdAt,
      onDelete: undefined,
    })),
    ...files.map((f) => ({
      id: f.localId,
      type: "File" as const,
      label: f.fileName,
      status: f.status,
      error: f.error,
      time: f.createdAt,
      onDelete: undefined,
    })),
  ].sort((a, b) => b.time - a.time);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-mono text-sm uppercase tracking-widest">
            Offline Queue
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Sync button */}
          <button
            onClick={triggerSync}
            disabled={!online || syncing || pendingCount === 0}
            className="w-full h-12 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-40"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncing ? "Syncing…" : `Sync ${pendingCount} Item${pendingCount !== 1 ? "s" : ""}`}
          </button>

          {!online && (
            <p className="font-mono text-[10px] text-muted-foreground text-center uppercase tracking-widest">
              Waiting for connection
            </p>
          )}

          {/* Items list */}
          {allItems.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground text-center py-6">
              No offline data
            </p>
          ) : (
            <div className="space-y-1">
              {allItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 bg-secondary/50"
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {item.type}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-foreground truncate">
                      {item.label}
                    </p>
                    {item.error && (
                      <p className="font-mono text-[10px] text-destructive truncate">
                        {item.error}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(item.time, { addSuffix: true })}
                  </span>
                  {item.onDelete && item.status !== "syncing" && (
                    <button
                      onClick={item.onDelete}
                      className="p-1 text-muted-foreground active:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
