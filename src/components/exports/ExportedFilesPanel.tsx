import { format } from "date-fns";
import { Download, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadStoredFile } from "@/hooks/useExportedFiles";
import { toast } from "sonner";

interface ExportedFile {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  created_at: string;
  file_size_bytes: number | null;
  profiles?: { full_name: string | null } | null;
  // mission-specific
  snapshot_go_status?: string;
  snapshot_preflight_status?: string;
  // flight-log-specific
  snapshot_outcome?: string;
  snapshot_duration_minutes?: number | null;
}

interface ExportedFilesPanelProps {
  files: ExportedFile[];
  isLoading: boolean;
  entityType: "mission" | "flight_log";
}

export function ExportedFilesPanel({ files, isLoading, entityType }: ExportedFilesPanelProps) {
  if (isLoading) return null;
  if (!files || files.length === 0) return null;

  const handleDownload = async (file: ExportedFile) => {
    try {
      await downloadStoredFile(file.storage_path, file.file_name);
    } catch {
      toast.error("Failed to download file");
    }
  };

  const typeLabel = entityType === "mission" ? "Mission Briefs" : "Postflight Reports";
  const typeIcon = entityType === "mission" ? "📋" : "📄";

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <p className="section-title mb-0">Exported {typeLabel}</p>
      </div>
      <div className="divide-y divide-border">
        {files.map((file) => (
          <div key={file.id} className="px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{typeIcon}</span>
                <span className="font-mono text-xs text-foreground truncate">
                  {file.file_name}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {format(new Date(file.created_at), "MMM d, yyyy HH:mm")}
                </span>
                {(file as any).profiles?.full_name && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    by {(file as any).profiles.full_name}
                  </span>
                )}
                {entityType === "mission" && file.snapshot_go_status && (
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 ${
                    file.snapshot_go_status === "go" ? "text-success bg-success/10" :
                    file.snapshot_go_status === "no_go" ? "text-destructive bg-destructive/10" :
                    "text-warning bg-warning/10"
                  }`}>
                    {file.snapshot_go_status === "go" ? "GO" : file.snapshot_go_status === "no_go" ? "NO-GO" : "PENDING"}
                  </span>
                )}
                {entityType === "flight_log" && file.snapshot_outcome && (
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 ${
                    file.snapshot_outcome === "completed" ? "text-success bg-success/10" :
                    file.snapshot_outcome === "partial" ? "text-warning bg-warning/10" :
                    "text-destructive bg-destructive/10"
                  }`}>
                    {file.snapshot_outcome.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownload(file)}
              title="Open as PDF (print)"
              className="shrink-0"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
