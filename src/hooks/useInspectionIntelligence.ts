import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface AssetCondition {
  droneId: string;
  droneName: string;
  droneModel: string;
  conditionScore: number; // 0-100, higher is better
  riskLevel: RiskLevel;
  totalIssues: number;
  openIssues: number;
  criticalIssues: number;
  recurringCategories: { category: string; count: number }[];
  recentTrend: "improving" | "stable" | "worsening" | "insufficient_data";
  lastInspectionDate: string | null;
  issueHistory: { date: string; severity: string; category: string; title: string; status: string }[];
}

export interface InspectionSummary {
  totalAssets: number;
  assetsAtRisk: number;
  highRiskAssets: AssetCondition[];
  allAssets: AssetCondition[];
  overallHealthScore: number;
  topRecurringDefects: { category: string; count: number }[];
  insufficientData: boolean;
}

function calculateConditionScore(issues: any[]): number {
  if (issues.length === 0) return 100;

  const severityWeights: Record<string, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
  };

  const statusMultiplier: Record<string, number> = {
    open: 1.0,
    investigating: 0.8,
    resolved: 0.2,
    dismissed: 0.0,
  };

  let penalty = 0;
  for (const issue of issues) {
    const weight = severityWeights[issue.severity] ?? 5;
    const multiplier = statusMultiplier[issue.resolution_status] ?? 0.5;
    penalty += weight * multiplier;
  }

  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function determineRiskLevel(score: number, openCritical: number): RiskLevel {
  if (openCritical > 0 || score < 30) return "critical";
  if (score < 55) return "high";
  if (score < 75) return "moderate";
  return "low";
}

function detectTrend(issues: any[]): AssetCondition["recentTrend"] {
  // Need at least 3 issues across 2+ different dates to detect a trend
  if (issues.length < 3) return "insufficient_data";

  const sorted = [...issues].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const midpoint = Math.floor(sorted.length / 2);
  const olderHalf = sorted.slice(0, midpoint);
  const newerHalf = sorted.slice(midpoint);

  const severityValue: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const avgOlder =
    olderHalf.reduce((s, i) => s + (severityValue[i.severity] ?? 1), 0) / olderHalf.length;
  const avgNewer =
    newerHalf.reduce((s, i) => s + (severityValue[i.severity] ?? 1), 0) / newerHalf.length;

  const openOlder = olderHalf.filter(
    (i) => i.resolution_status === "open" || i.resolution_status === "investigating"
  ).length;
  const openNewer = newerHalf.filter(
    (i) => i.resolution_status === "open" || i.resolution_status === "investigating"
  ).length;

  if (avgNewer > avgOlder + 0.5 || openNewer > openOlder + 1) return "worsening";
  if (avgNewer < avgOlder - 0.5 || openNewer < openOlder - 1) return "improving";
  return "stable";
}

function findRecurringCategories(issues: any[]): { category: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const issue of issues) {
    counts[issue.category] = (counts[issue.category] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function useInspectionIntelligence() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["inspection_intelligence", orgId],
    queryFn: async (): Promise<InspectionSummary> => {
      const [issuesRes, dronesRes] = await Promise.all([
        supabase
          .from("postflight_issues")
          .select(
            "id, title, severity, category, resolution_status, created_at, flight_log_id, drone_model_id, flight_logs(drone_id, flight_date, drones(id, name, model))"
          )
          .eq("organization_id", orgId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("drones")
          .select("id, name, model, status")
          .eq("organization_id", orgId!),
      ]);

      if (issuesRes.error) throw issuesRes.error;
      if (dronesRes.error) throw dronesRes.error;

      const issues = issuesRes.data || [];
      const drones = dronesRes.data || [];

      if (drones.length === 0) {
        return {
          totalAssets: 0,
          assetsAtRisk: 0,
          highRiskAssets: [],
          allAssets: [],
          overallHealthScore: 100,
          topRecurringDefects: [],
          insufficientData: true,
        };
      }

      // Group issues by drone
      const issuesByDrone: Record<string, any[]> = {};
      for (const drone of drones) {
        issuesByDrone[drone.id] = [];
      }

      for (const issue of issues) {
        const fl = issue.flight_logs as any;
        const droneId = fl?.drone_id || fl?.drones?.id;
        if (droneId && issuesByDrone[droneId]) {
          issuesByDrone[droneId].push(issue);
        }
      }

      // Build per-asset analysis
      const allAssets: AssetCondition[] = drones.map((drone) => {
        const droneIssues = issuesByDrone[drone.id] || [];
        const openIssues = droneIssues.filter(
          (i) => i.resolution_status === "open" || i.resolution_status === "investigating"
        );
        const criticalOpen = openIssues.filter((i) => i.severity === "critical");
        const score = calculateConditionScore(droneIssues);

        return {
          droneId: drone.id,
          droneName: drone.name,
          droneModel: drone.model,
          conditionScore: score,
          riskLevel: determineRiskLevel(score, criticalOpen.length),
          totalIssues: droneIssues.length,
          openIssues: openIssues.length,
          criticalIssues: criticalOpen.length,
          recurringCategories: findRecurringCategories(droneIssues),
          recentTrend: detectTrend(droneIssues),
          lastInspectionDate:
            droneIssues.length > 0 ? droneIssues[0].created_at : null,
          issueHistory: droneIssues.slice(0, 20).map((i) => ({
            date: i.created_at,
            severity: i.severity,
            category: i.category,
            title: i.title,
            status: i.resolution_status,
          })),
        };
      });

      allAssets.sort((a, b) => a.conditionScore - b.conditionScore);

      const highRiskAssets = allAssets.filter(
        (a) => a.riskLevel === "critical" || a.riskLevel === "high"
      );
      const assetsAtRisk = allAssets.filter((a) => a.riskLevel !== "low").length;
      const overallHealthScore =
        allAssets.length > 0
          ? Math.round(allAssets.reduce((s, a) => s + a.conditionScore, 0) / allAssets.length)
          : 100;

      // Global recurring defects
      const allCategories: Record<string, number> = {};
      for (const issue of issues) {
        allCategories[issue.category] = (allCategories[issue.category] || 0) + 1;
      }
      const topRecurringDefects = Object.entries(allCategories)
        .filter(([, count]) => count >= 2)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalAssets: drones.length,
        assetsAtRisk,
        highRiskAssets,
        allAssets,
        overallHealthScore,
        topRecurringDefects,
        insufficientData: issues.length === 0,
      };
    },
    enabled: !!orgId,
  });
}

/** Per-drone inspection intelligence */
export function useDroneInspectionIntelligence(droneId: string | undefined) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["drone_inspection_intel", orgId, droneId],
    queryFn: async (): Promise<AssetCondition | null> => {
      const [droneRes, issuesRes] = await Promise.all([
        supabase.from("drones").select("id, name, model").eq("id", droneId!).single(),
        supabase
          .from("postflight_issues")
          .select(
            "id, title, severity, category, resolution_status, created_at, flight_logs!inner(drone_id)"
          )
          .eq("organization_id", orgId!)
          .eq("flight_logs.drone_id", droneId!)
          .order("created_at", { ascending: false }),
      ]);

      if (droneRes.error) return null;
      if (issuesRes.error) throw issuesRes.error;

      const drone = droneRes.data;
      const droneIssues = issuesRes.data || [];
      const openIssues = droneIssues.filter(
        (i) => i.resolution_status === "open" || i.resolution_status === "investigating"
      );
      const criticalOpen = openIssues.filter((i) => i.severity === "critical");
      const score = calculateConditionScore(droneIssues);

      return {
        droneId: drone.id,
        droneName: drone.name,
        droneModel: drone.model,
        conditionScore: score,
        riskLevel: determineRiskLevel(score, criticalOpen.length),
        totalIssues: droneIssues.length,
        openIssues: openIssues.length,
        criticalIssues: criticalOpen.length,
        recurringCategories: findRecurringCategories(droneIssues),
        recentTrend: detectTrend(droneIssues),
        lastInspectionDate: droneIssues.length > 0 ? droneIssues[0].created_at : null,
        issueHistory: droneIssues.slice(0, 30).map((i) => ({
          date: i.created_at,
          severity: i.severity,
          category: i.category,
          title: i.title,
          status: i.resolution_status,
        })),
      };
    },
    enabled: !!orgId && !!droneId,
  });
}

/** Per-project inspection intelligence */
export function useProjectInspectionIntelligence(projectId: string | undefined) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["project_inspection_intel", orgId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postflight_issues")
        .select(
          "id, title, severity, category, resolution_status, created_at, flight_logs!inner(project_id, drone_id, drones(id, name))"
        )
        .eq("organization_id", orgId!)
        .eq("flight_logs.project_id", projectId!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const issues = data || [];
      const openIssues = issues.filter(
        (i) => i.resolution_status === "open" || i.resolution_status === "investigating"
      );
      const criticalOpen = openIssues.filter((i) => i.severity === "critical");

      // Group by drone for per-asset breakdown
      const byDrone: Record<string, { name: string; issues: any[] }> = {};
      for (const issue of issues) {
        const fl = issue.flight_logs as any;
        const droneId = fl?.drone_id;
        const droneName = fl?.drones?.name || "Unknown";
        if (droneId) {
          if (!byDrone[droneId]) byDrone[droneId] = { name: droneName, issues: [] };
          byDrone[droneId].issues.push(issue);
        }
      }

      const assetBreakdown = Object.entries(byDrone).map(([id, data]) => {
        const score = calculateConditionScore(data.issues);
        const open = data.issues.filter(
          (i) => i.resolution_status === "open" || i.resolution_status === "investigating"
        );
        const crit = open.filter((i) => i.severity === "critical");
        return {
          droneId: id,
          droneName: data.name,
          conditionScore: score,
          riskLevel: determineRiskLevel(score, crit.length),
          issueCount: data.issues.length,
          openCount: open.length,
        };
      });

      return {
        totalIssues: issues.length,
        openIssues: openIssues.length,
        criticalIssues: criticalOpen.length,
        recurringDefects: findRecurringCategories(issues),
        assetBreakdown: assetBreakdown.sort((a, b) => a.conditionScore - b.conditionScore),
        insufficientData: issues.length === 0,
      };
    },
    enabled: !!orgId && !!projectId,
  });
}
