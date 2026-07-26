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

    const { mission_id } = await req.json();
    if (!mission_id) {
      return new Response(JSON.stringify({ error: "mission_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch mission with project
    const { data: mission, error: mErr } = await supabase
      .from("missions")
      .select("*, projects(id, name, status, location_name, latitude, longitude)")
      .eq("id", mission_id)
      .single();

    if (mErr || !mission) {
      return new Response(JSON.stringify({ error: "Mission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", mission.organization_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch operators, drones, skills, checklist in parallel
    const [operatorsRes, dronesRes, skillsRes, checklistRes] = await Promise.all([
      supabase
        .from("mission_operators")
        .select("role, profiles:user_id(full_name)")
        .eq("mission_id", mission_id),
      supabase
        .from("mission_drone_models")
        .select("drone_models:drone_model_id(name, category)")
        .eq("mission_id", mission_id),
      supabase
        .from("mission_skills")
        .select("skills:skill_id(name)")
        .eq("mission_id", mission_id),
      supabase
        .from("preflight_checklist_items")
        .select("label, is_critical, is_auto, manual_checked, auto_status, override_note")
        .eq("mission_id", mission_id),
    ]);

    const operators = operatorsRes.data || [];
    const drones = dronesRes.data || [];
    const skills = skillsRes.data || [];
    const checklist = checklistRes.data || [];

    const generatedDate = new Date().toISOString().split("T")[0];

    const html = buildBriefHtml({
      mission,
      operators,
      drones,
      skills,
      checklist,
      generatedDate,
    });

    // Upload to storage
    const safeTitle = mission.title.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 40);
    const timestamp = Date.now();
    const fileName = `mission-briefs/${mission.organization_id}/${safeTitle}_${timestamp}.html`;

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
      .from("mission_files")
      .insert({
        mission_id,
        organization_id: mission.organization_id,
        file_name: `${mission.title} - Brief ${generatedDate}.html`,
        storage_path: fileName,
        file_size_bytes: new TextEncoder().encode(html).length,
        file_type: "brief",
        generated_by: userId,
        snapshot_go_status: mission.go_status,
        snapshot_preflight_status: mission.preflight_status,
      });

    if (fileRecordError) console.error("File record error:", fileRecordError);

    return new Response(
      JSON.stringify({ url: signedData?.signedUrl || null, html, file_path: fileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Brief generation error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── HTML builder ──────────────────────────────────────────────
interface BriefParams {
  mission: any;
  operators: any[];
  drones: any[];
  skills: any[];
  checklist: any[];
  generatedDate: string;
}

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function buildBriefHtml(p: BriefParams): string {
  const m = p.mission;
  const proj = m.projects;

  const goLabel = m.go_status === "go" ? "GO" : m.go_status === "no_go" ? "NO-GO" : "PENDING";
  const goColor = m.go_status === "go" ? "#16a34a" : m.go_status === "no_go" ? "#dc2626" : "#d97706";

  const preflightLabel = m.preflight_status?.replace(/_/g, " ").toUpperCase() || "NOT STARTED";

  const operatorRows = p.operators.map((o: any) =>
    `<tr><td>${esc((o.profiles as any)?.full_name || "—")}</td><td>${esc(o.role)}</td></tr>`
  ).join("") || `<tr><td colspan="2" class="muted">No operators assigned</td></tr>`;

  const droneRows = p.drones.map((d: any) =>
    `<tr><td>${esc((d.drone_models as any)?.name || "—")}</td><td>${esc((d.drone_models as any)?.category || "—")}</td></tr>`
  ).join("") || `<tr><td colspan="2" class="muted">No drones assigned</td></tr>`;

  const skillTags = p.skills.map((s: any) =>
    `<span class="tag">${esc((s.skills as any)?.name || "—")}</span>`
  ).join("") || `<span class="muted">None specified</span>`;

  const checklistRows = p.checklist.map((c: any) => {
    const passed = c.override_note ? true : c.is_auto ? c.auto_status === "ready" : c.manual_checked;
    const icon = passed ? "✓" : "✗";
    const cls = passed ? "pass" : "fail";
    return `<tr class="${cls}"><td>${icon}</td><td>${esc(c.label)}</td><td>${c.is_critical ? "Critical" : "Standard"}</td><td>${esc(c.override_note || "—")}</td></tr>`;
  }).join("") || `<tr><td colspan="4" class="muted">No checklist items initialized</td></tr>`;

  const totalChecks = p.checklist.length;
  const passedChecks = p.checklist.filter((c: any) =>
    c.override_note ? true : c.is_auto ? c.auto_status === "ready" : c.manual_checked
  ).length;

  const coords = (m.latitude && m.longitude) ? `${Number(m.latitude).toFixed(6)}, ${Number(m.longitude).toFixed(6)}` : "Not set";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mission Brief — ${esc(m.title)}</title>
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
  .go-badge { display: inline-block; font-size: 14px; font-weight: 700; letter-spacing: 0.1em;
    padding: 6px 20px; border: 2px solid ${goColor}; color: ${goColor};
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
  .pass td:first-child { color: #16a34a; font-weight: 700; }
  .fail td:first-child { color: #dc2626; font-weight: 700; }
  .tag { display: inline-block; font-size: 11px; padding: 2px 10px; border: 1px solid #ccc;
    margin: 2px 4px 2px 0; font-family: 'Courier New', monospace; }
  .notes-block { background: #fafafa; border-left: 3px solid #ddd; padding: 12px 16px;
    font-size: 12px; line-height: 1.7; margin-bottom: 12px; white-space: pre-wrap; }
  .notes-block.empty { color: #999; font-style: italic; border-left-color: #eee; }
  .summary-bar { display: flex; gap: 24px; margin-bottom: 16px; }
  .summary-item { font-family: 'Courier New', monospace; font-size: 12px; }
  .summary-item strong { font-size: 18px; }
  .footer { margin-top: 48px; font-size: 10px; color: #aaa; text-align: center;
    font-family: 'Courier New', monospace; letter-spacing: 0.06em; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="title">${esc(m.title)}</div>
    <div class="subtitle">Mission Brief</div>
  </div>
  <div class="go-badge">${goLabel}</div>
</div>

<h2>Mission Overview</h2>
<dl class="meta-grid">
  <dt>Project</dt><dd>${esc(proj?.name || "—")}</dd>
  <dt>Mission Date</dt><dd>${esc(m.mission_date || "Not scheduled")}</dd>
  <dt>Launch Location</dt><dd>${esc(m.launch_location || "Not specified")}</dd>
  <dt>Coordinates</dt><dd>${esc(coords)}</dd>
  <dt>Status</dt><dd>${esc(String(m.status ?? "").replace(/_/g, " ").toUpperCase())}</dd>
  <dt>Est. Duration</dt><dd>${m.flight_duration_estimate_min ? esc(m.flight_duration_estimate_min) + " min" : "—"}</dd>
</dl>

<h2>Mission Objective</h2>
<div class="notes-block ${!m.objective ? 'empty' : ''}">${esc(m.objective || "No objective specified")}</div>

<h2>Operational Plan</h2>
<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Assigned Operators</h3>
<table>
  <thead><tr><th>Name</th><th>Role</th></tr></thead>
  <tbody>${operatorRows}</tbody>
</table>

<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Assigned Drones</h3>
<table>
  <thead><tr><th>Model</th><th>Category</th></tr></thead>
  <tbody>${droneRows}</tbody>
</table>

<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Required Skills</h3>
<div style="margin-bottom:16px;">${skillTags}</div>

${m.planned_flight_zone ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Planned Flight Zone</h3><div class="notes-block">${esc(m.planned_flight_zone)}</div>` : ""}
${m.target_area ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Target Area</h3><div class="notes-block">${esc(m.target_area)}</div>` : ""}

<h2>Safety & Readiness</h2>
<div class="summary-bar">
  <div class="summary-item"><strong style="color:${goColor}">${goLabel}</strong><br>Go Status</div>
  <div class="summary-item"><strong>${preflightLabel}</strong><br>Preflight</div>
  <div class="summary-item"><strong>${passedChecks}/${totalChecks}</strong><br>Checks Passed</div>
</div>

<table>
  <thead><tr><th style="width:30px">✓</th><th>Check</th><th>Priority</th><th>Override Note</th></tr></thead>
  <tbody>${checklistRows}</tbody>
</table>

${m.risk_notes ? `<h3 style="font-size:11px;color:#666;margin:16px 0 8px;">Risk Notes</h3><div class="notes-block">${esc(m.risk_notes)}</div>` : ""}

<h2>Additional Notes</h2>
${m.altitude_notes ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Altitude Notes</h3><div class="notes-block">${esc(m.altitude_notes)}</div>` : ""}
<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Weather Notes</h3>
<div class="notes-block ${!m.weather_notes ? 'empty' : ''}">${esc(m.weather_notes || "No weather notes recorded. Review conditions before flight.")}</div>
<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Airspace Notes</h3>
<div class="notes-block ${!m.airspace_notes ? 'empty' : ''}">${esc(m.airspace_notes || "No airspace notes recorded. Verify airspace authorization before flight.")}</div>
${m.readiness_notes ? `<h3 style="font-size:11px;color:#666;margin:12px 0 8px;">Readiness Notes</h3><div class="notes-block">${esc(m.readiness_notes)}</div>` : ""}

<div class="footer">Mission Brief generated ${p.generatedDate} · Snapshot at time of generation</div>
</body>
</html>`;
}
