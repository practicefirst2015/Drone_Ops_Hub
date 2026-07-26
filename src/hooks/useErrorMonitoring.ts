import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getErrorStats, getInMemoryErrors } from "@/lib/errorLogger";
import { useState, useCallback } from "react";

export function useErrorMonitoring() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const [, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const recentErrors = useQuery({
    queryKey: ["error_logs_recent", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs")
        .select("id, error_type, error_message, component, query_key, severity, created_at, url")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });

  const errorCounts = useQuery({
    queryKey: ["error_logs_counts", orgId],
    queryFn: async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();

      const [dayRes, weekRes] = await Promise.all([
        supabase
          .from("error_logs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .gte("created_at", oneDayAgo),
        supabase
          .from("error_logs")
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

  return {
    recentErrors: recentErrors.data || [],
    errorCounts: errorCounts.data || { last24h: 0, last7d: 0 },
    isLoading: recentErrors.isLoading || errorCounts.isLoading,
    inMemoryStats: getErrorStats(),
    inMemoryErrors: getInMemoryErrors(),
    refresh,
  };
}
