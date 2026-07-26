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

export const PROJECT_DELIVERABLE_STATUSES = [
  { value: "expected", label: "Expected", color: "text-muted-foreground bg-muted" },
  { value: "captured", label: "Captured", color: "text-primary bg-primary/10" },
  { value: "partial", label: "Partial", color: "text-warning bg-warning/10" },
  { value: "not_captured", label: "Missing", color: "text-destructive bg-destructive/10" },
  { value: "in_processing", label: "In Processing", color: "text-primary bg-primary/10" },
  { value: "completed", label: "Completed", color: "text-success bg-success/10" },
] as const;

export function useProjectDeliverablesList(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_deliverables_list", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_deliverables")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateProjectDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: {
      project_id: string;
      organization_id: string;
      deliverable_type: string;
      label?: string;
      description?: string;
      status?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("project_deliverables")
        .insert(row as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["project_deliverables_list", data.project_id] });
    },
  });
}

export function useUpdateProjectDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; notes?: string; label?: string; description?: string }) => {
      const { data, error } = await supabase
        .from("project_deliverables")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["project_deliverables_list", data.project_id] });
    },
  });
}

export function useDeleteProjectDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_deliverables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project_deliverables_list"] });
    },
  });
}

// ── Project Deliverable Documents (file attachments) ─────────────────────────

export function useProjectDeliverableDocuments(projectDeliverableId: string | undefined) {
  return useQuery({
    queryKey: ["deliverable_documents", projectDeliverableId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deliverable_documents")
        .select("*")
        .eq("project_deliverable_id", projectDeliverableId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; document_url: string; file_name: string; storage_path: string | null; created_at: string }>;
    },
    enabled: !!projectDeliverableId,
  });
}

export function useUploadProjectDeliverableFile(orgId: string, projectId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, deliverableId }: { file: File; deliverableId: string }) => {
      const path = `${orgId}/projects/${projectId}/${deliverableId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("mission-deliverables").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: signedData } = await supabase.storage.from("mission-deliverables").createSignedUrl(path, 3600);

      const { error: dbErr } = await (supabase as any)
        .from("deliverable_documents")
        .insert({
          project_deliverable_id: deliverableId,
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
    },
  });
}

export function useDeleteProjectDeliverableDocument() {
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

/** Fetch flight-log deliverables aggregated for a project (from flight_log_deliverables via flight_logs) */
export function useProjectFlightDeliverables(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_flight_deliverables", projectId],
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
