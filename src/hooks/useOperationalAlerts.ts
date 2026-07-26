import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { addDays, isBefore, differenceInDays } from "date-fns";
import { useMaintenanceTracking } from "@/hooks/useMaintenanceTracking";
import { usePilotCurrency } from "@/hooks/usePilotCurrency";

export type AlertType = "certification" | "maintenance" | "postflight_issue" | "pilot_currency";
export type AlertUrgency = "critical" | "warning" | "info";

export interface OperationalAlert {
  id: string;
  type: AlertType;
  urgency: AlertUrgency;
  title: string;
  subtitle: string;
  entityId: string;
  entityName: string;
  dueDate: Date;
  daysRemaining: number;
  metadata?: Record<string, any>;
}

interface UseOperationalAlertsOptions {
  filterType?: AlertType | null;
  filterUrgency?: AlertUrgency | null;
  projectMemberIds?: string[];
  droneIds?: string[];
}

function getUrgency(daysRemaining: number): AlertUrgency {
  if (daysRemaining <= 0) return "critical";
  if (daysRemaining <= 14) return "warning";
  return "info";
}

export function useOperationalAlerts(options: UseOperationalAlertsOptions = {}) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const { statuses: maintStatuses, isLoading: maintLoading } = useMaintenanceTracking();
  const { pilots: pilotStatuses, isLoading: pilotsLoading } = usePilotCurrency();

  const certs = useQuery({
    queryKey: ["alerts_certs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certifications")
        .select("id, expiry_date, status, certification_number, skill_id, user_id, skills(name), profiles:user_id(full_name)")
        .eq("organization_id", orgId!)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const drones = useQuery({
    queryKey: ["alerts_drones", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drones")
        .select("id, name, status, battery_level, next_maintenance, flight_hours")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  // Unresolved postflight issues — limited
  const unresolvedIssues = useQuery({
    queryKey: ["alerts_postflight_issues", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postflight_issues")
        .select("id, title, severity, category, resolution_status, created_at, flight_log_id, pilot_id, drone_model_id, profiles_pilot:pilot_id(full_name), drone_models(name)")
        .eq("organization_id", orgId!)
        .in("resolution_status", ["open", "investigating"])
        .order("severity", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const now = new Date();
  const horizon = addDays(now, 90);

  let alerts: OperationalAlert[] = [];

  // Certification alerts
  if (certs.data) {
    for (const c of certs.data as any[]) {
      if (!c.expiry_date) continue;
      const expDate = new Date(c.expiry_date);
      if (!isBefore(expDate, horizon) && !isBefore(expDate, now)) continue;
      const daysRemaining = differenceInDays(expDate, now);

      if (options.projectMemberIds && !options.projectMemberIds.includes(c.user_id)) continue;

      alerts.push({
        id: `cert-${c.id}`,
        type: "certification",
        urgency: getUrgency(daysRemaining),
        title: c.profiles?.full_name || "Unknown pilot",
        subtitle: c.skills?.name || "Certification",
        entityId: c.id,
        entityName: c.profiles?.full_name || "",
        dueDate: expDate,
        daysRemaining,
        metadata: { certNumber: c.certification_number, userId: c.user_id, skillId: c.skill_id },
      });
    }
  }

  // Maintenance alerts
  if (drones.data) {
    for (const d of drones.data) {
      if (!d.next_maintenance) continue;
      const mDate = new Date(d.next_maintenance);
      if (!isBefore(mDate, horizon) && !isBefore(mDate, now)) continue;
      const daysRemaining = differenceInDays(mDate, now);

      if (options.droneIds && !options.droneIds.includes(d.id)) continue;

      alerts.push({
        id: `maint-${d.id}`,
        type: "maintenance",
        urgency: getUrgency(daysRemaining),
        title: d.name,
        subtitle: `${d.flight_hours ?? 0}h flown · Battery ${d.battery_level ?? "—"}%`,
        entityId: d.id,
        entityName: d.name,
        dueDate: mDate,
        daysRemaining,
        metadata: { status: d.status },
      });
    }
  }

  // Utilization-based maintenance alerts
  for (const ms of maintStatuses) {
    if (ms.status === "ok" || (!ms.intervalHours && !ms.intervalMissions)) continue;
    if (options.droneIds && !options.droneIds.includes(ms.droneId)) continue;

    const urgency: AlertUrgency = ms.status === "overdue" ? "critical" : ms.status === "due" ? "warning" : "info";
    const maxProgress = Math.max(ms.hoursProgress ?? 0, ms.missionsProgress ?? 0);
    const progressPct = Math.round(maxProgress * 100);

    alerts.push({
      id: `util-maint-${ms.droneId}`,
      type: "maintenance",
      urgency,
      title: ms.droneName,
      subtitle: `${ms.hoursSinceMaintenance.toFixed(1)}h / ${ms.missionsSinceMaintenance} missions since last service · ${progressPct}%`,
      entityId: ms.droneId,
      entityName: ms.droneName,
      dueDate: ms.nextMaintenanceDate ? new Date(ms.nextMaintenanceDate) : new Date(),
      daysRemaining: ms.status === "overdue" ? -1 : ms.status === "due" ? 0 : 7,
      metadata: { utilizationBased: true, status: ms.status },
    });
  }

  // Postflight issue alerts
  if (unresolvedIssues.data) {
    const severityUrgency: Record<string, AlertUrgency> = {
      critical: "critical",
      high: "warning",
      medium: "info",
      low: "info",
    };
    for (const issue of unresolvedIssues.data as any[]) {
      const createdAt = new Date(issue.created_at);
      const daysSinceCreated = differenceInDays(now, createdAt);

      let urgency = severityUrgency[issue.severity] || "info";
      if (daysSinceCreated > 7 && urgency === "info") urgency = "warning";
      if (daysSinceCreated > 14 && urgency !== "critical") urgency = "warning";
      if (daysSinceCreated > 30) urgency = "critical";

      const pilotName = issue.profiles_pilot?.full_name;
      const droneName = issue.drone_models?.name;
      const subtitleParts = [issue.category.replace("_", " ")];
      if (pilotName) subtitleParts.push(pilotName);
      if (droneName) subtitleParts.push(droneName);

      alerts.push({
        id: `pf-issue-${issue.id}`,
        type: "postflight_issue",
        urgency,
        title: issue.title,
        subtitle: subtitleParts.join(" · "),
        entityId: issue.id,
        entityName: issue.title,
        dueDate: createdAt,
        daysRemaining: -daysSinceCreated,
        metadata: {
          severity: issue.severity,
          category: issue.category,
          flightLogId: issue.flight_log_id,
          resolutionStatus: issue.resolution_status,
        },
      });
    }
  }

  // Pilot currency alerts
  for (const pilot of pilotStatuses) {
    if (pilot.complianceStatus === "compliant") continue;
    if (options.projectMemberIds && !options.projectMemberIds.includes(pilot.userId)) continue;

    const urgency: AlertUrgency = pilot.complianceStatus === "non_compliant" ? "critical" : "warning";
    const reasons = pilot.complianceReasons?.length
      ? pilot.complianceReasons
      : (() => {
          const r: string[] = [];
          if (pilot.currencyStatus === "expired") r.push("no recent flights");
          else if (pilot.currencyStatus === "warning") r.push("flight currency lapsing");
          const expiredCerts = pilot.certifications.filter(c => c.isExpired);
          const expiringSoonCerts = pilot.certifications.filter(c => c.isExpiringSoon);
          if (expiredCerts.length > 0) r.push(`${expiredCerts.length} expired cert${expiredCerts.length > 1 ? "s" : ""}`);
          if (expiringSoonCerts.length > 0) r.push(`${expiringSoonCerts.length} expiring soon`);
          if (pilot.missionCertGaps?.length > 0) r.push(`missing certs for ${new Set(pilot.missionCertGaps.map(g => g.missionId)).size} mission(s)`);
          return r;
        })();

    alerts.push({
      id: `pilot-currency-${pilot.userId}`,
      type: "pilot_currency",
      urgency,
      title: pilot.fullName,
      subtitle: reasons.join(" · ") || "Compliance issue",
      entityId: pilot.userId,
      entityName: pilot.fullName,
      dueDate: pilot.lastFlightDate ? new Date(pilot.lastFlightDate) : new Date(),
      daysRemaining: pilot.daysSinceLastFlight !== null ? -pilot.daysSinceLastFlight : -999,
      metadata: { currencyStatus: pilot.currencyStatus, complianceStatus: pilot.complianceStatus },
    });
  }

  // Apply filters
  if (options.filterType) {
    alerts = alerts.filter((a) => a.type === options.filterType);
  }
  if (options.filterUrgency) {
    alerts = alerts.filter((a) => a.urgency === options.filterUrgency);
  }

  // Deduplicate
  const seen = new Map<string, typeof alerts[0]>();
  for (const a of alerts) {
    const key = a.type === "maintenance" ? `maint-drone-${a.entityId}` : a.id;
    const existing = seen.get(key);
    const urgencyRank: Record<AlertUrgency, number> = { critical: 0, warning: 1, info: 2 };
    if (!existing || urgencyRank[a.urgency] < urgencyRank[existing.urgency]) {
      seen.set(key, a);
    }
  }
  alerts = Array.from(seen.values());

  // Sort
  const urgencyRank: Record<AlertUrgency, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || a.daysRemaining - b.daysRemaining);

  const isLoading = certs.isLoading || drones.isLoading || maintLoading || unresolvedIssues.isLoading || pilotsLoading;
  const counts = {
    total: alerts.length,
    critical: alerts.filter((a) => a.urgency === "critical").length,
    warning: alerts.filter((a) => a.urgency === "warning").length,
    info: alerts.filter((a) => a.urgency === "info").length,
    certification: alerts.filter((a) => a.type === "certification").length,
    maintenance: alerts.filter((a) => a.type === "maintenance").length,
    postflight_issue: alerts.filter((a) => a.type === "postflight_issue").length,
    pilot_currency: alerts.filter((a) => a.type === "pilot_currency").length,
  };

  return { alerts, isLoading, counts };
}
