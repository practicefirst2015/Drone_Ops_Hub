import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useClientVisibility } from "@/hooks/useClientVisibility";
import {
  FolderKanban,
  FileText,
  Package,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "text-primary bg-primary/10";
    case "pending": case "draft": return "text-warning bg-warning/10";
    case "complete": return "text-success bg-success/10";
    case "archived": return "text-muted-foreground bg-muted";
    default: return "text-muted-foreground";
  }
};

const PortalDashboard = () => {
  const { currentOrg } = useOrg();
  const visibility = useClientVisibility();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["portal_projects", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, status, progress, start_date, end_date, clients(name)")
        .eq("organization_id", currentOrg!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const { data: invoiceSummary } = useQuery({
    queryKey: ["portal_invoice_summary", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("amount, status")
        .eq("organization_id", currentOrg!.id);
      if (error) throw error;
      const total = (data || []).reduce((s, i) => s + Number(i.amount), 0);
      const paid = (data || []).filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
      const outstanding = total - paid;
      return { total, paid, outstanding, count: data?.length || 0 };
    },
    enabled: !!currentOrg && visibility.canViewInvoices,
  });

  const activeProjects = projects.filter(p => p.status === "active");
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
    : 0;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          Client Portal
        </p>
        <h1 className="page-title">Welcome</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your project progress, deliverables, and invoices.
        </p>
      </div>

      {/* Summary Cards */}
      <div className={`grid grid-cols-2 ${visibility.canViewInvoices ? "md:grid-cols-4" : "md:grid-cols-2"} gap-px bg-border mb-8`}>
        <div className="surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="stat-label">Projects</p>
          </div>
          <p className="font-mono text-2xl text-foreground">{projects.length}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{activeProjects.length} active</p>
        </div>
        <div className="surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="stat-label">Avg Progress</p>
          </div>
          <p className="font-mono text-2xl text-foreground">{avgProgress}%</p>
          <div className="w-full h-1 bg-border mt-2">
            <div className="h-full bg-primary transition-all" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
        {visibility.canViewInvoices && invoiceSummary && (
          <>
            <div className="surface p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="stat-label">Invoiced</p>
              </div>
              <p className="font-mono text-2xl text-foreground">${invoiceSummary.total.toLocaleString()}</p>
              <p className="font-mono text-[10px] text-success">${invoiceSummary.paid.toLocaleString()} paid</p>
            </div>
            <div className="surface p-5">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="stat-label">Outstanding</p>
              </div>
              <p className="font-mono text-2xl text-warning">${invoiceSummary.outstanding.toLocaleString()}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{invoiceSummary.count} invoices</p>
            </div>
          </>
        )}
      </div>

      {/* Active Projects */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title mb-0">Your Projects</p>
          <Link
            to="/portal/projects"
            className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Your projects will appear here once they are set up."
          />
        ) : (
          <div className="grid gap-px bg-border">
            {projects.slice(0, 6).map((project) => (
              <Link
                key={project.id}
                to={`/portal/projects/${project.id}`}
                className="surface p-5 flex items-center gap-4 hover:bg-secondary/50 transition-colors group"
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
                  {project.description && (
                    <p className="font-mono text-[10px] text-muted-foreground truncate">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-20">
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
    </div>
  );
};

export default PortalDashboard;
