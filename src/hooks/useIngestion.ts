import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const INGESTION_BUCKET = "mission-deliverables";
export const MAX_INGESTION_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const FILE_CATEGORIES = [
  { value: "rgb_imagery", label: "RGB Imagery", extensions: [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dng", ".raw", ".cr2", ".nef", ".arw"] },
  { value: "thermal_imagery", label: "Thermal Imagery", extensions: [".rjpg", ".seq", ".fff", ".csq"] },
  { value: "video", label: "Video", extensions: [".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm"] },
  { value: "orthomosaic", label: "Orthomosaic", extensions: [".tif", ".tiff", ".ecw", ".jp2"] },
  { value: "lidar", label: "LiDAR / Point Cloud", extensions: [".las", ".laz", ".e57", ".ply"] },
  { value: "mapping", label: "Mapping Data", extensions: [".kml", ".kmz", ".shp", ".geojson", ".gpx"] },
  { value: "report", label: "Report / Document", extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"] },
  { value: "other", label: "Other", extensions: [] },
] as const;

export type FileCategory = typeof FILE_CATEGORIES[number]["value"];

export function categorizeFile(fileName: string, mimeType?: string): FileCategory {
  const ext = fileName.lastIndexOf(".") >= 0 ? fileName.substring(fileName.lastIndexOf(".")).toLowerCase() : "";
  
  // Check thermal first (specific extensions that don't overlap with generic image)
  if ([".rjpg", ".seq", ".fff", ".csq"].includes(ext)) return "thermal_imagery";
  if (mimeType?.includes("thermal")) return "thermal_imagery";
  
  // Check video
  if ([".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm"].includes(ext)) return "video";
  if (mimeType?.startsWith("video/")) return "video";
  
  // Check LiDAR
  if ([".las", ".laz", ".e57", ".ply"].includes(ext)) return "lidar";
  
  // Check mapping
  if ([".kml", ".kmz", ".shp", ".geojson", ".gpx"].includes(ext)) return "mapping";
  
  // Check reports
  if ([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"].includes(ext)) return "report";
  
  // Check orthomosaic (large geotiff — we use tif/tiff but only if filename hints at it)
  const lowerName = fileName.toLowerCase();
  if ((ext === ".tif" || ext === ".tiff") && (lowerName.includes("ortho") || lowerName.includes("mosaic") || lowerName.includes("dsm") || lowerName.includes("dem") || lowerName.includes("dtm"))) {
    return "orthomosaic";
  }
  if ([".ecw", ".jp2"].includes(ext)) return "orthomosaic";
  
  // Check RGB imagery
  if ([".jpg", ".jpeg", ".png", ".dng", ".raw", ".cr2", ".nef", ".arw"].includes(ext)) return "rgb_imagery";
  if (ext === ".tif" || ext === ".tiff") return "rgb_imagery"; // Default tif to RGB
  if (mimeType?.startsWith("image/")) return "rgb_imagery";
  
  return "other";
}

export function getCategoryLabel(category: string): string {
  return FILE_CATEGORIES.find((c) => c.value === category)?.label || "Other";
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case "rgb_imagery": return "text-primary bg-primary/10";
    case "thermal_imagery": return "text-warning bg-warning/10";
    case "video": return "text-accent-foreground bg-accent";
    case "orthomosaic": return "text-success bg-success/10";
    case "lidar": return "text-primary bg-primary/10";
    case "mapping": return "text-muted-foreground bg-muted";
    case "report": return "text-foreground bg-secondary";
    default: return "text-muted-foreground bg-muted";
  }
}

// ─── Queries ───

export function useIngestionFiles(projectId: string | undefined, filters?: { missionId?: string; category?: string }) {
  return useQuery({
    queryKey: ["ingestion_files", projectId, filters?.missionId, filters?.category],
    queryFn: async () => {
      let query = supabase
        .from("ingestion_files")
        .select("*, missions(id, title), flight_logs(id, title), profiles:uploaded_by(id, full_name)")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(500);
      
      if (filters?.missionId) query = query.eq("mission_id", filters.missionId);
      if (filters?.category) query = query.eq("file_category", filters.category);

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });
}

export function useIngestionStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ["ingestion_stats", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingestion_files")
        .select("file_category, file_size_bytes")
        .eq("project_id", projectId!);
      if (error) throw error;

      const byCategory: Record<string, { count: number; totalBytes: number }> = {};
      let totalFiles = 0;
      let totalBytes = 0;

      for (const f of data || []) {
        const cat = f.file_category || "other";
        if (!byCategory[cat]) byCategory[cat] = { count: 0, totalBytes: 0 };
        byCategory[cat].count++;
        byCategory[cat].totalBytes += Number(f.file_size_bytes || 0);
        totalFiles++;
        totalBytes += Number(f.file_size_bytes || 0);
      }

      return { byCategory, totalFiles, totalBytes };
    },
    enabled: !!projectId,
  });
}

// ─── Mutations ───

export function useBulkUpload() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      files: File[];
      organizationId: string;
      projectId: string;
      missionId?: string;
      flightLogId?: string;
      uploadedBy: string;
      onProgress?: (done: number, total: number, fileName: string) => void;
    }) => {
      const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

      for (let i = 0; i < params.files.length; i++) {
        const file = params.files[i];
        params.onProgress?.(i, params.files.length, file.name);

        if (file.size > MAX_INGESTION_FILE_SIZE) {
          results.failed.push(`${file.name}: exceeds 100MB`);
          continue;
        }

        const category = categorizeFile(file.name, file.type);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${params.projectId}/${params.missionId || "unlinked"}/${Date.now()}_${safeName}`;

        try {
          const { error: uploadErr } = await supabase.storage
            .from(INGESTION_BUCKET)
            .upload(storagePath, file, { upsert: false });
          if (uploadErr) throw uploadErr;

          const { error: dbErr } = await supabase.from("ingestion_files").insert({
            organization_id: params.organizationId,
            project_id: params.projectId,
            mission_id: params.missionId || null,
            flight_log_id: params.flightLogId || null,
            uploaded_by: params.uploadedBy,
            file_name: file.name,
            storage_path: storagePath,
            file_size_bytes: file.size,
            mime_type: file.type || null,
            file_category: category,
            processing_status: "uploaded",
          } as any);

          if (dbErr) {
            await supabase.storage.from(INGESTION_BUCKET).remove([storagePath]);
            throw dbErr;
          }

          results.success.push(file.name);
        } catch (err: any) {
          results.failed.push(`${file.name}: ${err.message}`);
        }
      }

      params.onProgress?.(params.files.length, params.files.length, "Complete");
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingestion_files"] });
      qc.invalidateQueries({ queryKey: ["ingestion_stats"] });
    },
  });
}

export function useUpdateIngestionFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; tags?: string[]; notes?: string; file_category?: string; mission_id?: string | null; processing_status?: string }) => {
      const { error } = await supabase.from("ingestion_files").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingestion_files"] });
      qc.invalidateQueries({ queryKey: ["ingestion_stats"] });
    },
  });
}

export function useDeleteIngestionFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      await supabase.storage.from(INGESTION_BUCKET).remove([storagePath]);
      const { error } = await supabase.from("ingestion_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingestion_files"] });
      qc.invalidateQueries({ queryKey: ["ingestion_stats"] });
    },
  });
}
