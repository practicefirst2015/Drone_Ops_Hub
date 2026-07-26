import { useErrorMonitoring } from "@/hooks/useErrorMonitoring";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Activity, CheckCircle2, XCircle, Database, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function useActivityStats() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["activity_stats", orgId],
    queryFn: async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();

      const [dayRes, weekRes] = await Promise.all([
        supabase
          .from("activity_logs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .gte("created_at", oneDayAgo),
        supabase
          .from("activity_logs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .gte("created_at", oneWeekAgo),
      ]);

      return {
        last24h: dayRes.count ?? 0,
        last7d: weekRes.count ?? 0,
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function SystemHealthWidget() {
  const { errorCounts, recentErrors, isLoading, inMemoryStats } = useErrorMonitoring();
  const activityStats = useActivityStats();

  const hasErrors = errorCounts.last24h > 0 || inMemoryStats.bySeverity.critical > 0;
  const healthStatus = inMemoryStats.bySeverity.critical > 0
    ? "critical"
    : errorCounts.last24h > 5
      ? "degraded"
      : "healthy";

  const StatusIcon = healthStatus === "healthy"
    ? CheckCircle2
    : healthStatus === "degraded"
      ? AlertTriangle
      : XCircle;

  const statusColor = healthStatus === "healthy"
    ? "text-success"
    : healthStatus === "degraded"
      ? "text-warning"
      : "text-destructive";

  const statusLabel = healthStatus === "healthy"
    ? "All Systems Operational"
    : healthStatus === "degraded"
      ? "Degraded Performance"
      : "Critical Issues Detected";

  if (isLoading) {
    return (
      <div className="surface border border-border p-6">
        <div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" />
      </div>
    );
  }

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="section-title mb-0">System Health</span>
        </div>
        <div className={`flex items-center gap-1.5 ${statusColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">{statusLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        <div className="bg-card px-4 py-3">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Errors (24h)</p>
          <p className={`font-mono text-lg font-semibold ${errorCounts.last24h > 0 ? "text-destructive" : "text-foreground"}`}>
            {errorCounts.last24h}
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Errors (7d)</p>
          <p className="font-mono text-lg font-semibold text-foreground">{errorCounts.last7d}</p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Actions (24h)</p>
          <p className="font-mono text-lg font-semibold text-foreground">{activityStats.data?.last24h ?? "—"}</p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Actions (7d)</p>
          <p className="font-mono text-lg font-semibold text-foreground">{activityStats.data?.last7d ?? "—"}</p>
        </div>
      </div>

      {inMemoryStats.total > 0 && (
        <div className="px-6 py-3 border-t border-border">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Session Errors</p>
          <div className="flex gap-4">
            {inMemoryStats.bySeverity.critical > 0 && (
              <span className="font-mono text-xs text-destructive">{inMemoryStats.bySeverity.critical} critical</span>
            )}
            {inMemoryStats.bySeverity.error > 0 && (
              <span className="font-mono text-xs text-warning">{inMemoryStats.bySeverity.error} errors</span>
            )}
            {inMemoryStats.bySeverity.warning > 0 && (
              <span className="font-mono text-xs text-muted-foreground">{inMemoryStats.bySeverity.warning} warnings</span>
            )}
          </div>
          <div className="flex gap-4 mt-1">
            {Object.entries(inMemoryStats.byType).map(([type, count]) =>
              count > 0 ? (
                <span key={type} className="font-mono text-[10px] text-muted-foreground/70">
                  {type}: {count}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {recentErrors.length > 0 && (
        <div className="border-t border-border">
          <div className="px-6 py-2 border-b border-border">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Recent Errors</p>
          </div>
          <div className="divide-y divide-border max-h-48 overflow-y-auto">
            {recentErrors.slice(0, 5).map((err) => (
              <div key={err.id} className="px-6 py-2.5 flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center bg-destructive/10 rounded">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground truncate">{err.error_message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{err.error_type}</span>
                    {err.component && (
                      <>
                        <span className="font-mono text-[10px] text-muted-foreground/50">·</span>
                        <span className="font-mono text-[10px] text-muted-foreground/60">{err.component}</span>
                      </>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground/50">·</span>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
