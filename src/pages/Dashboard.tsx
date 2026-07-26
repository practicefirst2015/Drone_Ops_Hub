import { StatusCard } from "@/components/StatusCard";
import { Plane, FolderKanban, Users, AlertTriangle, FileText, Activity, ChevronRight, Radio } from "lucide-react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { addDays, isBefore } from "date-fns";
import { Link } from "react-router-dom";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { UtilizationWidget } from "@/components/dashboard/UtilizationWidget";
import { RecentFlightsWidget } from "@/components/dashboard/RecentFlightsWidget";
import { ProjectReadinessWidget } from "@/components/dashboard/ProjectReadinessWidget";
import { MissionReadinessWidget } from "@/components/dashboard/MissionReadinessWidget";
import { UpcomingMissionsWidget } from "@/components/dashboard/UpcomingMissionsWidget";
import { BlockedMissionsWidget } from "@/components/dashboard/BlockedMissionsWidget";
import { UnresolvedIssuesWidget } from "@/components/dashboard/UnresolvedIssuesWidget";
import { OverdueInvoicesWidget } from "@/components/dashboard/OverdueInvoicesWidget";
import { IncompleteDeliverablesWidget } from "@/components/dashboard/IncompleteDeliverablesWidget";
import { ActivityFeed } from "@/components/ActivityFeed";
import { SystemHealthWidget } from "@/components/dashboard/SystemHealthWidget";
import { FleetAvailabilityWidget } from "@/components/dashboard/FleetAvailabilityWidget";
import { IntelligenceWidget } from "@/components/intelligence/IntelligenceWidget";
import { useMissionIntelligence } from "@/hooks/useMissionIntelligence";
import { AnalyticsSummaryWidget } from "@/components/dashboard/AnalyticsSummaryWidget";
import { InspectionIntelligencePanel } from "@/components/inspection/InspectionIntelligencePanel";
import { useInspectionIntelligence } from "@/hooks/useInspectionIntelligence";

function useQuickStats() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const projects = useQuery({
    queryKey: ["dash_projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, status").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const drones = useQuery({
    queryKey: ["dash_drones", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("drones").select("id, status, flight_hours, next_maintenance").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const clients = useQuery({
    queryKey: ["dash_clients", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, status").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const invoices = useQuery({
    queryKey: ["dash_invoices_quick", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("id, amount, status, due_date").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const skills = useQuery({
    queryKey: ["dash_skills", orgId],
    queryFn: async () => {
      const { count, error } = await supabase.from("skills").select("id", { count: "exact", head: true }).eq("organization_id", orgId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  return { projects, drones, clients, invoices, skills };
}

const Dashboard = () => {
  const { projects, drones, clients, invoices, skills } = useQuickStats();
  const intelligence = useMissionIntelligence();
  const inspectionIntel = useInspectionIntelligence();

  const allProjects = projects.data || [];
  const allDrones = drones.data || [];
  const allClients = clients.data || [];
  const allInvoices = invoices.data || [];

  const activeProjects = allProjects.filter((p) => p.status === "active");
  const pendingProjects = allProjects.filter((p) => p.status === "pending" || p.status === "draft");
  const activeDrones = allDrones.filter((d) => d.status === "available" || d.status === "in_flight");
  const activeClients = allClients.filter((c) => c.status === "active");

  const now = new Date();
  const pendingInvoices = allInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
  const pendingTotal = pendingInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalFlightHours = allDrones.reduce((s, d) => s + Number(d.flight_hours || 0), 0);
  const maintenanceDue = allDrones.filter((d) => d.next_maintenance && isBefore(new Date(d.next_maintenance), addDays(now, 14)));

  const isLoading = projects.isLoading || drones.isLoading || clients.isLoading || invoices.isLoading;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="stat-label mb-1">System Status</p>
          <h1 className="page-title">Command Center</h1>
        </div>
        <Link
          to="/field"
          className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground font-mono text-xs tracking-wide hover:opacity-90 active:opacity-80 transition-opacity shrink-0"
        >
          <Radio className="w-3.5 h-3.5" />
          Field Mode
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-2 h-2 bg-primary animate-pulse-glow" />
        </div>
      ) : (
        <>
          {allProjects.length === 0 && allDrones.length === 0 && allClients.length === 0 ? (
            <div className="surface border border-border p-8 max-w-2xl">
              <p className="section-title mb-4">Getting Started</p>
              <p className="text-sm text-muted-foreground mb-6">Set up your workspace by completing these steps:</p>
              <div className="space-y-3">
                {[
                  { step: 1, label: "Add your first client", href: "/clients", done: allClients.length > 0 },
                  { step: 2, label: "Register drones in your fleet", href: "/drones", done: allDrones.length > 0 },
                  { step: 3, label: "Define skills & certifications", href: "/skills", done: (skills.data ?? 0) > 0 },
                  { step: 4, label: "Create a project", href: "/projects", done: allProjects.length > 0 },
                ].map((item) => (
                  <Link key={item.step} to={item.href} className="flex items-center gap-4 px-4 py-3 border border-border hover:border-primary/30 hover:bg-secondary/30 transition-colors group">
                    <span className={`w-6 h-6 flex items-center justify-center font-mono text-xs border ${item.done ? "border-success text-success" : "border-muted-foreground text-muted-foreground group-hover:border-primary group-hover:text-primary"}`}>
                      {item.done ? "✓" : item.step}
                    </span>
                    <span className={`font-mono text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border mb-8">
                <StatusCard label="Active Projects" value={activeProjects.length} icon={FolderKanban} trend={pendingProjects.length > 0 ? `${pendingProjects.length} pending` : undefined} accent="primary" />
                <StatusCard label="Active Drones" value={activeDrones.length} icon={Plane} trend={`${allDrones.length} total`} accent="primary" />
                <StatusCard label="Total Clients" value={activeClients.length} icon={Users} trend={allClients.length !== activeClients.length ? `${allClients.length - activeClients.length} inactive` : undefined} accent="primary" />
                <StatusCard label="Maintenance Due" value={maintenanceDue.length} icon={AlertTriangle} trend={maintenanceDue.length > 0 ? "action needed" : "all clear"} accent={maintenanceDue.length > 0 ? "warning" : "success"} />
                <StatusCard label="Pending Invoices" value={pendingInvoices.length} icon={FileText} trend={pendingTotal > 0 ? `$${pendingTotal.toLocaleString()}` : undefined} accent={pendingInvoices.length > 0 ? "warning" : "success"} />
                <StatusCard label="Flight Hours" value={totalFlightHours.toLocaleString()} icon={Activity} accent="success" />
              </div>

              {/* Row 1: Missions + Blocked + Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <UpcomingMissionsWidget />
                <BlockedMissionsWidget />
                <AlertsPanel limit={8} />
              </div>

              {/* Row 2: Recent Flights + Unresolved Issues */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <RecentFlightsWidget />
                <UnresolvedIssuesWidget />
              </div>

              {/* Row 3: Invoices + Deliverables + Utilization + Fleet */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <OverdueInvoicesWidget />
                <IncompleteDeliverablesWidget />
                <FleetAvailabilityWidget />
              </div>

              {/* Row 3b: Utilization + Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <UtilizationWidget />
                <div className="lg:col-span-2">
                  <AnalyticsSummaryWidget />
                </div>
              </div>

              {/* Row 4: Intelligence + Readiness */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                  <IntelligenceWidget
                    insights={intelligence.insights}
                    loading={intelligence.loading}
                    limit={10}
                  />
                </div>
                <div className="space-y-6">
                  <ProjectReadinessWidget />
                  <MissionReadinessWidget />
                </div>
              </div>

              {/* Row 4b: Inspection Intelligence */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-3">
                  <InspectionIntelligencePanel
                    data={inspectionIntel.data}
                    loading={inspectionIntel.isLoading}
                  />
                </div>
              </div>

              {/* Row 5: Activity Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-3 surface border border-border">
                  <div className="px-6 py-4 border-b border-border">
                    <span className="section-title mb-0">Recent Activity</span>
                  </div>
                  <ActivityFeed limit={12} />
                </div>
              </div>

              {/* Row 5: System Health */}
              <div>
                <SystemHealthWidget />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
