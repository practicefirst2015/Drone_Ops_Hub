import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SIGNED_URL_SHORT } from "@/lib/constants";

export function useMissionFiles(missionId: string | undefined) {
  return useQuery({
    queryKey: ["mission_files", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_files")
        .select("*, profiles:generated_by(full_name)")
        .eq("mission_id", missionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });
}

export function useFlightLogFiles(flightLogId: string | undefined) {
  return useQuery({
    queryKey: ["flight_log_files", flightLogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_log_files")
        .select("*, profiles:generated_by(full_name)")
        .eq("flight_log_id", flightLogId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!flightLogId,
  });
}

export async function downloadStoredFile(storagePath: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from("project-documents")
    .createSignedUrl(storagePath, SIGNED_URL_SHORT);

  if (error || !data?.signedUrl) {
    throw new Error("Failed to get download URL");
  }

  // For HTML files, fetch content, render in new window, and trigger print for PDF
  if (fileName.endsWith(".html")) {
    try {
      const response = await fetch(data.signedUrl);
      const html = await response.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 600);
        return;
      }
    } catch {
      // Fall through to direct open if fetch fails
    }
  }

  window.open(data.signedUrl, "_blank");
}
