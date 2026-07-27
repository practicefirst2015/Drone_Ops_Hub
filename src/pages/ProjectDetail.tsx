import { useParams, Link, useNavigate } from "react-router-dom";

import { useState, useRef } from "react";
import { ArrowLeft, Plus, X, Trash2, MapPin, Calendar, Users, FileText, Upload, MessageSquare, Edit2, Check, ExternalLink, TrendingUp, Activity, CheckCircle2, AlertTriangle, XCircle, Crosshair } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProject,
  useProjectTasks,
  useProjectMembers,
  useProjectDrones,
  useProjectSkills,
  useProjectInvoices,
  useProjectNotes,
  
  useOrgMembers,
  useOrgDrones,
  useOrgSkills,
  useProjects,
} from "@/hooks/useProjectData";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTaskBoard } from "@/components/projects/ProjectTaskBoard";
import { CreateTaskDialog } from "@/components/projects/CreateTaskDialog";
import { SkillGapAnalysis } from "@/components/projects/SkillGapAnalysis";
import { DroneRecommendations } from "@/components/projects/DroneRecommendations";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useProjectReadiness } from "@/hooks/useProjectReadiness";
import { useMissions } from "@/hooks/useMissionData";
import { useMissionReadiness } from "@/hooks/useMissionReadiness";
import { MissionReadinessPanel } from "@/components/missions/MissionReadinessPanel";
import { WeatherPanel } from "@/components/missions/WeatherPanel";
import { PreflightChecklist } from "@/components/missions/PreflightChecklist";
import { ProjectAlertsCard } from "@/components/projects/ProjectAlertsCard";
import { ProjectFlightHistory } from "@/components/projects/ProjectFlightHistory";
import { ProjectDeliverablesPanel } from "@/components/projects/ProjectDeliverablesPanel";
import { IntelligenceBanner } from "@/components/intelligence/IntelligenceWidget";
import { useProjectIntelligence } from "@/hooks/useMissionIntelligence";
import { IngestionBrowser } from "@/components/ingestion/IngestionBrowser";
import { InspectionBanner } from "@/components/inspection/InspectionIntelligencePanel";
import { useProjectInspectionIntelligence } from "@/hooks/useInspectionIntelligence";
import { AddressSearch, shortPlaceName } from "@/components/map/AddressSearch";

const ALL_TABS = [
  { key: "overview", label: "Overview", viewerVisible: true },
  { key: "tasks", label: "Tasks", viewerVisible: false },
  { key: "deliverables", label: "Deliverables", viewerVisible: true },
  { key: "ingestion", label: "Ingestion", viewerVisible: false },
  { key: "team", label: "Team", viewerVisible: false },
  { key: "drones", label: "Drones", viewerVisible: false },
  { key: "skills", label: "Skills", viewerVisible: false },
  { key: "readiness", label: "Readiness", viewerVisible: false },
  { key: "invoices", label: "Invoices", viewerVisible: true },
  { key: "documents", label: "Documents", viewerVisible: true },
  { key: "notes", label: "Notes", viewerVisible: false },
  { key: "settings", label: "Settings", viewerVisible: false },
];

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "text-primary bg-primary/10";
    case "pending": case "draft": return "text-warning bg-warning/10";
    case "complete": return "text-success bg-success/10";
    case "archived": return "text-muted-foreground bg-muted";
    default: return "text-muted-foreground";
  }
};

const priorityBadge = (p: string) => {
  switch (p) {
    case "critical": return "text-destructive bg-destructive/10";
    case "high": return "text-warning bg-warning/10";
    case "medium": return "text-primary bg-primary/10";
    case "low": return "text-muted-foreground bg-muted";
    default: return "text-muted-foreground bg-muted";
  }
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const { canManage, canContribute, isAdmin, isViewer } = useOrgRole();
  const { data: project, isLoading } = useProject(id);
  const readiness = useProjectReadiness(id, project);
  const [activeTab, setActiveTab] = useState("overview");
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const TABS = isViewer ? ALL_TABS.filter((t) => t.viewerVisible) : ALL_TABS;

  const readinessStatusConfig = {
    ready: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Ready" },
    needs_review: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Review" },
    blocked: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Blocked" },
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="font-mono text-sm text-muted-foreground">Project not found.</p>
        <Link to="/projects" className="font-mono text-xs text-primary mt-2 inline-block">← Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-3 h-3" />
          Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title mb-1">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Link
                to={`/projects/${id}/report`}
                className="h-8 px-3 border border-border text-muted-foreground hover:text-foreground hover:border-foreground font-mono text-xs flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Client Report
              </Link>
            )}
            {!readiness.loading && !isViewer && (
              (() => {
                const rCfg = readinessStatusConfig[readiness.overall];
                const RIcon = rCfg.icon;
                return (
                  <span className={`font-mono text-xs px-2 py-1 flex items-center gap-1 ${rCfg.color} ${rCfg.bg}`}>
                    <RIcon className="w-3 h-3" />
                    {readiness.score}%
                  </span>
                );
              })()
            )}
            {!isViewer && (
              <span className={`font-mono text-xs px-2 py-1 ${priorityBadge(project.priority)}`}>
                {project.priority}
              </span>
            )}
            <span className={`font-mono text-xs px-2 py-1 ${statusColor(project.status)}`}>
              {project.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-3 font-mono text-xs text-muted-foreground flex-wrap">
          {project.clients && (
            <Link to={`/clients/${(project.clients as any).id}`} className="hover:text-primary transition-colors flex items-center gap-1">
              <Users className="w-3 h-3" />
              {(project.clients as any).name}
            </Link>
          )}
          {project.location_name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {project.location_name}
            </span>
          )}
          {project.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Start: {project.start_date}</span>}
          {project.end_date && <span>End: {project.end_date}</span>}
          <span>Progress: {project.progress}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6 flex items-center gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 font-mono text-xs tracking-wide transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab project={project} projectId={id!} onTabChange={setActiveTab} isViewer={isViewer} />}

      {activeTab === "tasks" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="section-title mb-0">Task Board</p>
            {canContribute && (
              <button
                onClick={() => setCreateTaskOpen(true)}
                className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3 h-3" />
                Add Task
              </button>
            )}
          </div>
          <ProjectTaskBoard projectId={id!} />
          <CreateTaskDialog
            open={createTaskOpen}
            onOpenChange={setCreateTaskOpen}
            projectId={id!}
            organizationId={currentOrg!.id}
          />
        </div>
      )}

      {activeTab === "deliverables" && <ProjectDeliverablesPanel projectId={id!} />}
      {activeTab === "ingestion" && <IngestionBrowser projectId={id!} />}
      {activeTab === "team" && <MembersTab projectId={id!} canManage={canManage} />}
      {activeTab === "drones" && <DronesTab projectId={id!} canManage={canManage} />}
      {activeTab === "skills" && <SkillsTab projectId={id!} canManage={canManage} />}
      {activeTab === "readiness" && (
        <div className="space-y-6">
          <ReadinessSummaryCard projectId={id!} project={project} />
          <MissionReadinessSection projectId={id!} />
          <SkillGapAnalysis projectId={id!} />
        </div>
      )}
      {activeTab === "invoices" && <InvoicesTab projectId={id!} canManage={canManage} />}
      {activeTab === "documents" && <DocumentsTab projectId={id!} canContribute={canContribute} userId={user?.id} />}
      {activeTab === "notes" && <NotesTab projectId={id!} canContribute={canContribute} userId={user?.id} />}
      {activeTab === "settings" && canManage ? <SettingsTab project={project} isAdmin={isAdmin} /> : activeTab === "settings" && (
        <div className="surface border border-border p-8 text-center font-mono text-sm text-muted-foreground">
          You don't have permission to modify project settings.
        </div>
      )}
    </div>
  );
};

/* ─── OVERVIEW TAB ─── */
function OverviewTab({ project, projectId, onTabChange, isViewer }: { project: any; projectId: string; onTabChange: (tab: string) => void; isViewer: boolean }) {
  const { tasks } = useProjectTasks(projectId);
  const { members } = useProjectMembers(projectId);
  const { drones } = useProjectDrones(projectId);
  const { skills } = useProjectSkills(projectId);
  const { data: invoices = [] } = useProjectInvoices(projectId);
  const { notes } = useProjectNotes(projectId);
  const projectIntel = useProjectIntelligence(projectId);
  const inspectionIntel = useProjectInspectionIntelligence(projectId);

  const allTasks = tasks.data || [];
  const tasksByStatus = {
    todo: allTasks.filter((t: any) => t.status === "todo").length,
    in_progress: allTasks.filter((t: any) => t.status === "in_progress").length,
    in_review: allTasks.filter((t: any) => t.status === "in_review").length,
    done: allTasks.filter((t: any) => t.status === "done").length,
  };
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Intelligence Banner */}
      {!isViewer && <IntelligenceBanner insights={projectIntel.insights} loading={projectIntel.loading} />}
      {/* Inspection Intelligence Banner */}
      {!isViewer && inspectionIntel.data && !inspectionIntel.data.insufficientData && (
        <InspectionBanner {...inspectionIntel.data} />
      )}
      {/* Stats row */}
      <div className={`grid grid-cols-2 ${isViewer ? "md:grid-cols-3" : "md:grid-cols-5"} gap-4`}>
        {!isViewer && <StatBox label="Tasks" value={allTasks.length} sub={`${tasksByStatus.done} done`} />}
        {!isViewer && <StatBox label="Team" value={(members.data || []).length} sub="members" />}
        {!isViewer && <StatBox label="Drones" value={(drones.data || []).length} sub="assigned" />}
        <StatBox label="Progress" value={`${project.progress}%`} sub="overall" />
        <StatBox label="Budget" value={project.budget ? `$${Number(project.budget).toLocaleString()}` : "—"} sub="quoted" />
        <StatBox label="Invoiced" value={`$${totalInvoiced.toLocaleString()}`} sub={`${invoices.length} invoices`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: project info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Dates */}
          <div className="surface border border-border p-6">
            <p className="section-title mb-4">Project Details</p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              {!isViewer && (
                <InfoRow label="Client" value={project.clients ? (
                  <Link to={`/clients/${(project.clients as any).id}`} className="text-primary hover:underline">
                    {(project.clients as any).name}
                  </Link>
                ) : "—"} />
              )}
              <InfoRow label="Status" value={<span className={`font-mono text-xs px-2 py-1 ${statusColor(project.status)}`}>{project.status}</span>} />
              {!isViewer && <InfoRow label="Priority" value={<span className={`font-mono text-xs px-2 py-1 ${priorityBadge(project.priority)}`}>{project.priority}</span>} />}
              <InfoRow label="Budget" value={project.budget ? `$${Number(project.budget).toLocaleString()}` : "—"} />
              <InfoRow label="Start Date" value={project.start_date || "—"} />
              <InfoRow label="End Date" value={project.end_date || "—"} />
              <InfoRow label="Progress" value={
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-border">
                    <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
                  </div>
                  <span className="font-mono text-xs">{project.progress}%</span>
                </div>
              } />
            </div>
          </div>

          {/* Location - hide coordinates/flight params for viewers */}
          <div className="surface border border-border p-6">
            <p className="section-title mb-4">Location</p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <InfoRow label="Location" value={project.location_name || "—"} />
              {!isViewer && (
                <>
                  <InfoRow label="Coordinates" value={
                    project.latitude && project.longitude
                      ? `${Number(project.latitude).toFixed(6)}, ${Number(project.longitude).toFixed(6)}`
                      : "Not set"
                  } />
                  <InfoRow label="Flight Radius" value={project.flight_radius_m ? `${project.flight_radius_m}m` : "—"} />
                  <InfoRow label="Flight Altitude" value={project.flight_altitude_m ? `${project.flight_altitude_m}m` : "—"} />
                </>
              )}
            </div>
            {!isViewer && project.latitude && project.longitude && (
              <Link to="/map" className="inline-flex items-center gap-1 mt-4 font-mono text-xs text-primary hover:underline">
                <MapPin className="w-3 h-3" />
                View on Map
              </Link>
            )}
          </div>

          {/* Task summary - internal only */}
          {!isViewer && (
            <div className="surface border border-border p-6">
              <p className="section-title mb-4">Task Summary</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "To Do", count: tasksByStatus.todo, color: "bg-muted-foreground" },
                  { label: "In Progress", count: tasksByStatus.in_progress, color: "bg-warning" },
                  { label: "In Review", count: tasksByStatus.in_review, color: "bg-primary" },
                  { label: "Done", count: tasksByStatus.done, color: "bg-success" },
                ].map((col) => (
                  <div key={col.label} className="text-center">
                    <div className={`w-2 h-2 ${col.color} mx-auto mb-2`} />
                    <p className="font-mono text-lg text-foreground">{col.count}</p>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{col.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flight History - hide internal details for viewers */}
          {!isViewer && <ProjectFlightHistory projectId={projectId} />}

          {/* Deliverables - visible to all */}
          <ProjectDeliverablesPanel projectId={projectId} />
        </div>

        {/* Right sidebar: quick lists */}
        <div className="space-y-6">
          {/* Alerts for this project - internal only */}
          {!isViewer && (
            <ProjectAlertsCard
              memberIds={(members.data || []).map((m: any) => m.user_id)}
              droneIds={(drones.data || []).map((d: any) => d.drone_id)}
            />
          )}
          {/* Readiness Summary - internal only */}
          {!isViewer && <ReadinessSummaryCard projectId={projectId} project={project} />}
          {/* Required Skills - internal only */}
          {!isViewer && (
            <div className="surface border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Required Skills</p>
                <button onClick={() => onTabChange("skills")} className="font-mono text-[10px] text-primary hover:underline">Manage</button>
              </div>
              {(skills.data || []).length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">None defined — <button onClick={() => onTabChange("skills")} className="text-primary hover:underline">add skills</button></p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(skills.data || []).map((s: any) => (
                    <span key={s.id} className="border border-border px-2 py-1 font-mono text-[10px] text-foreground">{s.skills?.name}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assigned Drones - internal only */}
          {!isViewer && (
            <div className="surface border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Assigned Drones</p>
                <button onClick={() => onTabChange("drones")} className="font-mono text-[10px] text-primary hover:underline">Manage</button>
              </div>
              {(drones.data || []).length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">None assigned — <button onClick={() => onTabChange("drones")} className="text-primary hover:underline">assign drones</button></p>
              ) : (
                <div className="space-y-2">
                  {(drones.data || []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between">
                      <span className="font-mono text-xs text-foreground">{d.drones?.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{d.drones?.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Notes - internal only */}
          {!isViewer && (
            <div className="surface border border-border p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Recent Notes</p>
              {(notes.data || []).length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {(notes.data || []).slice(0, 3).map((n: any) => (
                    <div key={n.id}>
                      <p className="text-xs text-foreground line-clamp-2">{n.content}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {n.profiles?.full_name} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Log - internal only */}
          {!isViewer && (
            <div className="surface border border-border">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Activity Log</p>
              </div>
              <ActivityFeed entityType="project" entityId={projectId} limit={8} showEntity={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="surface border border-border p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="font-mono text-xl text-foreground">{value}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function ReadinessSummaryCard({ projectId, project }: { projectId: string; project: any }) {
  const readiness = useProjectReadiness(projectId, project);

  const statusConfig = {
    ready: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    needs_review: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    blocked: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  };

  if (readiness.loading) return null;

  return (
    <div className="surface border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Readiness</p>
        <span className={`font-mono text-sm font-medium ${statusConfig[readiness.overall].color}`}>{readiness.score}%</span>
      </div>
      <div className="space-y-2">
        {readiness.dimensions.map((d) => {
          const cfg = statusConfig[d.status];
          const Icon = cfg.icon;
          return (
            <div key={d.key} className="flex items-center gap-2">
              <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.color}`} />
              <span className="font-mono text-xs text-foreground flex-1">{d.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">{d.detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MissionReadinessSection({ projectId }: { projectId: string }) {
  const { data: missions = [] } = useMissions(projectId);

  if (missions.length === 0) {
    return (
      <div className="surface border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair className="w-4 h-4 text-muted-foreground" />
          <p className="section-title mb-0">Mission Readiness</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">No missions linked to this project.</p>
      </div>
    );
  }

  return (
    <div className="surface border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Crosshair className="w-4 h-4 text-primary" />
        <p className="section-title mb-0">Mission Readiness</p>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{missions.length} mission{missions.length > 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-4">
        {missions.map((m: any) => (
          <MissionReadinessRow key={m.id} mission={m} />
        ))}
      </div>
    </div>
  );
}

function MissionReadinessRow({ mission }: { mission: any }) {
  const readiness = useMissionReadiness(mission.id, mission);
  const [showChecklist, setShowChecklist] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-xs font-medium text-foreground">{mission.title}</p>
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="font-mono text-[10px] text-primary hover:underline"
        >
          {showChecklist ? "Hide Checklist" : "Preflight Checklist"}
        </button>
      </div>
      <MissionReadinessPanel readiness={readiness} title="" />
      <div className="mt-2">
        <WeatherPanel
          lat={mission.location_lat ?? mission.latitude ?? null}
          lon={mission.location_lon ?? mission.longitude ?? null}
          locationName={mission.location_name}
        />
      </div>
      {showChecklist && (
        <div className="mt-2">
          <PreflightChecklist missionId={mission.id} mission={mission} />
        </div>
      )}
    </div>
  );
}

/* ─── NOTES TAB ─── */
function NotesTab({ projectId, canContribute, userId }: { projectId: string; canContribute: boolean; userId?: string }) {
  const { notes, addNote, deleteNote } = useProjectNotes(projectId);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!content.trim() || !userId) return;
    setSubmitting(true);
    try {
      await addNote.mutateAsync({ project_id: projectId, user_id: userId, content: content.trim() });
      setContent("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl">
      <p className="section-title mb-4">Notes & Activity</p>

      {canContribute && (
        <div className="surface border border-border p-4 mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none mb-3"
            placeholder="Add a note or update..."
          />
          <button
            onClick={handleAdd}
            disabled={submitting || !content.trim()}
            className="h-8 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
          >
            <MessageSquare className="w-3 h-3" />
            {submitting ? "Adding..." : "Add Note"}
          </button>
        </div>
      )}

      <div className="space-y-0">
        {notes.isLoading ? (
          <div className="p-6 text-center"><div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" /></div>
        ) : (notes.data || []).length === 0 ? (
          <div className="surface border border-border p-8 text-center font-mono text-xs text-muted-foreground">
            No notes yet. Add the first note above.
          </div>
        ) : (
          <div className="border-l-2 border-border ml-3 space-y-0">
            {(notes.data || []).map((note: any) => (
              <div key={note.id} className="relative pl-6 pb-6 group">
                <div className="absolute left-[-5px] top-1 w-2 h-2 bg-primary" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">
                      {note.profiles?.full_name || "Unknown"} · {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {(note.user_id === userId || canContribute) && (
                    <button
                      onClick={() => deleteNote.mutate(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── DOCUMENTS TAB ─── */
function DocumentsTab({ projectId, canContribute, userId }: { projectId: string; canContribute: boolean; userId?: string }) {
  return (
    <DocumentManager
      entityType="project"
      entityId={projectId}
      canUpload={canContribute}
      userId={userId}
      canDelete={canContribute}
    />
  );
}

/* ─── MEMBERS TAB ─── */
function MembersTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { members, addMember, removeMember } = useProjectMembers(projectId);
  const orgMembers = useOrgMembers();
  const [adding, setAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");

  const currentMemberIds = (members.data || []).map((m: any) => m.user_id);
  const available = (orgMembers.data || []).filter((m: any) => !currentMemberIds.includes(m.user_id));

  const handleAdd = async () => {
    if (!selectedUser) return;
    await addMember.mutateAsync({ project_id: projectId, user_id: selectedUser });
    setSelectedUser("");
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">Assigned Team</p>
        {canManage && (
          <button onClick={() => setAdding(true)} className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <Plus className="w-3 h-3" />
            Add Member
          </button>
        )}
      </div>

      {adding && (
        <div className="surface border border-border p-4 mb-4 flex items-center gap-3">
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
            className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
            <option value="">Select member...</option>
            {available.map((m: any) => (
              <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || "Unnamed"} ({m.role})</option>
            ))}
          </select>
          <button onClick={handleAdd} className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-90">Add</button>
          <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="surface border border-border divide-y divide-border">
        {(members.data || []).length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-mono text-xs text-muted-foreground mb-2">No team members assigned yet.</p>
            {canManage && (
              <button onClick={() => setAdding(true)} className="font-mono text-xs text-primary hover:underline">+ Assign a team member</button>
            )}
          </div>
        ) : (
          (members.data || []).map((m: any) => (
            <div key={m.id} className="px-6 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">{m.profiles?.full_name || "Unnamed"}</p>
                <p className="font-mono text-xs text-muted-foreground">{m.role}</p>
              </div>
              {canManage && (
                <button onClick={() => removeMember.mutate(m.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── DRONES TAB ─── */
function DronesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { drones, assignDrone, removeDrone } = useProjectDrones(projectId);
  const orgDrones = useOrgDrones();
  const [adding, setAdding] = useState(false);
  const [selectedDrone, setSelectedDrone] = useState("");

  const assignedIds = (drones.data || []).map((d: any) => d.drone_id);
  const available = (orgDrones.data || []).filter((d: any) => !assignedIds.includes(d.id));

  const handleAdd = async () => {
    if (!selectedDrone) return;
    await assignDrone.mutateAsync({ project_id: projectId, drone_id: selectedDrone });
    setSelectedDrone("");
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">Assigned Drones</p>
        {canManage && (
          <button onClick={() => setAdding(true)} className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <Plus className="w-3 h-3" />
            Assign Drone
          </button>
        )}
      </div>

      {adding && (
        <div className="surface border border-border p-4 mb-4 flex items-center gap-3">
          <select value={selectedDrone} onChange={(e) => setSelectedDrone(e.target.value)}
            className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
            <option value="">Select drone...</option>
            {available.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name} — {d.model}</option>
            ))}
          </select>
          <button onClick={handleAdd} className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-90">Add</button>
          <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="surface border border-border divide-y divide-border">
        {(drones.data || []).length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-mono text-xs text-muted-foreground mb-2">No drones assigned yet.</p>
            {canManage && available.length > 0 && (
              <button onClick={() => setAdding(true)} className="font-mono text-xs text-primary hover:underline">+ Assign a drone</button>
            )}
            {canManage && available.length === 0 && (
              <Link to="/drones" className="font-mono text-xs text-primary hover:underline">Register drones in the fleet first →</Link>
            )}
          </div>
        ) : (
          (drones.data || []).map((d: any) => (
            <div key={d.id} className="px-6 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">{d.drones?.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{d.drones?.model} — {d.drones?.status}</p>
              </div>
              <div className="flex items-center gap-3">
                {d.drones?.battery_level != null && (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1 bg-border">
                      <div className={`h-full ${d.drones.battery_level > 50 ? "bg-success" : d.drones.battery_level > 20 ? "bg-warning" : "bg-destructive"}`}
                        style={{ width: `${d.drones.battery_level}%` }} />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{d.drones.battery_level}%</span>
                  </div>
                )}
                {canManage && (
                  <button onClick={() => removeDrone.mutate(d.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recommendations based on project requirements */}
      <DroneRecommendations projectId={projectId} />
    </div>
  );
}

/* ─── SKILLS TAB ─── */
function SkillsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { skills, addSkill, removeSkill } = useProjectSkills(projectId);
  const orgSkills = useOrgSkills();
  const [adding, setAdding] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");

  const assignedIds = (skills.data || []).map((s: any) => s.skill_id);
  const available = (orgSkills.data || []).filter((s: any) => !assignedIds.includes(s.id));

  const handleAdd = async () => {
    if (!selectedSkill) return;
    await addSkill.mutateAsync({ project_id: projectId, skill_id: selectedSkill });
    setSelectedSkill("");
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">Required Skills</p>
        {canManage && (
          <button onClick={() => setAdding(true)} className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <Plus className="w-3 h-3" />
            Add Skill
          </button>
        )}
      </div>

      {adding && (
        <div className="surface border border-border p-4 mb-4 flex items-center gap-3">
          <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}
            className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
            <option value="">Select skill...</option>
            {available.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button onClick={handleAdd} className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs hover:opacity-90">Add</button>
          <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(skills.data || []).length === 0 ? (
          <div className="surface border border-border p-6 w-full text-center">
            <p className="font-mono text-xs text-muted-foreground mb-2">No required skills defined yet.</p>
            {canManage && available.length > 0 && (
              <button onClick={() => setAdding(true)} className="font-mono text-xs text-primary hover:underline">+ Add a required skill</button>
            )}
            {canManage && available.length === 0 && (
              <Link to="/skills" className="font-mono text-xs text-primary hover:underline">Define skills in the taxonomy first →</Link>
            )}
          </div>
        ) : (
          (skills.data || []).map((s: any) => (
            <div key={s.id} className="flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-xs text-foreground">
              {s.skills?.name}
              {canManage && (
                <button onClick={() => removeSkill.mutate(s.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── INVOICES TAB ─── */
function InvoicesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data: invoices = [], isLoading } = useProjectInvoices(projectId);

  const invStatusColor = (s: string) => {
    switch (s) {
      case "paid": return "text-success bg-success/10";
      case "sent": return "text-primary bg-primary/10";
      case "overdue": return "text-destructive bg-destructive/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0">Linked Invoices</p>
        {canManage && (
          <Link
            to={`/invoices?project_id=${projectId}`}
            className="h-8 px-3 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3 h-3" />
            Create Invoice
          </Link>
        )}
      </div>
      <div className="surface border border-border">
        {isLoading ? (
          <div className="p-6 text-center"><div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" /></div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-mono text-xs text-muted-foreground mb-2">No invoices linked to this project.</p>
            {canManage && (
              <Link to={`/invoices?project_id=${projectId}`} className="font-mono text-xs text-primary hover:underline">+ Create the first invoice</Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left stat-label">Invoice</th>
                <th className="px-6 py-3 text-left stat-label">Amount</th>
                <th className="px-6 py-3 text-left stat-label">Status</th>
                <th className="px-6 py-3 text-left stat-label">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-secondary/50">
                  <td className="px-6 py-3">
                    <Link to={`/invoices/${inv.id}`} className="font-mono text-xs text-primary hover:underline">{inv.invoice_number}</Link>
                  </td>
                  <td className="px-6 py-3 font-mono text-sm text-foreground">${Number(inv.amount).toLocaleString()}</td>
                  <td className="px-6 py-3"><span className={`font-mono text-xs px-2 py-1 ${invStatusColor(inv.status)}`}>{inv.status}</span></td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{inv.due_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── SETTINGS TAB ─── */
function SettingsTab({ project, isAdmin }: { project: any; isAdmin: boolean }) {
  const { updateProject, deleteProject } = useProjects();
  const navigate = useNavigate();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [progress, setProgress] = useState(project.progress);
  const [status, setStatus] = useState(project.status);
  const [priority, setPriority] = useState(project.priority || "medium");
  const [budget, setBudget] = useState(project.budget?.toString() || "");
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [endDate, setEndDate] = useState(project.end_date || "");
  const [locationName, setLocationName] = useState(project.location_name || "");
  const [latitude, setLatitude] = useState(project.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(project.longitude?.toString() || "");
  const [flightRadius, setFlightRadius] = useState(project.flight_radius_m?.toString() || "500");
  const [flightAltitude, setFlightAltitude] = useState(project.flight_altitude_m?.toString() || "120");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Project name is required"); return; }
    setSaving(true);
    try {
      await updateProject.mutateAsync({
        id: project.id, name: name.trim(), description: description.trim() || null, progress, status, priority,
        budget: budget ? parseFloat(budget) : null,
        start_date: startDate || null, end_date: endDate || null,
        location_name: locationName.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        flight_radius_m: flightRadius ? parseFloat(flightRadius) : null,
        flight_altitude_m: flightAltitude ? parseFloat(flightAltitude) : null,
      });
      toast.success("Project updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    confirm({
      title: "Delete Project",
      description: `Permanently delete "${project.name}"? All tasks, notes, documents, and assignments will be removed. This cannot be undone.`,
      confirmLabel: "Delete Project",
      variant: "destructive",
      onConfirm: async () => {
        await deleteProject.mutateAsync(project.id);
        navigate("/projects");
        toast.success("Project deleted");
      },
    });
  };

  const inputClass = "w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary";

  return (
    <div className="max-w-2xl">
      <p className="section-title mb-4">Project Settings</p>
      <div className="space-y-4">
        <div>
          <label className="stat-label block mb-2">Project Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="stat-label block mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="stat-label block mb-2">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="complete">Complete</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="stat-label block mb-2">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="stat-label block mb-2">Budget ($)</label>
            <input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" className={inputClass} />
          </div>
          <div>
            <label className="stat-label block mb-2">Progress ({progress}%)</label>
            <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-[hsl(var(--primary))]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="stat-label block mb-2">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="stat-label block mb-2">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <p className="section-title mb-2 pt-4">Location & Flight Parameters</p>
        <div>
          <label className="stat-label block mb-2">Location Name</label>
          <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g. Riverside Solar Farm" className={inputClass} />
        </div>
        <AddressSearch
          onSelect={(r) => {
            setLatitude(r.lat.toFixed(6));
            setLongitude(r.lon.toFixed(6));
            if (!locationName.trim()) setLocationName(shortPlaceName(r.displayName));
          }}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="stat-label block mb-2">Latitude</label>
            <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="33.9534" className={inputClass} />
          </div>
          <div>
            <label className="stat-label block mb-2">Longitude</label>
            <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-117.3962" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="stat-label block mb-2">Flight Radius (m)</label>
            <input type="number" value={flightRadius} onChange={(e) => setFlightRadius(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="stat-label block mb-2">Flight Altitude (m)</label>
            <input type="number" value={flightAltitude} onChange={(e) => setFlightAltitude(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button onClick={handleSave} disabled={saving}
            className="h-10 px-6 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {isAdmin && (
            <button onClick={handleDelete}
              className="h-10 px-6 border border-destructive text-destructive font-mono text-sm tracking-wide hover:bg-destructive/10 transition-colors">
              Delete Project
            </button>
          )}
        </div>
      </div>
      <ConfirmationDialog />
    </div>
  );
}

export default ProjectDetail;
