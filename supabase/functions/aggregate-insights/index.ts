import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ALLOW_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get opted-in organizations
    const { data: optedIn, error: optErr } = await supabase
      .from("organization_settings")
      .select("organization_id")
      .eq("data_insights_opt_in", true);

    if (optErr) throw optErr;

    const orgIds = (optedIn || []).map((r: any) => r.organization_id);

    if (orgIds.length < 3) {
      // Require minimum 3 orgs for meaningful anonymized data
      return new Response(
        JSON.stringify({
          available: false,
          reason: "insufficient_participants",
          minimumRequired: 3,
          currentParticipants: orgIds.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate missions across opted-in orgs
    const { data: missions, error: mErr } = await supabase
      .from("missions")
      .select("status, flight_duration_estimate_min, mission_date")
      .in("organization_id", orgIds);
    if (mErr) throw mErr;

    // Aggregate flight logs
    const { data: flights, error: fErr } = await supabase
      .from("flight_logs")
      .select("outcome, duration_minutes, flight_date")
      .in("organization_id", orgIds);
    if (fErr) throw fErr;

    // Aggregate drones (model types)
    const { data: drones, error: dErr } = await supabase
      .from("drones")
      .select("model, status, flight_hours")
      .in("organization_id", orgIds);
    if (dErr) throw dErr;

    // Aggregate postflight issues for inspection trends
    const { data: issues, error: iErr } = await supabase
      .from("postflight_issues")
      .select("severity, status, category")
      .in("organization_id", orgIds);
    if (iErr) throw iErr;

    // Calculate anonymized metrics
    const totalMissions = (missions || []).length;
    const completedMissions = (missions || []).filter((m: any) => m.status === "completed").length;
    const missionSuccessRate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

    const totalFlights = (flights || []).length;
    const durations = (flights || []).filter((f: any) => f.duration_minutes).map((f: any) => Number(f.duration_minutes));
    const avgFlightDuration = durations.length > 0 ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;
    const medianFlightDuration = durations.length > 0 ? durations.sort((a: number, b: number) => a - b)[Math.floor(durations.length / 2)] : 0;

    // Flight outcome distribution
    const outcomeMap: Record<string, number> = {};
    (flights || []).forEach((f: any) => {
      outcomeMap[f.outcome] = (outcomeMap[f.outcome] || 0) + 1;
    });
    const outcomeDistribution = Object.entries(outcomeMap).map(([name, value]) => ({
      name,
      percentage: totalFlights > 0 ? Math.round((value / totalFlights) * 100) : 0,
    }));

    // Drone model popularity (top 10, anonymized counts)
    const modelMap: Record<string, number> = {};
    (drones || []).forEach((d: any) => {
      modelMap[d.model] = (modelMap[d.model] || 0) + 1;
    });
    const popularModels = Object.entries(modelMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Fleet avg flight hours
    const allHours = (drones || []).map((d: any) => Number(d.flight_hours || 0));
    const avgFleetHours = allHours.length > 0 ? Math.round(allHours.reduce((a: number, b: number) => a + b, 0) / allHours.length) : 0;

    // Inspection trends (severity distribution)
    const severityMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};
    const totalIssues = (issues || []).length;
    (issues || []).forEach((i: any) => {
      severityMap[i.severity] = (severityMap[i.severity] || 0) + 1;
      if (i.category) categoryMap[i.category] = (categoryMap[i.category] || 0) + 1;
    });
    const severityDistribution = Object.entries(severityMap).map(([name, value]) => ({
      name,
      percentage: totalIssues > 0 ? Math.round((value / totalIssues) * 100) : 0,
    }));
    const topIssueCategories = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Resolution rate
    const resolvedIssues = (issues || []).filter((i: any) => i.status === "resolved").length;
    const issueResolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    const insights = {
      available: true,
      participatingOrganizations: orgIds.length,
      generatedAt: new Date().toISOString(),
      missions: {
        totalAcrossIndustry: totalMissions,
        successRate: missionSuccessRate,
      },
      flights: {
        totalAcrossIndustry: totalFlights,
        avgDurationMinutes: avgFlightDuration,
        medianDurationMinutes: medianFlightDuration,
        outcomeDistribution,
      },
      fleet: {
        totalDronesTracked: (drones || []).length,
        avgFlightHoursPerDrone: avgFleetHours,
        popularModels,
      },
      inspections: {
        totalIssuesReported: totalIssues,
        resolutionRate: issueResolutionRate,
        severityDistribution,
        topIssueCategories,
      },
    };

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
