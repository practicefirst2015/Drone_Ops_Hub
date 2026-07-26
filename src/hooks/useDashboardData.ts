import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useDashboardMissions() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["dash_cmd_missions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("id, title, status, mission_date, go_status, preflight_status, project_id, projects(id, name)")
        .eq("organization_id", orgId!)
        .in("status", ["draft", "planning", "approved", "ready", "in_progress"])
        .order("mission_date", { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useDashboardFlightLogs() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["dash_cmd_flight_logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, title, flight_date, outcome, duration_minutes, pilot_id, drone_model_id, mission_id, profiles!flight_logs_pilot_id_fkey(full_name), drone_models(name), missions(title)")
        .eq("organization_id", orgId!)
        .order("flight_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useDashboardInvoices() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["dash_cmd_invoices", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, issued_date, clients(name), projects(name)")
        .eq("organization_id", orgId!)
        .in("status", ["issued", "overdue"])
        .order("due_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useDashboardDeliverables() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["dash_cmd_deliverables", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_deliverables")
        .select("id, deliverable_type, label, status, project_id, projects(name)")
        .eq("organization_id", orgId!)
        .in("status", ["expected", "partial", "not_captured", "in_processing"])
        .order("updated_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
