import { useIndustryInsights } from "@/hooks/useIndustryInsights";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { BarChart3, Globe, Shield, TrendingUp, AlertTriangle } from "lucide-react";
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

function NotOptedIn() {
  return (
    <div className="surface border border-border p-12 text-center">
      <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <p className="font-mono text-sm text-foreground mb-2">Industry Insights Unavailable</p>
      <p className="font-mono text-xs text-muted-foreground max-w-md mx-auto">
        Your organization has not opted in to anonymized data sharing.
        Enable it in Settings → Data Insights to access industry benchmarks.
      </p>
    </div>
  );
}

function InsufficientData({ current, required }: { current: number; required: number }) {
  return (
    <div className="surface border border-border p-12 text-center">
      <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <p className="font-mono text-sm text-foreground mb-2">Insufficient Participants</p>
      <p className="font-mono text-xs text-muted-foreground max-w-md mx-auto">
        Industry insights require at least {required} participating organizations to ensure anonymity.
        Currently {current} organization{current !== 1 ? "s" : ""} opted in.
      </p>
    </div>
  );
}

export function IndustryInsightsTab() {
  const { settings } = useOrgSettings();
  const { data, isLoading, error } = useIndustryInsights();

  const optedIn = settings?.data_insights_opt_in ?? false;

  if (!optedIn) return <NotOptedIn />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-2 h-2 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface border border-border p-8 text-center">
        <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
        <p className="font-mono text-xs text-muted-foreground">Failed to load industry insights.</p>
      </div>
    );
  }

  if (!data?.available) {
    return <InsufficientData current={data?.currentParticipants ?? 0} required={data?.minimumRequired ?? 3} />;
  }

  const { missions, flights, fleet, inspections } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <Shield className="w-3.5 h-3.5" />
        Anonymized data from {data.participatingOrganizations} organizations •
        Generated {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : "recently"}
      </div>

      {/* Key benchmarks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        <StatBox label="Industry Missions" value={missions?.totalAcrossIndustry?.toLocaleString() ?? "—"} sub="total tracked" />
        <StatBox label="Success Rate" value={missions?.successRate ? `${missions.successRate}%` : "—"} sub="industry avg" />
        <StatBox label="Avg Flight Duration" value={flights?.avgDurationMinutes ? `${flights.avgDurationMinutes}m` : "—"} sub={flights?.medianDurationMinutes ? `median: ${flights.medianDurationMinutes}m` : undefined} />
        <StatBox label="Issue Resolution" value={inspections?.resolutionRate ? `${inspections.resolutionRate}%` : "—"} sub={`${inspections?.totalIssuesReported?.toLocaleString() ?? 0} total issues`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flight outcomes */}
        <ChartCard title="Flight Outcome Distribution">
          {flights?.outcomeDistribution?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={flights.outcomeDistribution.map((d) => ({ ...d, value: d.percentage }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  strokeWidth={1}
                  stroke="hsl(228, 10%, 18%)"
                >
                  {flights.outcomeDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(228, 10%, 11%)", border: "1px solid hsl(228, 10%, 18%)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 12 }}
                  formatter={(val: number) => `${val}%`}
                />
                <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground p-4">No data</p>
          )}
        </ChartCard>

        {/* Popular drone models */}
        <ChartCard title="Most Used Drone Models">
          {fleet?.popularModels?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fleet.popularModels}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 10%, 18%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(228, 10%, 55%)", fontFamily: "var(--font-mono)", fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "hsl(228, 10%, 55%)", fontFamily: "var(--font-mono)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(228, 10%, 11%)", border: "1px solid hsl(228, 10%, 18%)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 12 }} />
                <Bar dataKey="count" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground p-4">No data</p>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue severity */}
        <ChartCard title="Issue Severity Distribution">
          {inspections?.severityDistribution?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inspections.severityDistribution.map((d) => ({ ...d, value: d.percentage }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  strokeWidth={1}
                  stroke="hsl(228, 10%, 18%)"
                >
                  {inspections.severityDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(228, 10%, 11%)", border: "1px solid hsl(228, 10%, 18%)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 12 }}
                  formatter={(val: number) => `${val}%`}
                />
                <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground p-4">No data</p>
          )}
        </ChartCard>

        {/* Top issue categories */}
        <ChartCard title="Top Issue Categories">
          {inspections?.topIssueCategories?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inspections.topIssueCategories}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 10%, 18%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(228, 10%, 55%)", fontFamily: "var(--font-mono)", fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "hsl(228, 10%, 55%)", fontFamily: "var(--font-mono)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(228, 10%, 11%)", border: "1px solid hsl(228, 10%, 18%)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 12 }} />
                <Bar dataKey="count" fill={CHART_COLORS[4]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground p-4">No data</p>
          )}
        </ChartCard>
      </div>

      {/* Fleet benchmark */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        <StatBox label="Drones Tracked" value={fleet?.totalDronesTracked?.toLocaleString() ?? "—"} sub="across industry" />
        <StatBox label="Avg Flight Hours" value={fleet?.avgFlightHoursPerDrone ?? "—"} sub="per drone" />
        <StatBox label="Total Flights" value={flights?.totalAcrossIndustry?.toLocaleString() ?? "—"} sub="industry-wide" />
      </div>
    </div>
  );
}
