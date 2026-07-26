import { useRef, useState } from "react";
import { FileText, Upload, Trash2, Download, Eye, Image, File, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useOrg } from "@/contexts/OrgContext";
import { logActivity } from "@/lib/activityLogger";
import {
  STORAGE_BUCKET,
  MAX_FILE_SIZE_BYTES,
  BLOCKED_FILE_EXTENSIONS,
  PREVIEWABLE_MIME_TYPES,
  SIGNED_URL_SHORT,
} from "@/lib/constants";

interface DocumentManagerProps {
  /** "project" or "client" */
  entityType: "project" | "client";
  entityId: string;
  canUpload: boolean;
  userId?: string;
  canDelete?: boolean;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (mimeType?.startsWith("image/")) return <Image className="w-3.5 h-3.5 text-primary shrink-0" />;
  if (mimeType === "application/pdf") return <FileText className="w-3.5 h-3.5 text-destructive shrink-0" />;
  return <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.substring(dot).toLowerCase() : "";
}

export function DocumentManager({ entityType, entityId, canUpload, userId, canDelete }: DocumentManagerProps) {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const { confirm, ConfirmationDialog } = useConfirm();

  const tableName = entityType === "project" ? "project_documents" : "client_documents";
  const foreignKey = entityType === "project" ? "project_id" : "client_id";
  const queryKey = [tableName, entityId];

  const { data: documents = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq(foreignKey, entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath?: string }) => {
      // Delete from storage first to prevent orphaned files
      if (storagePath) {
        const { error: storageErr } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        if (storageErr) console.warn("Storage delete warning:", storageErr.message);
      }
      const { error } = await supabase.from(tableName as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Document deleted");
    },
    onError: (err: any) => toast.error(`Delete failed: ${err.message}`),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !userId) return;
    setUploading(true);

    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of Array.from(files)) {
        // Validate size
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(`${file.name} exceeds 20MB limit`);
          errorCount++;
          continue;
        }

        // Validate extension
        const ext = getExtension(file.name);
        if (BLOCKED_FILE_EXTENSIONS.includes(ext)) {
          toast.error(`${file.name}: blocked file type (${ext})`);
          errorCount++;
          continue;
        }

        // Validate not empty
        if (file.size === 0) {
          toast.error(`${file.name} is empty`);
          errorCount++;
          continue;
        }

        const storagePath = `${entityType}/${entityId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file);
        if (uploadError) {
          toast.error(`Upload failed for ${file.name}: ${uploadError.message}`);
          errorCount++;
          continue;
        }

        // Generate fresh signed URL
        const { data: signedData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

        const insertData: any = {
          [foreignKey]: entityId,
          uploaded_by: userId,
          file_name: file.name,
          file_url: signedData?.signedUrl || storagePath,
          file_size_bytes: file.size,
          mime_type: file.type || null,
          storage_path: storagePath,
        };

        const { error: dbError } = await supabase.from(tableName as any).insert(insertData);
        if (dbError) {
          // Clean up orphaned storage file
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
          toast.error(`Failed to save record for ${file.name}: ${dbError.message}`);
          errorCount++;
          continue;
        }
        successCount++;
      }

      if (successCount > 0) {
        qc.invalidateQueries({ queryKey });
        toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
        if (currentOrg) logActivity({ organizationId: currentOrg.id, action: "uploaded", entityType: "document", entityId: entityId, entityName: `${successCount} file(s)`, metadata: { entity_type: entityType } });
      }
      if (errorCount > 0 && successCount === 0) {
        toast.error("All uploads failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (doc: any) => {
    try {
      if (doc.storage_path) {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(doc.storage_path, SIGNED_URL_SHORT);
        if (error) throw error;
        // Trigger actual download
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = doc.file_name;
        a.click();
      } else {
        window.open(doc.file_url, "_blank");
      }
    } catch {
      toast.error("Could not generate download link. The file may have been removed.");
    }
  };

  const handlePreview = async (doc: any) => {
    if (!PREVIEWABLE_MIME_TYPES.includes(doc.mime_type)) {
      handleDownload(doc);
      return;
    }
    try {
      if (doc.storage_path) {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(doc.storage_path, SIGNED_URL_SHORT);
        if (error) throw error;
        setPreviewUrl(data.signedUrl);
        setPreviewMime(doc.mime_type);
      } else {
        setPreviewUrl(doc.file_url);
        setPreviewMime(doc.mime_type);
      }
    } catch {
      toast.error("Could not load preview. Try downloading instead.");
    }
  };

  const handleDelete = (doc: any) => {
    confirm({
      title: "Delete document?",
      description: `This will permanently delete "${doc.file_name}" and remove the file from storage. This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: () => deleteMutation.mutateAsync({ id: doc.id, storagePath: doc.storage_path }),
    });
  };

  return (
    <div>
      <ConfirmationDialog />

      {/* Upload bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">
          {entityType === "project" ? "Project" : "Client"} Documents
          <span className="font-mono text-[10px] text-muted-foreground ml-2">({documents.length})</span>
        </p>
        {canUpload && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.kml,.kmz,.tif,.tiff,.las,.laz"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Upload className="w-3 h-3" />
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="surface border border-border">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="font-mono text-xs text-destructive">Failed to load documents</span>
            </div>
            <button onClick={() => refetch()} className="font-mono text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-muted-foreground">
            No documents uploaded yet.
            {canUpload && " Click \"Upload File\" to add documents."}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left stat-label">File</th>
                <th className="px-6 py-3 text-left stat-label">Type</th>
                <th className="px-6 py-3 text-left stat-label">Size</th>
                <th className="px-6 py-3 text-left stat-label">Uploaded</th>
                <th className="px-6 py-3 text-right stat-label">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-secondary/50 group">
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handlePreview(doc)}
                      className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors text-left"
                    >
                      {getFileIcon(doc.mime_type)}
                      <span className="truncate max-w-[240px]">{doc.file_name}</span>
                    </button>
                  </td>
                  <td className="px-6 py-3 font-mono text-[10px] text-muted-foreground uppercase">
                    {doc.mime_type?.split("/").pop() || getExtension(doc.file_name).replace(".", "") || "—"}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {formatSize(doc.file_size_bytes)}
                  </td>
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground block">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {PREVIEWABLE_MIME_TYPES.includes(doc.mime_type) && (
                        <button
                          onClick={() => handlePreview(doc)}
                          className="text-muted-foreground hover:text-primary"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-muted-foreground hover:text-primary"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {(canDelete || doc.uploaded_by === userId) && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
          onClick={() => { setPreviewUrl(null); setPreviewMime(null); }}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setPreviewUrl(null); setPreviewMime(null); }}
              className="absolute -top-10 right-0 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              Close ✕
            </button>
            {previewMime === "application/pdf" ? (
              <iframe src={previewUrl} className="w-full h-[85vh] border border-border bg-card" />
            ) : (
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] mx-auto border border-border" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
