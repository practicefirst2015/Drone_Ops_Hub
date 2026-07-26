import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function usePostflightIssues(flightLogId: string | undefined) {
  return useQuery({
    queryKey: ["postflight_issues", flightLogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postflight_issues")
        .select("*, profiles_reported:reported_by(id, full_name), profiles_resolved:resolved_by(id, full_name), profiles_pilot:pilot_id(id, full_name), drone_models(id, name, drone_manufacturers(name)), missions(id, title)")
        .eq("flight_log_id", flightLogId!)
        .order("severity", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!flightLogId,
  });
}

export function useOrgUnresolvedIssues() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["postflight_issues_unresolved", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postflight_issues")
        .select("id, title, severity, category, resolution_status, created_at, flight_log_id, profiles_reported:reported_by(full_name), profiles_pilot:pilot_id(full_name), drone_models(name), flight_logs(title)")
        .eq("organization_id", orgId!)
        .in("resolution_status", ["open", "investigating"])
        .order("severity", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreatePostflightIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (issue: Record<string, any>) => {
      const { data, error } = await supabase
        .from("postflight_issues")
        .insert(issue as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["postflight_issues", data.flight_log_id] });
      qc.invalidateQueries({ queryKey: ["postflight_issues_unresolved"] });
    },
  });
}

export function useUpdatePostflightIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("postflight_issues")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["postflight_issues", data.flight_log_id] });
      qc.invalidateQueries({ queryKey: ["postflight_issues_unresolved"] });
    },
  });
}
