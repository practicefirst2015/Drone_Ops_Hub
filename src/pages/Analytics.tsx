import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOperationsAnalytics, useFleetAnalytics, usePersonnelAnalytics, useProjectAnalytics } from "@/hooks/useAnalytics";
import { BarChart3, Plane, Users, FolderKanban, Globe } from "lucide-react";
import { IndustryInsightsTab } from "@/components/analytics/IndustryInsightsTab";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const CHART_COLORS = [
  "hsl(180, 100%, 50%)",
  "hsl(152, 70%, 45%)",
  "hsl(43, 100%, 50%)",
  "hsl(228, 50%, 60%)",
  "hsl(340, 70%, 55%)",
  "hsl(270, 60%, 55%)",
];

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="surface border border-border p-5">
      <p className="stat-label mb-1">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="font-mono text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface border border-border">
      <div className="px-5 py-3 border-b border-border">
        <span className="section-title">{title}</span>
      </div>
      <div className="p-4 h-72">{children}</div>
    </div>
  );
}

function SimplePie({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground p-4">No data</p>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} strokeWidth={1} stroke="hsl(228, 10%, 18%)">
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: "hsl(228, 10%, 11%)", border: "1px solid hsl(228, 10%, 18%)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function SimpleBar({ data, xKey, bars }: { data: any[]; xKey: string; bars: { key: string; color: string }[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground p-4">No data</p>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 10%, 18%)" />
        <XAxis dataKey={xKey} tick={{ fill: "hsl(228, 10%, 55%)", fontFamily: "var(--font-mono)", fontSize: 11 }} />
        <YAxis tick={{ fill: "hsl(228, 10%, 55%)", fontFamily: "var(--font-mono)", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "hsl(228, 10%, 11%)", border: "1px solid hsl(228, 10%, 18%)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 12 }} />
        {bars.map(b => <Bar key={b.key} dataKey={b.key} fill={b.color} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

function OperationsTab() {
  const { data, isLoading } = useOperationsAnalytics();
  if (isLoading || !data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        <StatBox label="Total Missions" value={data.totalMissions} />
        <StatBox label="Flight Logs" value={data.totalFlights} />
        <StatBox label="Success Rate" value={`${data.successRate}%`} />
        <StatBox label="Avg Readiness Delay" value={`${data.avgReadinessDelay}d`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Monthly Mission Activity">
          <SimpleBar data={data.monthlyData} xKey="month" bars={[
            { key: "total", color: CHART_COLORS[0] },
            { key: "completed", color: CHART_COLORS[1] },
            { key: "failed", color: CHART_COLORS[2] },
          ]} />
        </ChartCard>
        <ChartCard title="Flight Outcomes">
          <SimplePie data={data.outcomeBreakdown} />
        </ChartCard>
      </div>
      <ChartCard title="Mission Status Distribution">
        <SimplePie data={data.statusBreakdown} />
      </ChartCard>
    </div>
  );
}

function FleetTab() {
  const { data, isLoading } = useFleetAnalytics();
  if (isLoading || !data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        <StatBox label="Total Drones" value={data.totalDrones} />
        <StatBox label="Avg Flight Hours" value={data.avgFlightHours} />
        <StatBox label="Maintenance Events" value={data.totalMaintenanceEvents} />
        <StatBox label="Maintenance Cost" value={`$${data.totalMaintenanceCost.toLocaleString()}`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Most Used Aircraft">
          <SimpleBar data={data.topDrones} xKey="name" bars={[{ key: "flights", color: CHART_COLORS[0] }]} />
        </ChartCard>
        <ChartCard title="Fleet Status">
          <SimplePie data={data.statusBreakdown} />
        </ChartCard>
      </div>
      <ChartCard title="Maintenance by Type">
        <SimplePie data={data.maintenanceByType} />
      </ChartCard>
    </div>
  );
}

function PersonnelTab() {
  const { data, isLoading } = usePersonnelAnalytics();
  if (isLoading || !data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        <StatBox label="Team Members" value={data.totalMembers} />
        <StatBox label="Active Pilots" value={data.totalPilots} />
        <StatBox label="Cert Coverage" value={`${data.certCoverage}%`} />
        <StatBox label="Expired Certs" value={data.expiredCerts} sub={data.expiredCerts > 0 ? "action needed" : "all current"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Pilot Flight Hours">
          <SimpleBar data={data.pilotLeaderboard} xKey="name" bars={[{ key: "hours", color: CHART_COLORS[0] }]} />
        </ChartCard>
        <ChartCard title="Pilot Mission Counts">
          <SimpleBar data={data.pilotLeaderboard} xKey="name" bars={[{ key: "missions", color: CHART_COLORS[1] }]} />
        </ChartCard>
      </div>
    </div>
  );
}

function ProjectsTab() {
  const { data, isLoading } = useProjectAnalytics();
  if (isLoading || !data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        <StatBox label="Total Projects" value={data.totalProjects} />
        <StatBox label="Avg Duration" value={`${data.avgDuration}d`} sub={`${data.completedProjects} completed`} />
        <StatBox label="Deliverable Rate" value={`${data.deliverableRate}%`} sub={`${data.completedDeliverables}/${data.totalDeliverables}`} />
        <StatBox label="Collection Rate" value={`${data.collectionRate}%`} sub={`$${data.totalPaid.toLocaleString()} / $${data.totalInvoiced.toLocaleString()}`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Project Status">
          <SimplePie data={data.statusBreakdown} />
        </ChartCard>
        <ChartCard title="Invoice Status">
          <SimplePie data={data.invoiceStatusBreakdown} />
        </ChartCard>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-2 h-2 bg-primary animate-pulse-glow" />
    </div>
  );
}

const Analytics = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="stat-label mb-1">Intelligence</p>
        <h1 className="page-title">Analytics</h1>
      </div>

      <Tabs defaultValue="operations" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="operations" className="font-mono text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="w-3.5 h-3.5" /> Operations
          </TabsTrigger>
          <TabsTrigger value="fleet" className="font-mono text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Plane className="w-3.5 h-3.5" /> Fleet
          </TabsTrigger>
          <TabsTrigger value="personnel" className="font-mono text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-3.5 h-3.5" /> Personnel
          </TabsTrigger>
          <TabsTrigger value="projects" className="font-mono text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FolderKanban className="w-3.5 h-3.5" /> Projects
          </TabsTrigger>
          <TabsTrigger value="industry" className="font-mono text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe className="w-3.5 h-3.5" /> Industry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations"><OperationsTab /></TabsContent>
        <TabsContent value="fleet"><FleetTab /></TabsContent>
        <TabsContent value="personnel"><PersonnelTab /></TabsContent>
        <TabsContent value="projects"><ProjectsTab /></TabsContent>
        <TabsContent value="industry"><IndustryInsightsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
