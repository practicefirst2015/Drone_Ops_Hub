import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { differenceInDays } from "date-fns";

/** How many days without a flight before a pilot is considered "not current" */
const CURRENCY_THRESHOLD_DAYS = 90;
/** Warning threshold */
const CURRENCY_WARNING_DAYS = 60;

export interface MissionCertGap {
  missionId: string;
  missionTitle: string;
  missionDate: string | null;
  requiredSkillId: string;
  requiredSkillName: string;
}

export interface RecentMission {
  missionId: string;
  missionTitle: string;
  missionDate: string | null;
  missionStatus: string;
  role: string;
}

export interface PilotCurrencyStatus {
  userId: string;
  fullName: string;
  totalFlights: number;
  totalHours: number;
  lastFlightDate: string | null;
  daysSinceLastFlight: number | null;
  flightsLast90Days: number;
  hoursLast90Days: number;
  currencyStatus: "current" | "warning" | "expired";
  certifications: {
    id: string;
    skillName: string;
    expiryDate: string | null;
    status: string;
    isExpired: boolean;
    isExpiringSoon: boolean;
    daysUntilExpiry: number | null;
  }[];
  recentMissions: RecentMission[];
  missionCertGaps: MissionCertGap[];
  complianceStatus: "compliant" | "warning" | "non_compliant";
  complianceReasons: string[];
}

export function usePilotCurrency() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const flightLogs = useQuery({
    queryKey: ["pilot_currency_flights", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_logs")
        .select("id, pilot_id, flight_date, flight_hours_contribution, outcome")
        .eq("organization_id", orgId!)
        .order("flight_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const members = useQuery({
    queryKey: ["pilot_currency_members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("user_id, role, profiles:user_id(full_name)")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const certs = useQuery({
    queryKey: ["pilot_currency_certs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certifications")
        .select("id, user_id, expiry_date, status, skill_id, skills(name)")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  // Mission operators: which pilots are assigned to which missions
  const missionOps = useQuery({
    queryKey: ["pilot_currency_mission_ops", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_operators")
        .select("user_id, role, mission_id, missions!inner(id, title, mission_date, status, organization_id)")
        .eq("missions.organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  // Mission certification requirements — filtered by org via missions join
  const missionCerts = useQuery({
    queryKey: ["pilot_currency_mission_certs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_certifications")
        .select("mission_id, skill_id, skills(name), missions!inner(organization_id)")
        .eq("missions.organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const pilots: PilotCurrencyStatus[] = [];

  if (members.data && flightLogs.data && certs.data) {
    // Build mission cert requirement map
    const missionCertMap = new Map<string, { skillId: string; skillName: string }[]>();
    if (missionCerts.data) {
      for (const mc of missionCerts.data as any[]) {
        const list = missionCertMap.get(mc.mission_id) || [];
        list.push({ skillId: mc.skill_id, skillName: mc.skills?.name || "Unknown" });
        missionCertMap.set(mc.mission_id, list);
      }
    }

    for (const m of members.data as any[]) {
      const pilotFlights = flightLogs.data.filter((f) => f.pilot_id === m.user_id);
      const lastFlight = pilotFlights[0];
      const daysSince = lastFlight ? differenceInDays(now, new Date(lastFlight.flight_date)) : null;

      const recentFlights = pilotFlights.filter((f) => new Date(f.flight_date) >= ninetyDaysAgo);
      const totalHours = pilotFlights.reduce((s, f) => s + (Number(f.flight_hours_contribution) || 0), 0);
      const recentHours = recentFlights.reduce((s, f) => s + (Number(f.flight_hours_contribution) || 0), 0);

      let currencyStatus: PilotCurrencyStatus["currencyStatus"] = "current";
      if (daysSince === null || daysSince >= CURRENCY_THRESHOLD_DAYS) {
        currencyStatus = "expired";
      } else if (daysSince >= CURRENCY_WARNING_DAYS) {
        currencyStatus = "warning";
      }

      const pilotCerts = (certs.data as any[])
        .filter((c) => c.user_id === m.user_id)
        .map((c) => {
          const expiryDate = c.expiry_date;
          const daysUntilExpiry = expiryDate ? differenceInDays(new Date(expiryDate), now) : null;
          const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
          return {
            id: c.id,
            skillId: c.skill_id,
            skillName: c.skills?.name || "Unknown",
            expiryDate,
            status: c.status,
            isExpired,
            isExpiringSoon,
            daysUntilExpiry,
          };
        });

      // Recent missions
      const recentMissions: RecentMission[] = [];
      if (missionOps.data) {
        for (const op of missionOps.data as any[]) {
          if (op.user_id !== m.user_id) continue;
          const mission = op.missions;
          if (!mission) continue;
          recentMissions.push({
            missionId: mission.id,
            missionTitle: mission.title,
            missionDate: mission.mission_date,
            missionStatus: mission.status,
            role: op.role,
          });
        }
      }
      recentMissions.sort((a, b) => {
        if (!a.missionDate && !b.missionDate) return 0;
        if (!a.missionDate) return 1;
        if (!b.missionDate) return -1;
        return new Date(b.missionDate).getTime() - new Date(a.missionDate).getTime();
      });

      // Mission cert gap analysis
      const activePilotCertSkillIds = new Set(
        pilotCerts.filter((c) => c.status === "active" && !c.isExpired).map((c) => c.skillId)
      );
      const missionCertGaps: MissionCertGap[] = [];
      if (missionOps.data) {
        for (const op of missionOps.data as any[]) {
          if (op.user_id !== m.user_id) continue;
          const mission = op.missions;
          if (!mission) continue;
          if (mission.status === "completed" || mission.status === "cancelled") continue;
          const requirements = missionCertMap.get(mission.id) || [];
          for (const req of requirements) {
            if (!activePilotCertSkillIds.has(req.skillId)) {
              missionCertGaps.push({
                missionId: mission.id,
                missionTitle: mission.title,
                missionDate: mission.mission_date,
                requiredSkillId: req.skillId,
                requiredSkillName: req.skillName,
              });
            }
          }
        }
      }

      const hasExpiredCert = pilotCerts.some((c) => c.isExpired);
      const hasExpiringSoonCert = pilotCerts.some((c) => c.isExpiringSoon);
      const hasCertGaps = missionCertGaps.length > 0;

      const complianceReasons: string[] = [];
      let complianceStatus: PilotCurrencyStatus["complianceStatus"] = "compliant";

      if (currencyStatus === "expired") {
        complianceStatus = "non_compliant";
        complianceReasons.push("No recent flights (90+ days)");
      } else if (currencyStatus === "warning") {
        complianceReasons.push("Flight currency lapsing");
      }

      if (hasExpiredCert) {
        complianceStatus = "non_compliant";
        const count = pilotCerts.filter((c) => c.isExpired).length;
        complianceReasons.push(`${count} expired certification${count > 1 ? "s" : ""}`);
      }

      if (hasCertGaps) {
        if (complianceStatus !== "non_compliant") complianceStatus = "warning";
        const uniqueMissions = new Set(missionCertGaps.map((g) => g.missionId)).size;
        complianceReasons.push(`Missing certs for ${uniqueMissions} mission${uniqueMissions > 1 ? "s" : ""}`);
      }

      if (hasExpiringSoonCert && complianceStatus === "compliant") {
        complianceStatus = "warning";
        const count = pilotCerts.filter((c) => c.isExpiringSoon).length;
        complianceReasons.push(`${count} cert${count > 1 ? "s" : ""} expiring soon`);
      }

      if (currencyStatus === "warning" && complianceStatus === "compliant") {
        complianceStatus = "warning";
      }

      pilots.push({
        userId: m.user_id,
        fullName: m.profiles?.full_name || "Unknown",
        totalFlights: pilotFlights.length,
        totalHours,
        lastFlightDate: lastFlight?.flight_date || null,
        daysSinceLastFlight: daysSince,
        flightsLast90Days: recentFlights.length,
        hoursLast90Days: recentHours,
        currencyStatus,
        certifications: pilotCerts,
        recentMissions,
        missionCertGaps,
        complianceStatus,
        complianceReasons,
      });
    }
  }

  // Sort
  const rank = { non_compliant: 0, warning: 1, compliant: 2 };
  pilots.sort((a, b) => rank[a.complianceStatus] - rank[b.complianceStatus]);

  const counts = {
    total: pilots.length,
    compliant: pilots.filter((p) => p.complianceStatus === "compliant").length,
    warning: pilots.filter((p) => p.complianceStatus === "warning").length,
    nonCompliant: pilots.filter((p) => p.complianceStatus === "non_compliant").length,
  };

  return {
    pilots,
    counts,
    isLoading: flightLogs.isLoading || members.isLoading || certs.isLoading || missionOps.isLoading || missionCerts.isLoading,
  };
}
