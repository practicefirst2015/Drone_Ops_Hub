import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const DELIVERABLE_TYPES = [
  { value: "rgb_imagery", label: "RGB Imagery" },
  { value: "thermal_imagery", label: "Thermal Imagery" },
  { value: "multispectral_imagery", label: "Multispectral Imagery" },
  { value: "video", label: "Video" },
  { value: "orthomosaic_source", label: "Orthomosaic Source Data" },
  { value: "lidar_data", label: "LiDAR Data" },
  { value: "inspection_notes", label: "Inspection Notes" },
  { value: "mapping_data", label: "Mapping Data" },
  { value: "survey_data", label: "Survey Data" },
  { value: "other", label: "Other" },
] as const;

export const DELIVERABLE_STATUSES = [
  { value: "expected", label: "Expected", color: "text-muted-foreground bg-muted" },
  { value: "captured", label: "Captured", color: "text-success bg-success/10" },
  { value: "partial", label: "Partial", color: "text-warning bg-warning/10" },
  { value: "not_captured", label: "Not Captured", color: "text-destructive bg-destructive/10" },
  { value: "in_processing", label: "In Processing", color: "text-primary bg-primary/10" },
  { value: "completed", label: "Completed", color: "text-success bg-success/10" },
] as const;

export function useFlightDeliverables(flightLogId: string | undefined) {
  return useQuery({
    queryKey: ["flight_deliverables", flightLogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_log_deliverables")
        .select("*")
        .eq("flight_log_id", flightLogId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!flightLogId,
  });
}

export function useProjectDeliverables(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_deliverables", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_log_deliverables")
        .select("*, flight_logs!inner(id, title, project_id, mission_id, flight_date)")
        .eq("flight_logs.project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useMissionDeliverables(missionId: string | undefined) {
  return useQuery({
    queryKey: ["mission_deliverables", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_log_deliverables")
        .select("*, flight_logs!inner(id, title, mission_id, flight_date)")
        .eq("flight_logs.mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });
}

export function useCreateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: {
      flight_log_id: string;
      organization_id: string;
      deliverable_type: string;
      status?: string;
      label?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("flight_log_deliverables")
        .insert(row as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["flight_deliverables", data.flight_log_id] });
      qc.invalidateQueries({ queryKey: ["project_deliverables"] });
      qc.invalidateQueries({ queryKey: ["mission_deliverables"] });
    },
  });
}

export function useUpdateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; notes?: string; label?: string }) => {
      const { data, error } = await supabase
        .from("flight_log_deliverables")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["flight_deliverables", data.flight_log_id] });
      qc.invalidateQueries({ queryKey: ["project_deliverables"] });
      qc.invalidateQueries({ queryKey: ["mission_deliverables"] });
    },
  });
}

export function useDeleteDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flight_log_deliverables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flight_deliverables"] });
      qc.invalidateQueries({ queryKey: ["project_deliverables"] });
      qc.invalidateQueries({ queryKey: ["mission_deliverables"] });
    },
  });
}

// ── Deliverable Documents (file attachments) ──────────────────────────────

export function useDeliverableDocuments(flightDeliverableId: string | undefined) {
  return useQuery({
    queryKey: ["deliverable_documents", flightDeliverableId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deliverable_documents")
        .select("*")
        .eq("flight_deliverable_id", flightDeliverableId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; document_url: string; file_name: string; storage_path: string | null; created_at: string }>;
    },
    enabled: !!flightDeliverableId,
  });
}

export function useUploadDeliverableFile(orgId: string, flightLogId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, deliverableId }: { file: File; deliverableId: string }) => {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${orgId}/${flightLogId}/${deliverableId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("mission-deliverables").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: signedData } = await supabase.storage.from("mission-deliverables").createSignedUrl(path, 3600);

      const { error: dbErr } = await (supabase as any)
        .from("deliverable_documents")
        .insert({
          flight_deliverable_id: deliverableId,
          document_url: signedData?.signedUrl || "",
          storage_path: path,
          file_name: file.name,
          uploaded_by: user!.id,
        });
      if (dbErr) throw dbErr;

      return path;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["deliverable_documents", vars.deliverableId] });
      qc.invalidateQueries({ queryKey: ["flight_deliverables", flightLogId] });
    },
  });
}

export function useDeleteDeliverableDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, storagePath }: { docId: string; storagePath: string | null }) => {
      if (storagePath) {
        await supabase.storage.from("mission-deliverables").remove([storagePath]);
      }
      const { error } = await (supabase as any).from("deliverable_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverable_documents"] });
    },
  });
}
