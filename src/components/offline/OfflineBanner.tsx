import { WifiOff, Wifi, RefreshCw, Cloud, CloudOff, Loader2 } from "lucide-react";
import { useSyncManager } from "@/hooks/useOffline";
import { formatDistanceToNow } from "date-fns";

export function OfflineBanner() {
  const { online, syncing, pendingCount, lastSync, triggerSync } = useSyncManager();

  // Nothing to show when online and no pending items
  if (online && pendingCount === 0 && !syncing) return null;

  return (
    <div
      className={`sticky top-0 z-[60] px-4 py-2 flex items-center justify-between gap-3 font-mono text-xs transition-colors ${
        !online
          ? "bg-destructive/20 text-destructive border-b border-destructive/30"
          : syncing
          ? "bg-primary/10 text-primary border-b border-primary/20"
          : pendingCount > 0
          ? "bg-warning/15 text-warning border-b border-warning/20"
          : "bg-success/15 text-success border-b border-success/20"
      }`}
    >
      <div className="flex items-center gap-2">
        {!online ? (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest">Offline</span>
            {pendingCount > 0 && (
              <span className="text-[10px] opacity-80">
                — {pendingCount} pending
              </span>
            )}
          </>
        ) : syncing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="uppercase tracking-widest">Syncing…</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudOff className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest">
              {pendingCount} unsent
            </span>
          </>
        ) : (
          <>
            <Cloud className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest">Synced</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {lastSync && lastSync.timestamp > 0 && (
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {formatDistanceToNow(lastSync.timestamp, { addSuffix: true })}
          </span>
        )}
        {online && pendingCount > 0 && !syncing && (
          <button
            onClick={triggerSync}
            className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary active:bg-primary/30 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Sync
          </button>
        )}
      </div>
    </div>
  );
}
