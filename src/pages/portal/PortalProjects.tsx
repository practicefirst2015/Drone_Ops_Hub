import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { FolderKanban, Search, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "text-primary bg-primary/10";
    case "pending": case "draft": return "text-warning bg-warning/10";
    case "complete": return "text-success bg-success/10";
    default: return "text-muted-foreground bg-muted";
  }
};

const PortalProjects = () => {
  const { currentOrg } = useOrg();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["portal_projects_full", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, status, progress, start_date, end_date, location_name, clients(name)")
        .eq("organization_id", currentOrg!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const filtered = projects.filter((p: any) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="stat-label mb-1">Client Portal</p>
        <h1 className="page-title">Projects</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 surface border border-border flex items-center px-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-3 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border px-3 py-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="complete">Complete</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={search || statusFilter ? "No projects match your filters" : "No projects yet"}
          description="Your projects will appear here once they are set up."
        />
      ) : (
        <div className="surface border border-border divide-y divide-border">
          {filtered.map((project: any) => (
            <Link
              key={project.id}
              to={`/portal/projects/${project.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {project.name}
                  </p>
                  <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${statusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
                  {project.description && <span className="truncate max-w-xs">{project.description}</span>}
                  {project.location_name && <span>{project.location_name}</span>}
                  {project.start_date && <span>{project.start_date}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-24">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-muted-foreground">Progress</span>
                    <span className="font-mono text-xs text-foreground">{project.progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-border">
                    <div className="h-full bg-primary transition-all" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalProjects;
