import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { flight_log_id } = await req.json();
    if (!flight_log_id) {
      return new Response(JSON.stringify({ error: "flight_log_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch flight log with relations
    const { data: log, error: logErr } = await supabase
      .from("flight_logs")
      .select("*, projects(id, name), missions(id, title, status, go_status, objective), drone_models(id, name, drone_manufacturers(name)), profiles!flight_logs_pilot_id_fkey(id, full_name)")
      .eq("id", flight_log_id)
      .single();

    if (logErr || !log) {
      return new Response(JSON.stringify({ error: "Flight log not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", log.organization_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch crew, issues, deliverables in parallel
    const [crewRes, issuesRes, deliverablesRes] = await Promise.all([
      supabase
        .from("flight_crew")
        .select("role, profiles:user_id(full_name)")
        .eq("flight_log_id", flight_log_id),
      supabase
        .from("postflight_issues")
        .select("title, severity, category, resolution_status, description")
        .eq("flight_log_id", flight_log_id)
        .order("severity", { ascending: false }),
      supabase
        .from("flight_log_deliverables")
        .select("deliverable_type, label, status, notes")
        .eq("flight_log_id", flight_log_id),
    ]);

    const crew = crewRes.data || [];
    const issues = issuesRes.data || [];
    const deliverables = deliverablesRes.data || [];

    const generatedDate = new Date().toISOString().split("T")[0];

    const html = buildReportHtml({ log, crew, issues, deliverables, generatedDate });

    // Upload to storage
    const safeTitle = log.title.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 40);
    const timestamp = Date.now();
    const fileName = `postflight-reports/${log.organization_id}/${safeTitle}_${timestamp}.html`;

    const htmlBlob = new Blob([html], { type: "text/html" });
    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(fileName, htmlBlob, { contentType: "text/html", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ html, url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signedData } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(fileName, 3600);

    // Save file record
    const { error: fileRecordError } = await supabase
      .from("flight_log_files")
      .insert({
        flight_log_id,
        organization_id: log.organization_id,
        file_name: `${log.title} - Postflight Report ${generatedDate}.html`,
        storage_path: fileName,
        file_size_bytes: new TextEncoder().encode(html).length,
        file_type: "postflight_report",
        generated_by: userId,
        snapshot_outcome: log.outcome,
        snapshot_duration_minutes: log.duration_minutes,
      });

    if (fileRecordError) console.error("File record error:", fileRecordError);

    return new Response(
      JSON.stringify({ url: signedData?.signedUrl || null, html, file_path: fileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Postflight report error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── HTML builder ──────────────────────────────────────────────
interface ReportParams {
  log: any;
  crew: any[];
  issues: any[];
  deliverables: any[];
  generatedDate: string;
}

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function buildReportHtml(p: ReportParams): string {
  const l = p.log;
  const pilot = l.profiles as any;
  const project = l.projects as any;
  const mission = l.missions as any;
  const drone = l.drone_models as any;
  const manufacturer = drone?.drone_manufacturers as any;

  const outcomeLabel = l.outcome?.replace(/_/g, " ").toUpperCase() || "COMPLETED";
  const outcomeColor = l.outcome === "completed" ? "#16a34a" : l.outcome === "partial" ? "#d97706" : "#dc2626";

  const crewRows = p.crew.map((c: any) =>
    `<tr><td>${esc((c.profiles as any)?.full_name || "—")}</td><td>${esc(c.role)}</td></tr>`
  ).join("") || `<tr><td colspan="2" class="muted">No additional crew assigned</td></tr>`;

  const issueRows = p.issues.map((i: any) => {
    const sevColor = i.severity === "critical" ? "#dc2626" : i.severity === "high" ? "#ea580c" : i.severity === "medium" ? "#d97706" : "#6b7280";
    return `<tr>
      <td><span style="color:${sevColor};font-weight:700;text-transform:uppercase;font-size:10px;">${esc(i.severity)}</span></td>
      <td>${esc(i.title)}</td>
      <td>${esc(i.category)}</td>
      <td>${esc(String(i.resolution_status).replace(/_/g, " "))}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" class="muted">No issues reported</td></tr>`;

  const deliverableRows = p.deliverables.map((d: any) => {
    const statusColor = d.status === "completed" ? "#16a34a" : d.status === "captured" ? "#2563eb" : d.status === "missing" ? "#dc2626" : "#d97706";
    return `<tr>
      <td>${esc(String(d.deliverable_type).replace(/_/g, " "))}</td>
      <td>${esc(d.label || "—")}</td>
      <td><span style="color:${statusColor};font-weight:600;text-transform:uppercase;font-size:10px;">${esc(String(d.status).replace(/_/g, " "))}</span></td>
      <td>${esc(d.notes || "—")}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" class="muted">No deliverables recorded</td></tr>`;

  const captured = p.deliverables.filter((d: any) => ["captured", "completed", "in_processing"].includes(d.status)).length;
  const missing = p.deliverables.filter((d: any) => d.status === "missing").length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Postflight Report — ${esc(l.title)}</title>
<style>
  @page { margin: 40px; size: letter; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', -apple-system, sans-serif;
    color: #111; padding: 48px; max-width: 820px;
    margin: 0 auto; font-size: 13px; line-height: 1.6;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 20px; border-bottom: 3px solid #111; margin-bottom: 32px; }
  .title { font-size: 28px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.2; }
  .subtitle { font-size: 11px; color: #666; margin-top: 6px; font-family: 'Courier New', monospace; letter-spacing: 0.04em; text-transform: uppercase; }
  .doc-type { font-size: 9px; background: #f0f0f0; color: #666; padding: 3px 10px;
    font-family: 'Courier New', monospace; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px; display: inline-block; }
  .outcome-badge { display: inline-block; font-size: 14px; font-weight: 700; letter-spacing: 0.1em;
    padding: 6px 20px; border: 2px solid ${outcomeColor}; color: ${outcomeColor};
    font-family: 'Courier New', monospace; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; margin-bottom: 32px;
    font-size: 12px; font-family: 'Courier New', monospace; }
  .meta-grid dt { color: #888; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }
  .meta-grid dd { margin: 0 0 8px 0; color: #222; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.12em; color: #555;
    border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 28px 0 14px;
    font-family: 'Courier New', monospace; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
    color: #888; padding: 8px 0; border-bottom: 1px solid #ddd; font-family: 'Courier New', monospace; }
  td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
  .muted { color: #999; font-style: italic; }
  .notes-block { background: #fafafa; border-left: 3px solid #ddd; padding: 12px 16px;
    font-size: 12px; line-height: 1.7; margin-bottom: 12px; white-space: pre-wrap; }
  .notes-block.empty { color: #999; font-style: italic; border-left-color: #eee; }
  .summary-bar { display: flex; gap: 24px; margin-bottom: 16px; }
  .summary-item { font-family: 'Courier New', monospace; font-size: 12px; }
  .summary-item strong { font-size: 18px; }
  .incident-section { border: 1px solid #fca5a5; background: #fef2f2; padding: 16px; margin: 16px 0; }
  .incident-section h3 { color: #dc2626; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
  .footer { margin-top: 48px; font-size: 10px; color: #aaa; text-align: center;
    font-family: 'Courier New', monospace; letter-spacing: 0.06em; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="title">${esc(l.title)}</div>
    <div class="subtitle">Postflight Report</div>
    <div class="doc-type">Completed Flight Record</div>
  </div>
  <div class="outcome-badge">${outcomeLabel}</div>
</div>

<h2>Flight Summary</h2>
<dl class="meta-grid">
  <dt>Flight Date</dt><dd>${esc(l.flight_date || "—")}</dd>
  <dt>Duration</dt><dd>${l.duration_minutes ? esc(l.duration_minutes) + " min" : "—"}</dd>
  <dt>Pilot in Command</dt><dd>${esc(pilot?.full_name || "—")}</dd>
  <dt>Aircraft</dt><dd>${manufacturer?.name ? esc(manufacturer.name) + " " : ""}${esc(drone?.name || "Not specified")}</dd>
  <dt>Project</dt><dd>${esc(project?.name || "Not linked")}</dd>
  <dt>Mission Plan</dt><dd>${esc(mission?.title || "Manual entry")}</dd>
  <dt>Launch Location</dt><dd>${esc(l.launch_location || "—")}</dd>
  <dt>Preflight Completed</dt><dd>${l.preflight_completed ? "Yes" : "No"}</dd>
</dl>

<div class="summary-bar">
  <div class="summary-item"><strong style="color:${outcomeColor}">${outcomeLabel}</strong><br>Outcome</div>
  <div class="summary-item"><strong>${l.duration_minutes || "—"}</strong><br>Minutes</div>
  <div class="summary-item"><strong>${l.flight_hours_contribution ? Number(l.flight_hours_contribution).toFixed(2) + "h" : "—"}</strong><br>Flight Hours</div>
  <div class="summary-item"><strong>${captured}/${p.deliverables.length}</strong><br>Deliverables</div>
</div>

${l.objective ? `<h2>Objective</h2><div class="notes-block">${esc(l.objective)}</div>` : ""}

<h2>Flight Crew</h2>
<table>
  <thead><tr><th>Name</th><th>Role</th></tr></thead>
  <tbody>
    <tr><td>${esc(pilot?.full_name || "—")}</td><td>Pilot in Command</td></tr>
    ${crewRows}
  </tbody>
</table>

<h2>Deliverables Captured</h2>
<table>
  <thead><tr><th>Type</th><th>Label</th><th>Status</th><th>Notes</th></tr></thead>
  <tbody>${deliverableRows}</tbody>
</table>
${missing > 0 ? `<div style="color:#dc2626;font-size:11px;font-family:'Courier New',monospace;margin-top:8px;">⚠ ${missing} deliverable(s) marked as missing</div>` : ""}

${p.issues.length > 0 ? `
<h2>Issues & Incidents</h2>
<div class="incident-section">
  <h3>⚠ ${p.issues.length} Issue(s) Reported</h3>
  <table>
    <thead><tr><th>Severity</th><th>Issue</th><th>Category</th><th>Status</th></tr></thead>
    <tbody>${issueRows}</tbody>
  </table>
</div>
` : `<h2>Issues & Incidents</h2><div class="notes-block empty">No issues or incidents reported for this flight.</div>`}

<h2>Operational Notes</h2>
${l.weather_summary ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Weather</h3><div class="notes-block">${esc(l.weather_summary)}</div>` : ""}
${l.airspace_notes ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Airspace</h3><div class="notes-block">${esc(l.airspace_notes)}</div>` : ""}
${l.flight_area_summary ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Flight Area</h3><div class="notes-block">${esc(l.flight_area_summary)}</div>` : ""}
${l.battery_equipment_notes ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Battery & Equipment</h3><div class="notes-block">${esc(l.battery_equipment_notes)}</div>` : ""}
${l.postflight_notes ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Post-Flight Notes</h3><div class="notes-block">${esc(l.postflight_notes)}</div>` : ""}
${l.incidents ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Incident Notes</h3><div class="notes-block" style="border-left-color:#fca5a5;">${esc(l.incidents)}</div>` : ""}
${!l.weather_summary && !l.airspace_notes && !l.flight_area_summary && !l.postflight_notes && !l.incidents ? `<div class="notes-block empty">No operational notes recorded.</div>` : ""}

<div class="footer">Postflight Report generated ${p.generatedDate} · Snapshot at time of generation</div>
</body>
</html>`;
}
