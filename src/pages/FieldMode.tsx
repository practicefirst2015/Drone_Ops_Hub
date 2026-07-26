import { useState, useMemo } from "react";
import { ArrowLeft, Radio, CloudOff } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { FieldMissionCard } from "@/components/field/FieldMissionCard";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { SyncStatusPanel } from "@/components/offline/SyncStatusPanel";
import { useOnlineStatus, useCachedMissions, useCacheMissionsEffect, useSyncManager } from "@/hooks/useOffline";
import type { Mission } from "@/hooks/useMissionData";

function useTodayMissions() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const online = useOnlineStatus();

  const serverQuery = useQuery({
    queryKey: ["field_today_missions", orgId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("missions")
        .select("*, projects(id, name, status, location_name)")
        .eq("organization_id", orgId!)
        .gte("mission_date", `${today}T00:00:00`)
        .lte("mission_date", `${today}T23:59:59`)
        .in("status", ["draft", "planning", "approved", "ready", "in_progress"])
        .order("mission_date", { ascending: true });
      if (error) throw error;
      return data as Mission[];
    },
    enabled: !!orgId && online,
    staleTime: 30_000,
    refetchInterval: online ? 30_000 : false,
  });

  // Cache missions for offline use
  useCacheMissionsEffect(serverQuery.data, orgId);

  // Fallback to cached missions when offline
  const { missions: cached } = useCachedMissions(orgId);
  const offlineMissions = useMemo(() => {
    if (!cached.length) return [];
    const today = format(new Date(), "yyyy-MM-dd");
    return cached
      .map((c) => c.data as Mission)
      .filter((m) => {
        if (!m.mission_date) return false;
        return m.mission_date.startsWith(today) &&
          ["draft", "planning", "approved", "ready", "in_progress"].includes(m.status);
      })
      .sort((a, b) => (a.mission_date || "").localeCompare(b.mission_date || ""));
  }, [cached]);

  return {
    data: online ? (serverQuery.data || offlineMissions) : offlineMissions,
    isLoading: online ? serverQuery.isLoading : false,
    isOffline: !online,
  };
}

const FieldMode = () => {
  const { user } = useAuth();
  const { data: missions = [], isLoading, isOffline } = useTodayMissions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSync, setShowSync] = useState(false);
  const { pendingCount } = useSyncManager();

  const effectiveSelected = selectedId || missions[0]?.id || null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground active:text-foreground transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              <Radio className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary font-medium">
                Field Mode
              </span>
              {isOffline && <CloudOff className="w-3 h-3 text-destructive" />}
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {format(new Date(), "EEEE, MMM d")}
            </span>
          </div>
          <button
            onClick={() => setShowSync(true)}
            className="relative w-10 h-10 flex items-center justify-center text-muted-foreground active:text-foreground"
          >
            <CloudOff className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-warning text-warning-foreground font-mono text-[9px] flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24 max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-3 h-3 bg-primary animate-pulse-glow" />
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-16">
            <Radio className="w-8 h-8 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="font-mono text-sm text-muted-foreground mb-1">
              {isOffline ? "No cached missions for today" : "No missions today"}
            </p>
            <p className="font-mono text-xs text-muted-foreground/60">
              {isOffline
                ? "Connect to the internet to load today's missions"
                : "Missions scheduled for today will appear here"}
            </p>
            <Link
              to="/"
              className="inline-block mt-6 font-mono text-xs text-primary active:opacity-70"
            >
              ← Back to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {missions.length} mission{missions.length > 1 ? "s" : ""} today
              </span>
              {isOffline && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-destructive flex items-center gap-1">
                  <CloudOff className="w-3 h-3" />
                  Cached
                </span>
              )}
            </div>
            <div className="space-y-3">
              {missions.map((mission) => (
                <FieldMissionCard
                  key={mission.id}
                  mission={mission}
                  isSelected={mission.id === effectiveSelected}
                  onSelect={() => setSelectedId(mission.id)}
                  userId={user?.id || ""}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <SyncStatusPanel open={showSync} onOpenChange={setShowSync} />
    </div>
  );
};

export default FieldMode;
