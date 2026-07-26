import { useState } from "react";
import { Plus, X, AlertTriangle, CheckCircle2, Clock, XCircle, Search, ChevronDown, ChevronUp, Save } from "lucide-react";
import { format } from "date-fns";
import { usePostflightIssues, useCreatePostflightIssue, useUpdatePostflightIssue } from "@/hooks/usePostflightIssues";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SEVERITY_CONFIG = {
  critical: { label: "Critical", color: "text-destructive bg-destructive/10", icon: XCircle },
  high: { label: "High", color: "text-warning bg-warning/10", icon: AlertTriangle },
  medium: { label: "Medium", color: "text-primary bg-primary/10", icon: Clock },
  low: { label: "Low", color: "text-muted-foreground bg-muted", icon: CheckCircle2 },
} as const;

const STATUS_CONFIG = {
  open: { label: "Open", color: "text-destructive bg-destructive/10" },
  investigating: { label: "Under Review", color: "text-warning bg-warning/10" },
  resolved: { label: "Resolved", color: "text-success bg-success/10" },
  wont_fix: { label: "Won't Fix", color: "text-muted-foreground bg-muted" },
} as const;

const CATEGORIES = ["weather", "equipment", "battery", "operator", "airspace", "payload", "data_quality", "other"];

interface PostflightDebriefProps {
  flightLogId: string;
  missionId?: string | null;
  droneModelId?: string | null;
  pilotId?: string | null;
  canEdit: boolean;
}

export function PostflightDebrief({ flightLogId, missionId, droneModelId, pilotId, canEdit }: PostflightDebriefProps) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const { data: issues = [], isLoading } = usePostflightIssues(flightLogId);
  const createIssue = useCreatePostflightIssue();
  const updateIssue = useUpdatePostflightIssue();

  const [showForm, setShowForm] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "medium" as keyof typeof SEVERITY_CONFIG,
    category: "general",
  });

  const openIssues = (issues as any[]).filter(i => i.resolution_status === "open" || i.resolution_status === "investigating");
  const resolvedIssues = (issues as any[]).filter(i => i.resolution_status === "resolved" || i.resolution_status === "wont_fix");

  async function handleCreate() {
    if (!form.title.trim()) {
      toast.error("Issue title is required");
      return;
    }
    try {
      await createIssue.mutateAsync({
        organization_id: currentOrg!.id,
        flight_log_id: flightLogId,
        mission_id: missionId || null,
        drone_model_id: droneModelId || null,
        pilot_id: pilotId || null,
        reported_by: user!.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        severity: form.severity,
        category: form.category,
      });
      toast.success("Issue reported");
      setForm({ title: "", description: "", severity: "medium", category: "general" });
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleStatusChange(issueId: string, newStatus: string) {
    try {
      const updates: Record<string, any> = { id: issueId, resolution_status: newStatus };
      if (newStatus === "resolved" || newStatus === "wont_fix") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user!.id;
      }
      await updateIssue.mutateAsync(updates);
      toast.success("Issue updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleResolve(issueId: string) {
    try {
      await updateIssue.mutateAsync({
        id: issueId,
        resolution_status: "resolved",
        resolution_notes: resolveNotes.trim() || null,
        resolved_at: new Date().toISOString(),
        resolved_by: user!.id,
      });
      toast.success("Issue resolved");
      setResolvingId(null);
      setResolveNotes("");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const inputCls = "w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary";

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <p className="section-title mb-0">Postflight Debrief</p>
          {openIssues.length > 0 && (
            <span className="font-mono text-[10px] text-destructive bg-destructive/10 px-2 py-0.5">
              {openIssues.length} open
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-7 px-3 bg-primary text-primary-foreground font-mono text-[10px] tracking-wide flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showForm ? "Cancel" : "Report Issue"}
          </button>
        )}
      </div>

      {/* New issue form */}
      {showForm && (
        <div className="p-6 border-b border-border bg-secondary/20">
          <div className="space-y-3">
            <div>
              <label className="stat-label block mb-1">Issue Title *</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className={inputCls}
                placeholder="Brief description of the issue"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="stat-label block mb-1">Severity</label>
                <select
                  value={form.severity}
                  onChange={e => setForm({ ...form, severity: e.target.value as any })}
                  className={inputCls}
                >
                  {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="stat-label block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Detailed description, steps to reproduce, affected components..."
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={createIssue.isPending}
              className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {createIssue.isPending ? "Saving..." : "Submit Issue"}
            </button>
          </div>
        </div>
      )}

      {/* Issues list */}
      {isLoading ? (
        <div className="p-6 text-center">
          <div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" />
        </div>
      ) : (issues as any[]).length === 0 ? (
        <div className="p-6 text-center">
          <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="font-mono text-xs text-muted-foreground">No issues reported — clean flight</p>
        </div>
      ) : (
        <div>
          {/* Open issues */}
          {openIssues.length > 0 && (
            <div>
              <div className="px-6 py-2 bg-secondary/30 border-b border-border">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Open Issues ({openIssues.length})
                </p>
              </div>
              <div className="divide-y divide-border">
                {openIssues.map((issue: any) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    expanded={expandedIssue === issue.id}
                    onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                    canEdit={canEdit}
                    resolving={resolvingId === issue.id}
                    resolveNotes={resolveNotes}
                    onResolveNotesChange={setResolveNotes}
                    onStartResolve={() => { setResolvingId(issue.id); setResolveNotes(""); }}
                    onCancelResolve={() => setResolvingId(null)}
                    onResolve={() => handleResolve(issue.id)}
                    onStatusChange={(s) => handleStatusChange(issue.id, s)}
                    isPending={updateIssue.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resolved issues */}
          {resolvedIssues.length > 0 && (
            <div>
              <div className="px-6 py-2 bg-secondary/30 border-b border-border">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Resolved ({resolvedIssues.length})
                </p>
              </div>
              <div className="divide-y divide-border">
                {resolvedIssues.map((issue: any) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    expanded={expandedIssue === issue.id}
                    onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                    canEdit={canEdit}
                    resolving={false}
                    resolveNotes=""
                    onResolveNotesChange={() => {}}
                    onStartResolve={() => {}}
                    onCancelResolve={() => {}}
                    onResolve={() => {}}
                    onStatusChange={(s) => handleStatusChange(issue.id, s)}
                    isPending={updateIssue.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  expanded,
  onToggle,
  canEdit,
  resolving,
  resolveNotes,
  onResolveNotesChange,
  onStartResolve,
  onCancelResolve,
  onResolve,
  onStatusChange,
  isPending,
}: {
  issue: any;
  expanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
  resolving: boolean;
  resolveNotes: string;
  onResolveNotesChange: (v: string) => void;
  onStartResolve: () => void;
  onCancelResolve: () => void;
  onResolve: () => void;
  onStatusChange: (s: string) => void;
  isPending: boolean;
}) {
  const sevCfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
  const SevIcon = sevCfg.icon;
  const statusCfg = STATUS_CONFIG[issue.resolution_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
  const isResolved = issue.resolution_status === "resolved" || issue.resolution_status === "wont_fix";

  return (
    <div className={`${isResolved ? "opacity-60" : ""}`}>
      <div className="px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/20 transition-colors" onClick={onToggle}>
        <SevIcon className={`w-3.5 h-3.5 shrink-0 ${sevCfg.color.split(" ")[0]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-foreground truncate">{issue.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`font-mono text-[10px] px-1.5 py-0.5 ${sevCfg.color}`}>{sevCfg.label}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{issue.category.replace("_", " ")}</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.5 ${statusCfg.color}`}>{statusCfg.label}</span>
          </div>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
          {format(new Date(issue.created_at), "MMM d")}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="px-6 pb-4 space-y-3">
          {issue.description && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{issue.description}</p>
            </div>
          )}

          <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground flex-wrap">
            {issue.profiles_reported?.full_name && (
              <span>Reported by: <span className="text-foreground">{issue.profiles_reported.full_name}</span></span>
            )}
            {issue.profiles_pilot?.full_name && (
              <span>Pilot: <span className="text-foreground">{issue.profiles_pilot.full_name}</span></span>
            )}
            {issue.drone_models?.name && (
              <span>Drone: <span className="text-foreground">{issue.drone_models.drone_manufacturers?.name} {issue.drone_models.name}</span></span>
            )}
            {issue.missions?.title && (
              <span>Mission: <span className="text-foreground">{issue.missions.title}</span></span>
            )}
          </div>

          {issue.resolution_notes && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Resolution Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{issue.resolution_notes}</p>
              {issue.profiles_resolved?.full_name && (
                <p className="font-mono text-[10px] text-muted-foreground mt-1">
                  Resolved by {issue.profiles_resolved.full_name} on {format(new Date(issue.resolved_at), "MMM d, yyyy")}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {canEdit && !isResolved && (
            <div className="pt-2 border-t border-border">
              {resolving ? (
                <div className="space-y-2">
                  <textarea
                    value={resolveNotes}
                    onChange={e => onResolveNotesChange(e.target.value)}
                    placeholder="Resolution notes (optional)..."
                    className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={onResolve}
                      disabled={isPending}
                      className="h-7 px-3 bg-success text-success-foreground font-mono text-[10px] hover:opacity-80 disabled:opacity-50 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Mark Resolved
                    </button>
                    <button onClick={onCancelResolve} className="h-7 px-3 border border-border text-muted-foreground font-mono text-[10px] hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={onStartResolve}
                    className="h-7 px-3 bg-success text-success-foreground font-mono text-[10px] hover:opacity-80 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Resolve
                  </button>
                  {issue.resolution_status === "open" && (
                    <button
                      onClick={() => onStatusChange("investigating")}
                      disabled={isPending}
                      className="h-7 px-3 border border-warning text-warning font-mono text-[10px] hover:bg-warning/10 disabled:opacity-50"
                    >
                      Investigating
                    </button>
                  )}
                  <button
                    onClick={() => onStatusChange("wont_fix")}
                    disabled={isPending}
                    className="h-7 px-3 border border-border text-muted-foreground font-mono text-[10px] hover:text-foreground disabled:opacity-50"
                  >
                    Won't Fix
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
