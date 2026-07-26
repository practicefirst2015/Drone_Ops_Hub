import { useOrgSettings } from "@/hooks/useOrgSettings";

export function useClientVisibility() {
  const { settings, isLoading } = useOrgSettings();

  return {
    isLoading,
    canViewFlightLogs: settings?.client_can_view_flight_logs ?? false,
    canViewInvoices: settings?.client_can_view_invoices ?? true,
    canViewDeliverables: settings?.client_can_view_deliverables ?? true,
    canViewMissionStatus: settings?.client_can_view_mission_status ?? false,
  };
}
