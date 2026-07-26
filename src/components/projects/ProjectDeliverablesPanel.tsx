import { useState, useRef } from "react";
import { Package, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, CircleCheck, Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  useProjectDeliverablesList,
  useCreateProjectDeliverable,
  useUpdateProjectDeliverable,
  useDeleteProjectDeliverable,
  useProjectFlightDeliverables,
  useProjectDeliverableDocuments,
  useUploadProjectDeliverableFile,
  useDeleteProjectDeliverableDocument,
  DELIVERABLE_TYPES,
  PROJECT_DELIVERABLE_STATUSES,
} from "@/hooks/useProjectDeliverables";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  expected: Clock,
  captured: CheckCircle2,
  partial: AlertTriangle,
  not_captured: XCircle,
  in_processing: Loader2,
  completed: CircleCheck,
};

function DeliverableFiles({ deliverableId, orgId, projectId, canEdit }: { deliverableId: string; orgId: string; projectId: string; canEdit: boolean }) {
  const { data: docs = [] } = useProjectDeliverableDocuments(deliverableId);
  const uploadMut = useUploadProjectDeliverableFile(orgId, projectId);
  const deleteMut = useDeleteProjectDeliverableDocument();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMut.mutate(
      { file, deliverableId },
      {
        onSuccess: () => toast.success("File uploaded"),
        onError: () => toast.error("Upload failed"),
      }
    );
    e.target.value = "";
  };

  const handleOpen = async (doc: { storage_path: string | null; document_url: string }) => {
    if (doc.storage_path) {
      const { data } = await supabase.storage.from("mission-deliverables").createSignedUrl(doc.storage_path, 3600);
      if (data?.signedUrl) { window.open(data.signedUrl, "_blank"); return; }
    }
    if (doc.document_url) window.open(doc.document_url, "_blank");
  };

  return (
    <div className="mt-2 pl-6 space-y-1">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-2 group">
          <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="font-mono text-[10px] text-muted-foreground flex-1 truncate">{doc.file_name}</span>
          <button onClick={() => handleOpen(doc)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all">
            <ExternalLink className="w-3 h-3" />
          </button>
          {canEdit && (
            <button
              onClick={() => deleteMut.mutate({ docId: doc.id, storagePath: doc.storage_path }, { onSuccess: () => toast.success("File removed") })}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <>
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploadMut.isPending}
            className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {uploadMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {uploadMut.isPending ? "Uploading…" : docs.length > 0 ? "Add file" : "Attach file"}
          </button>
        </>
      )}
    </div>
  );
}

export function ProjectDeliverablesPanel({ projectId }: { projectId: string }) {
  const { currentOrg } = useOrg();
  const { canManage } = useOrgRole();
  const { data: deliverables = [], isLoading } = useProjectDeliverablesList(projectId);
  const { data: flightDeliverables = [] } = useProjectFlightDeliverables(projectId);
  const createMut = useCreateProjectDeliverable();
  const updateMut = useUpdateProjectDeliverable();
  const deleteMut = useDeleteProjectDeliverable();
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState(DELIVERABLE_TYPES[0].value as string);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const handleAdd = () => {
    if (!currentOrg) return;
    createMut.mutate(
      {
        project_id: projectId,
        organization_id: currentOrg.id,
        deliverable_type: newType,
        label: newLabel || undefined,
        description: newDesc || undefined,
        status: "expected",
      },
      {
        onSuccess: () => { setAdding(false); setNewLabel(""); setNewDesc(""); toast.success("Deliverable added"); },
        onError: () => toast.error("Failed to add deliverable"),
      }
    );
  };

  const handleStatusChange = (id: string, status: string) => {
    updateMut.mutate({ id, status }, { onError: () => toast.error("Update failed") });
  };

  // Summary stats
  const total = deliverables.length;
  const completed = deliverables.filter((d: any) => d.status === "completed").length;
  const captured = deliverables.filter((d: any) => d.status === "captured").length;
  const inProcessing = deliverables.filter((d: any) => d.status === "in_processing").length;
  const missing = deliverables.filter((d: any) => d.status === "not_captured").length;
  const expected = deliverables.filter((d: any) => d.status === "expected").length;
  const partial = deliverables.filter((d: any) => d.status === "partial").length;
  const completionPct = total > 0 ? Math.round(((completed + captured) / total) * 100) : 0;

  // Flight-level capture summary
  const flightCaptured = (flightDeliverables as any[]).filter((d: any) => d.status === "captured").length;
  const flightTotal = (flightDeliverables as any[]).length;

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <p className="section-title mb-0">Deliverables</p>
          {total > 0 && (
            <span className={`font-mono text-[10px] px-1.5 py-0.5 ${completionPct === 100 ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
              {completionPct}% complete
            </span>
          )}
        </div>
        {canManage && !adding && (
          <button onClick={() => setAdding(true)} className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Expected
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="px-6 py-3 border-b border-border bg-secondary/20">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full font-mono text-xs bg-background border border-input px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring">
                {DELIVERABLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Label</label>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Final site survey" className="w-full font-mono text-xs bg-background border border-input px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Description</label>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional details" className="w-full font-mono text-xs bg-background border border-input px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
            </div>
            <button onClick={handleAdd} disabled={createMut.isPending} className="font-mono text-[10px] px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Add</button>
            <button onClick={() => setAdding(false)} className="font-mono text-[10px] px-3 py-1.5 text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Summary stats */}
      {total > 0 && (
        <div className="grid grid-cols-6 divide-x divide-border border-b border-border">
          <StatusCell icon={CircleCheck} count={completed} label="Completed" color="text-success" />
          <StatusCell icon={CheckCircle2} count={captured} label="Captured" color="text-primary" />
          <StatusCell icon={Loader2} count={inProcessing} label="Processing" color="text-primary" />
          <StatusCell icon={AlertTriangle} count={partial} label="Partial" color="text-warning" />
          <StatusCell icon={XCircle} count={missing} label="Missing" color="text-destructive" />
          <StatusCell icon={Clock} count={expected} label="Pending" color="text-muted-foreground" />
        </div>
      )}

      {/* Project deliverables list */}
      {isLoading ? (
        <div className="p-6 flex justify-center"><div className="w-2 h-2 bg-primary animate-pulse-glow" /></div>
      ) : total === 0 && flightTotal === 0 ? (
        <div className="p-6 text-center">
          <p className="font-mono text-xs text-muted-foreground">No deliverables defined for this project.</p>
        </div>
      ) : (
        <>
          {total > 0 && (
            <div className="divide-y divide-border">
              {deliverables.map((d: any) => {
                const typeLabel = DELIVERABLE_TYPES.find((t) => t.value === d.deliverable_type)?.label || d.deliverable_type;
                const statusCfg = PROJECT_DELIVERABLE_STATUSES.find((s) => s.value === d.status) || PROJECT_DELIVERABLE_STATUSES[0];
                const Icon = STATUS_ICON[d.status] || Clock;
                return (
                  <div key={d.id} className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${statusCfg.color.split(" ")[0]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-foreground">{d.label || typeLabel}</p>
                        {d.label && <p className="font-mono text-[10px] text-muted-foreground">{typeLabel}</p>}
                        {d.description && <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{d.description}</p>}
                      </div>
                      <button
                        onClick={() => setExpandedFiles((prev) => {
                          const next = new Set(prev);
                          next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                          return next;
                        })}
                        className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors px-1"
                        title="Files"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                      {canManage ? (
                        <select
                          value={d.status}
                          onChange={(e) => handleStatusChange(d.id, e.target.value)}
                          className={`font-mono text-[10px] px-2 py-1 border-0 bg-transparent ${statusCfg.color.split(" ")[0]} focus:outline-none cursor-pointer`}
                        >
                          {PROJECT_DELIVERABLE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      ) : (
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 ${statusCfg.color}`}>{statusCfg.label}</span>
                      )}
                      {canManage && (
                        <button
                          onClick={() => deleteMut.mutate(d.id, { onSuccess: () => toast.success("Removed") })}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {expandedFiles.has(d.id) && currentOrg && (
                      <DeliverableFiles
                        deliverableId={d.id}
                        orgId={currentOrg.id}
                        projectId={projectId}
                        canEdit={canManage}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Flight-level capture summary */}
          {flightTotal > 0 && (
            <div className="px-6 py-4 border-t border-border">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Flight Log Captures</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-secondary overflow-hidden">
                  <div
                    className={`h-full transition-all ${flightCaptured === flightTotal ? "bg-success" : flightCaptured > 0 ? "bg-primary" : "bg-muted-foreground/30"}`}
                    style={{ width: `${flightTotal > 0 ? Math.round((flightCaptured / flightTotal) * 100) : 0}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{flightCaptured}/{flightTotal} captured</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusCell({ icon: Icon, count, label, color }: { icon: typeof CheckCircle2; count: number; label: string; color: string }) {
  return (
    <div className="p-3 text-center">
      <div className="flex items-center justify-center gap-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <p className={`font-mono text-lg ${color}`}>{count}</p>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
