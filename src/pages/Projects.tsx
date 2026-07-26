import { useState, useEffect } from "react";
import { Plus, Search, LayoutList, Columns3, CheckCircle2, AlertTriangle, XCircle, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useProjects } from "@/hooks/useProjectData";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Link, useSearchParams } from "react-router-dom";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { useBatchProjectReadiness } from "@/hooks/useProjectReadiness";

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "text-primary bg-primary/10";
    case "pending": case "draft": return "text-warning bg-warning/10";
    case "complete": return "text-success bg-success/10";
    case "archived": return "text-muted-foreground bg-muted";
    default: return "text-muted-foreground";
  }
};

const Projects = () => {
  const { projects: { data: projects = [], isLoading } } = useProjects();
  const { canManage } = useOrgRole();
  const { analysis: readinessData } = useBatchProjectReadiness();
  const [view, setView] = useState<"list" | "board">("list");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setCreateOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const readinessMap = Object.fromEntries(readinessData.map((r) => [r.projectId, r]));

  const filtered = projects.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">Operations</p>
          <h1 className="page-title">Projects</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-border">
            <button
              onClick={() => setView("list")}
              className={`p-2 transition-colors ${view === "list" ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("board")}
              className={`p-2 transition-colors ${view === "board" ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          {canManage && (
            <button
              data-create-project
              onClick={() => setCreateOpen(true)}
              className="h-10 px-4 bg-primary text-primary-foreground font-mono text-sm tracking-wide flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>
      </div>

      <div className="surface border border-border mb-6 flex items-center px-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent px-3 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center"><div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" /></div>
      ) : view === "list" ? (
        <ListView projects={filtered} readinessMap={readinessMap} />
      ) : (
        <BoardView projects={filtered} />
      )}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

function ListView({ projects, readinessMap }: { projects: any[]; readinessMap: Record<string, any> }) {
  const readinessIcon = (projectId: string) => {
    const r = readinessMap[projectId];
    if (!r) return null;
    if (r.overall === "ready") return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
    if (r.overall === "blocked") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-warning" />;
  };
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Projects organize your drone operations — group missions, track deliverables, assign team members, and manage budgets all in one place."
        action={{ label: "New Project", onClick: () => document.querySelector<HTMLButtonElement>('[data-create-project]')?.click() }}
        hints={[
          { label: "Add clients first", href: "/clients" },
          { label: "Set up your fleet", href: "/drones" },
        ]}
      />
    );
  }

  return (
    <div className="surface border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-3 text-left stat-label">Project</th>
            <th className="px-6 py-3 text-left stat-label">Client</th>
            <th className="px-6 py-3 text-left stat-label">Status</th>
            <th className="px-6 py-3 text-left stat-label">Progress</th>
            <th className="px-6 py-3 text-left stat-label">Dates</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((p: any) => (
            <tr key={p.id} className="hover:bg-secondary/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {readinessIcon(p.id)}
                  <div>
                    <Link to={`/projects/${p.id}`} className="text-sm text-foreground hover:text-primary transition-colors">
                      {p.name}
                    </Link>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{p.description}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">{p.clients?.name || "—"}</td>
              <td className="px-6 py-4">
                <span className={`font-mono text-xs px-2 py-1 ${statusColor(p.status)}`}>{p.status}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1 bg-border">
                    <div className="h-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{p.progress}%</span>
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                {p.start_date || "—"} → {p.end_date || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoardView({ projects }: { projects: any[] }) {
  const columns = [
    { key: "draft", label: "Draft" },
    { key: "active", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "complete", label: "Complete" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map((col) => {
        const items = projects.filter((p: any) => p.status === col.key);
        return (
          <div key={col.key} className="min-h-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-mono text-xs px-2 py-1 ${statusColor(col.key)}`}>{col.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((p: any) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="block surface border border-border p-4 hover:border-primary/30 transition-colors"
                >
                  <p className="text-sm text-foreground mb-2">{p.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{p.clients?.name || "No client"}</span>
                    <span className="font-mono text-xs text-muted-foreground">{p.progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-border mt-2">
                    <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                </Link>
              ))}
              {items.length === 0 && (
                <div className="border border-dashed border-border p-4 text-center">
                  <span className="font-mono text-xs text-muted-foreground">No projects</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Projects;
