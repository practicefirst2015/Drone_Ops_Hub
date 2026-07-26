import { useState } from "react";
import { FolderOpen, Image, Film, FileText, Map, Database, Download, Trash2, Tag, MessageSquare, Eye, Filter, Upload } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useIngestionFiles, useIngestionStats, useDeleteIngestionFile, useUpdateIngestionFile, getCategoryLabel, getCategoryColor, FILE_CATEGORIES, INGESTION_BUCKET } from "@/hooks/useIngestion";
import { useMissions } from "@/hooks/useMissionData";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { BulkUploadDialog } from "./BulkUploadDialog";
import { toast } from "sonner";

interface IngestionBrowserProps {
  projectId: string;
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

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function IngestionBrowser({ projectId }: IngestionBrowserProps) {
  const { canManage, canContribute, isAdmin } = useOrgRole();
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterMission, setFilterMission] = useState<string>("");
  const [showUpload, setShowUpload] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagText, setTagText] = useState("");

  const { data: files = [], isLoading } = useIngestionFiles(projectId, {
    missionId: filterMission || undefined,
    category: filterCategory || undefined,
  });
  const { data: stats } = useIngestionStats(projectId);
  const { data: missions = [] } = useMissions(projectId);
  const deleteMut = useDeleteIngestionFile();
  const updateMut = useUpdateIngestionFile();
  const { confirm, ConfirmationDialog } = useConfirm();

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from(INGESTION_BUCKET)
        .createSignedUrl(file.storage_path, 300);
      if (error) throw error;
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = file.file_name;
      a.click();
    } catch {
      toast.error("Could not generate download link");
    }
  };

  const handleDelete = (file: any) => {
    confirm({
      title: "Delete file?",
      description: `Permanently delete "${file.file_name}" from storage.`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: () => deleteMut.mutateAsync({ id: file.id, storagePath: file.storage_path }),
    });
  };

  const handleSaveNote = (fileId: string) => {
    updateMut.mutate({ id: fileId, notes: noteText }, {
      onSuccess: () => { setEditingNote(null); toast.success("Note saved"); },
      onError: () => toast.error("Failed to save"),
    });
  };

  const handleSaveTags = (fileId: string) => {
    const tags = tagText.split(",").map((t) => t.trim()).filter(Boolean);
    updateMut.mutate({ id: fileId, tags }, {
      onSuccess: () => { setEditingTags(null); toast.success("Tags saved"); },
      onError: () => toast.error("Failed to save"),
    });
  };

  // Group files by mission for folder-style browsing
  const groupedByMission: Record<string, any[]> = {};
  for (const f of files) {
    const key = f.mission_id || "unlinked";
    (groupedByMission[key] = groupedByMission[key] || []).push(f);
  }

  return (
    <div>
      <ConfirmationDialog />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">
          Ingested Files
          <span className="font-mono text-[10px] text-muted-foreground ml-2">
            ({stats?.totalFiles || 0} files • {formatSize(stats?.totalBytes || 0)})
          </span>
        </p>
        {canContribute && (
          <button
            onClick={() => setShowUpload(true)}
            className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Upload className="w-3 h-3" />
            Bulk Upload
          </button>
        )}
      </div>

      {/* Category summary cards */}
      {stats && stats.totalFiles > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
          {FILE_CATEGORIES.filter((c) => stats.byCategory[c.value]).map((cat) => {
            const s = stats.byCategory[cat.value];
            const Icon = CATEGORY_ICON[cat.value] || FileText;
            const isActive = filterCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(isActive ? "" : cat.value)}
                className={`surface border p-2 text-center transition-colors ${
                  isActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-mono text-sm text-foreground">{s.count}</p>
                <p className="font-mono text-[9px] text-muted-foreground uppercase">{cat.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <select
          value={filterMission}
          onChange={(e) => setFilterMission(e.target.value)}
          className="font-mono text-xs bg-background border border-input px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Missions</option>
          <option value="unlinked">Unlinked Files</option>
          {(missions as any[]).map((m: any) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
        {(filterCategory || filterMission) && (
          <button
            onClick={() => { setFilterCategory(""); setFilterMission(""); }}
            className="font-mono text-[10px] text-primary hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* File list */}
      <div className="surface border border-border">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" />
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-muted-foreground">
            {stats?.totalFiles ? "No files match the current filters." : "No files uploaded yet. Click \"Bulk Upload\" to ingest mission data."}
          </div>
        ) : (
          <>
            {/* Group by mission */}
            {Object.entries(groupedByMission).map(([mKey, mFiles]) => {
              const mission = mKey !== "unlinked" ? (missions as any[]).find((m: any) => m.id === mKey) : null;
              return (
                <div key={mKey}>
                  <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {mission ? mission.title : "Unlinked — Project Level"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground ml-auto">{mFiles.length} file{mFiles.length > 1 ? "s" : ""}</span>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-border">
                      {mFiles.map((file: any) => {
                        const Icon = CATEGORY_ICON[file.file_category] || FileText;
                        return (
                          <tr key={file.id} className="hover:bg-secondary/50 group">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="font-mono text-xs text-foreground truncate max-w-[240px]">{file.file_name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 ${getCategoryColor(file.file_category)}`}>
                                {getCategoryLabel(file.file_category)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                              {formatSize(file.file_size_bytes)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {format(new Date(file.created_at), "MMM d, HH:mm")}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-[10px] text-muted-foreground truncate block max-w-[100px]">
                                {file.profiles?.full_name || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {file.tags?.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {file.tags.map((t: string) => (
                                    <span key={t} className="font-mono text-[9px] px-1 py-0.5 bg-secondary text-muted-foreground">{t}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canContribute && (
                                  <button
                                    onClick={() => { setEditingTags(file.id); setTagText((file.tags || []).join(", ")); }}
                                    className="text-muted-foreground hover:text-primary" title="Tags"
                                  >
                                    <Tag className="w-3 h-3" />
                                  </button>
                                )}
                                {canContribute && (
                                  <button
                                    onClick={() => { setEditingNote(file.id); setNoteText(file.notes || ""); }}
                                    className="text-muted-foreground hover:text-primary" title="Notes"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </button>
                                )}
                                <button onClick={() => handleDownload(file)} className="text-muted-foreground hover:text-primary" title="Download">
                                  <Download className="w-3 h-3" />
                                </button>
                                {isAdmin && (
                                  <button onClick={() => handleDelete(file)} className="text-muted-foreground hover:text-destructive" title="Delete">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Inline note editor */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setEditingNote(null)}>
          <div className="surface border border-border p-4 w-96" onClick={(e) => e.stopPropagation()}>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">File Notes</p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              className="w-full bg-background border border-input px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Add notes about this file…"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditingNote(null)} className="font-mono text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={() => handleSaveNote(editingNote)} className="font-mono text-[10px] px-3 py-1 bg-primary text-primary-foreground">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline tag editor */}
      {editingTags && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setEditingTags(null)}>
          <div className="surface border border-border p-4 w-96" onClick={(e) => e.stopPropagation()}>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Tags</p>
            <input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              className="w-full bg-background border border-input px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="tag1, tag2, tag3…"
            />
            <p className="font-mono text-[10px] text-muted-foreground mt-1">Separate tags with commas</p>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditingTags(null)} className="font-mono text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={() => handleSaveTags(editingTags)} className="font-mono text-[10px] px-3 py-1 bg-primary text-primary-foreground">Save</button>
            </div>
          </div>
        </div>
      )}

      <BulkUploadDialog open={showUpload} onOpenChange={setShowUpload} projectId={projectId} />
    </div>
  );
}
