import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image, Film, Map, Database, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkUpload, categorizeFile, getCategoryLabel, getCategoryColor, MAX_INGESTION_FILE_SIZE } from "@/hooks/useIngestion";
import { useMissions } from "@/hooks/useMissionData";
import { toast } from "sonner";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  preselectedMissionId?: string;
}

interface QueuedFile {
  file: File;
  category: string;
  id: string;
}

const CATEGORY_ICON: Record<string, typeof Image> = {
  rgb_imagery: Image,
  thermal_imagery: Image,
  video: Film,
  orthomosaic: Map,
  lidar: Database,
  mapping: Map,
  report: FileText,
  other: FileText,
};

export function BulkUploadDialog({ open, onOpenChange, projectId, preselectedMissionId }: BulkUploadDialogProps) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const bulkUpload = useBulkUpload();
  const { data: missions = [] } = useMissions(projectId);

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [missionId, setMissionId] = useState(preselectedMissionId || "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, fileName: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: QueuedFile[] = Array.from(files).map((file) => ({
      file,
      category: categorizeFile(file.name, file.type),
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const removeFile = (id: string) => setQueue((q) => q.filter((f) => f.id !== id));
  const updateCategory = (id: string, category: string) => setQueue((q) => q.map((f) => f.id === id ? { ...f, category } : f));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleUpload = async () => {
    if (!currentOrg || !user || queue.length === 0) return;
    setUploading(true);

    const result = await bulkUpload.mutateAsync({
      files: queue.map((q) => q.file),
      organizationId: currentOrg.id,
      projectId,
      missionId: missionId || undefined,
      uploadedBy: user.id,
      onProgress: (done, total, fileName) => setProgress({ done, total, fileName }),
    });

    setUploading(false);
    if (result.success.length > 0) {
      toast.success(`${result.success.length} file${result.success.length > 1 ? "s" : ""} ingested`);
    }
    if (result.failed.length > 0) {
      toast.error(`${result.failed.length} file${result.failed.length > 1 ? "s" : ""} failed`);
    }
    setQueue([]);
    if (result.failed.length === 0) onOpenChange(false);
  };

  const totalSize = queue.reduce((s, q) => s + q.file.size, 0);
  const oversizedFiles = queue.filter((q) => q.file.size > MAX_INGESTION_FILE_SIZE);

  // Group queue by category
  const grouped = queue.reduce<Record<string, QueuedFile[]>>((acc, q) => {
    (acc[q.category] = acc[q.category] || []).push(q);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-widest">Bulk Upload — Deliverables Ingestion</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mission selector */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Link to Mission (optional)</label>
            <select
              value={missionId}
              onChange={(e) => setMissionId(e.target.value)}
              className="w-full font-mono text-xs bg-background border border-input px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">No mission — project-level upload</option>
              {(missions as any[]).map((m: any) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed transition-colors p-8 text-center cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
            <p className="font-mono text-xs text-muted-foreground mb-1">
              Drop files here or click to browse
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/60">
              Imagery, video, LiDAR, reports — up to 100MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
              className="hidden"
              accept=".jpg,.jpeg,.png,.tif,.tiff,.dng,.raw,.cr2,.nef,.arw,.rjpg,.seq,.fff,.csq,.mp4,.mov,.avi,.mkv,.m4v,.webm,.las,.laz,.e57,.ply,.kml,.kmz,.shp,.geojson,.gpx,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ecw,.jp2,.zip"
            />
          </div>

          {/* Queue summary */}
          {queue.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                {queue.length} file{queue.length > 1 ? "s" : ""} • {formatBytes(totalSize)}
              </span>
              {oversizedFiles.length > 0 && (
                <span className="font-mono text-[10px] text-destructive">
                  {oversizedFiles.length} file{oversizedFiles.length > 1 ? "s" : ""} exceed 100MB limit
                </span>
              )}
              <button onClick={() => setQueue([])} className="font-mono text-[10px] text-muted-foreground hover:text-destructive">
                Clear All
              </button>
            </div>
          )}

          {/* Grouped file list */}
          {Object.entries(grouped).map(([cat, files]) => {
            const Icon = CATEGORY_ICON[cat] || FileText;
            return (
              <div key={cat} className="surface border border-border">
                <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className={`font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 ${getCategoryColor(cat)}`}>
                    {getCategoryLabel(cat)}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground ml-auto">{files.length} file{files.length > 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                  {files.map((q) => (
                    <div key={q.id} className="px-4 py-2 flex items-center gap-3">
                      <span className="font-mono text-xs text-foreground truncate flex-1">{q.file.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{formatBytes(q.file.size)}</span>
                      <select
                        value={q.category}
                        onChange={(e) => updateCategory(q.id, e.target.value)}
                        className="font-mono text-[10px] bg-transparent border-0 text-muted-foreground focus:outline-none cursor-pointer"
                      >
                        {[
                          { value: "rgb_imagery", label: "RGB Imagery" },
                          { value: "thermal_imagery", label: "Thermal" },
                          { value: "video", label: "Video" },
                          { value: "orthomosaic", label: "Orthomosaic" },
                          { value: "lidar", label: "LiDAR" },
                          { value: "mapping", label: "Mapping" },
                          { value: "report", label: "Report" },
                          { value: "other", label: "Other" },
                        ].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button onClick={() => removeFile(q.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full h-1.5 bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                />
              </div>
              <p className="font-mono text-[10px] text-muted-foreground text-center">
                Uploading {progress.done + 1}/{progress.total}: {progress.fileName}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="h-9 px-4 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || queue.length === 0 || oversizedFiles.length > 0}
              className="h-9 px-5 bg-primary text-primary-foreground font-mono text-xs tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="w-3 h-3" />
              {uploading ? `Uploading ${progress.done}/${progress.total}…` : `Ingest ${queue.length} File${queue.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
