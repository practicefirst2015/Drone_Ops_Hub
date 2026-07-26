import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, subDays, format, parseISO } from "date-fns";

export function useOperationsAnalytics() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["analytics_operations", orgId],
    queryFn: async () => {
      const [missionsRes, flightLogsRes] = await Promise.all([
        supabase.from("missions").select("id, status, go_status, preflight_status, mission_date, created_at, updated_at").eq("organization_id", orgId!),
        supabase.from("flight_logs").select("id, outcome, duration_minutes, flight_date, mission_id, created_at").eq("organization_id", orgId!),
      ]);
      if (missionsRes.error) throw missionsRes.error;
      if (flightLogsRes.error) throw flightLogsRes.error;

      const missions = missionsRes.data || [];
      const flights = flightLogsRes.data || [];

      const completed = missions.filter(m => m.status === "completed");
      const aborted = flights.filter(f => f.outcome === "aborted");
      const totalFlights = flights.length;
      const successRate = totalFlights > 0 ? ((totalFlights - aborted.length) / totalFlights) * 100 : 0;

      // Readiness delays: missions that sat in draft/pending before being approved
      const readinessDelays = missions
        .filter(m => m.mission_date && m.created_at)
        .map(m => differenceInDays(new Date(m.mission_date!), new Date(m.created_at)));
      const avgReadinessDelay = readinessDelays.length > 0 ? readinessDelays.reduce((a, b) => a + b, 0) / readinessDelays.length : 0;

      // Monthly mission counts (last 6 months)
      const now = new Date();
      const monthlyMissions: Record<string, { total: number; completed: number; failed: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = subDays(now, i * 30);
        const key = format(d, "MMM yyyy");
        monthlyMissions[key] = { total: 0, completed: 0, failed: 0 };
      }
      missions.forEach(m => {
        const key = m.mission_date ? format(parseISO(m.mission_date), "MMM yyyy") : null;
        if (key && monthlyMissions[key]) {
          monthlyMissions[key].total++;
          if (m.status === "completed") monthlyMissions[key].completed++;
          if (m.status === "cancelled") monthlyMissions[key].failed++;
        }
      });

      // Outcome breakdown
      const outcomeMap: Record<string, number> = {};
      flights.forEach(f => {
        outcomeMap[f.outcome] = (outcomeMap[f.outcome] || 0) + 1;
      });

      // Status breakdown
      const statusMap: Record<string, number> = {};
      missions.forEach(m => {
        statusMap[m.status] = (statusMap[m.status] || 0) + 1;
      });

      return {
        totalMissions: missions.length,
        completedMissions: completed.length,
        totalFlights,
        successRate: Math.round(successRate),
        avgReadinessDelay: Math.round(avgReadinessDelay * 10) / 10,
        monthlyData: Object.entries(monthlyMissions).map(([month, v]) => ({ month, ...v })),
        outcomeBreakdown: Object.entries(outcomeMap).map(([name, value]) => ({ name, value })),
        statusBreakdown: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
      };
    },
    enabled: !!orgId,
  });
}

export function useFleetAnalytics() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["analytics_fleet", orgId],
    queryFn: async () => {
      const [dronesRes, maintenanceRes, flightsRes] = await Promise.all([
        supabase.from("drones").select("id, name, status, flight_hours, next_maintenance").eq("organization_id", orgId!),
        supabase.from("maintenance_events").select("id, drone_id, event_type, performed_at, cost").eq("organization_id", orgId!),
        supabase.from("flight_logs").select("id, drone_id, duration_minutes").eq("organization_id", orgId!),
      ]);
      if (dronesRes.error) throw dronesRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;
      if (flightsRes.error) throw flightsRes.error;

      const drones = dronesRes.data || [];
      const maintenance = maintenanceRes.data || [];
      const flights = flightsRes.data || [];

      // Drone utilization
      const droneFlightCounts: Record<string, { name: string; flights: number; hours: number }> = {};
      drones.forEach(d => {
        droneFlightCounts[d.id] = { name: d.name, flights: 0, hours: Number(d.flight_hours || 0) };
      });
      flights.forEach(f => {
        if (f.drone_id && droneFlightCounts[f.drone_id]) {
          droneFlightCounts[f.drone_id].flights++;
        }
      });

      const topDrones = Object.values(droneFlightCounts)
        .sort((a, b) => b.flights - a.flights)
        .slice(0, 10);

      // Status breakdown
      const statusMap: Record<string, number> = {};
      drones.forEach(d => {
        statusMap[d.status] = (statusMap[d.status] || 0) + 1;
      });

      // Maintenance frequency by type
      const maintenanceTypeMap: Record<string, number> = {};
      maintenance.forEach(m => {
        maintenanceTypeMap[m.event_type] = (maintenanceTypeMap[m.event_type] || 0) + 1;
      });

      const totalMaintenanceCost = maintenance.reduce((s, m) => s + Number(m.cost || 0), 0);

      return {
        totalDrones: drones.length,
        totalMaintenanceEvents: maintenance.length,
        totalMaintenanceCost,
        avgFlightHours: drones.length > 0 ? Math.round(drones.reduce((s, d) => s + Number(d.flight_hours || 0), 0) / drones.length) : 0,
        topDrones,
        statusBreakdown: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
        maintenanceByType: Object.entries(maintenanceTypeMap).map(([name, value]) => ({ name, value })),
      };
    },
    enabled: !!orgId,
  });
}

export function usePersonnelAnalytics() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["analytics_personnel", orgId],
    queryFn: async () => {
      const [membersRes, flightsRes, certsRes, skillsRes] = await Promise.all([
        supabase.from("memberships").select("user_id, role, profiles(id, full_name)").eq("organization_id", orgId!),
        supabase.from("flight_logs").select("id, pilot_id, duration_minutes, flight_date").eq("organization_id", orgId!),
        supabase.from("certifications").select("id, user_id, skill_id, status, expiry_date").eq("organization_id", orgId!),
        supabase.from("skills").select("id").eq("organization_id", orgId!),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (flightsRes.error) throw flightsRes.error;
      if (certsRes.error) throw certsRes.error;
      if (skillsRes.error) throw skillsRes.error;

      const members = membersRes.data || [];
      const flights = flightsRes.data || [];
      const certs = certsRes.data || [];
      const skills = skillsRes.data || [];

      // Pilot stats
      const pilotStats: Record<string, { name: string; hours: number; missions: number }> = {};
      members.forEach(m => {
        const profile = m.profiles as any;
        if (profile) {
          pilotStats[m.user_id] = { name: profile.full_name || "Unknown", hours: 0, missions: 0 };
        }
      });
      flights.forEach(f => {
        if (pilotStats[f.pilot_id]) {
          pilotStats[f.pilot_id].missions++;
          pilotStats[f.pilot_id].hours += Number(f.duration_minutes || 0) / 60;
        }
      });

      const pilotLeaderboard = Object.entries(pilotStats)
        .map(([id, v]) => ({ id, ...v, hours: Math.round(v.hours * 10) / 10 }))
        .filter(p => p.missions > 0)
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 10);

      // Certification coverage
      const activeCerts = certs.filter(c => c.status === "active");
      const expiredCerts = certs.filter(c => c.status === "expired" || (c.expiry_date && new Date(c.expiry_date) < new Date()));
      const totalSkills = skills.length;
      const pilotsWithCerts = new Set(activeCerts.map(c => c.user_id)).size;
      const totalPilots = members.filter(m => m.role === "pilot" || m.role === "manager" || m.role === "owner" || m.role === "admin").length;
      const certCoverage = totalPilots > 0 && totalSkills > 0
        ? Math.round((activeCerts.length / (totalPilots * totalSkills)) * 100)
        : 0;

      return {
        totalMembers: members.length,
        totalPilots,
        pilotsWithCerts,
        certCoverage: Math.min(certCoverage, 100),
        activeCerts: activeCerts.length,
        expiredCerts: expiredCerts.length,
        pilotLeaderboard,
      };
    },
    enabled: !!orgId,
  });
}

export function useProjectAnalytics() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ["analytics_projects", orgId],
    queryFn: async () => {
      const [projectsRes, deliverablesRes, invoicesRes] = await Promise.all([
        supabase.from("projects").select("id, name, status, created_at, updated_at").eq("organization_id", orgId!),
        supabase.from("project_deliverables").select("id, project_id, status, created_at, updated_at").eq("organization_id", orgId!),
        supabase.from("invoices").select("id, status, amount, issued_date, due_date, created_at").eq("organization_id", orgId!),
      ]);
      if (projectsRes.error) throw projectsRes.error;
      if (deliverablesRes.error) throw deliverablesRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      const projects = projectsRes.data || [];
      const deliverables = deliverablesRes.data || [];
      const invoices = invoicesRes.data || [];

      // Average project duration (created_at to updated_at for completed)
      const completedProjects = projects.filter(p => p.status === "complete");
      const durations = completedProjects.map(p => differenceInDays(new Date(p.updated_at), new Date(p.created_at)));
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      // Status breakdown
      const statusMap: Record<string, number> = {};
      projects.forEach(p => {
        statusMap[p.status] = (statusMap[p.status] || 0) + 1;
      });

      // Deliverable completion
      const completedDeliverables = deliverables.filter(d => d.status === "completed" || d.status === "captured");
      const deliverableRate = deliverables.length > 0 ? Math.round((completedDeliverables.length / deliverables.length) * 100) : 0;

      // Invoice payment trends
      const invoiceStatusMap: Record<string, number> = {};
      invoices.forEach(i => {
        invoiceStatusMap[i.status] = (invoiceStatusMap[i.status] || 0) + 1;
      });
      const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
      const paidInvoices = invoices.filter(i => i.status === "paid");
      const totalPaid = paidInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
      const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

      return {
        totalProjects: projects.length,
        completedProjects: completedProjects.length,
        avgDuration,
        deliverableRate,
        totalDeliverables: deliverables.length,
        completedDeliverables: completedDeliverables.length,
        statusBreakdown: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
        invoiceStatusBreakdown: Object.entries(invoiceStatusMap).map(([name, value]) => ({ name, value })),
        totalInvoiced,
        totalPaid,
        collectionRate,
      };
    },
    enabled: !!orgId,
  });
}
