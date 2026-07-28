// Voice → structured flight log.
//
// Takes a spoken narration of a completed flight, transcribes it (OpenAI
// Whisper), then maps it onto the flight_logs form fields (gpt-4o-mini),
// resolving project / mission / drone / pilot names against this org's actual
// records. Returns the transcript plus a proposed set of fields.
//
// Nothing is written to the database here — the app prefills the normal flight
// log form so the pilot reviews and confirms before saving. Flight logs are
// operational records; a human check stays mandatory.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ALLOW_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB ≈ 20+ min of speech

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return json(
        { error: "Voice input isn't configured yet. Add an OPENAI_API_KEY secret in Supabase → Edge Functions → Secrets." },
        503,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const { audio_base64, mime_type, organization_id } = await req.json();
    if (!audio_base64 || !organization_id) {
      return json({ error: "audio_base64 and organization_id are required" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Caller must be a staff member of this org
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", organization_id)
      .maybeSingle();
    if (!membership || membership.role === "viewer") return json({ error: "Forbidden" }, 403);

    const audio = base64ToBytes(audio_base64);
    if (audio.byteLength === 0) return json({ error: "Empty recording" }, 400);
    if (audio.byteLength > MAX_AUDIO_BYTES) {
      return json({ error: "Recording is too long. Keep it under about 20 minutes." }, 413);
    }

    // ── 1. Transcribe ────────────────────────────────────────────────────────
    const mime = typeof mime_type === "string" && mime_type ? mime_type : "audio/webm";
    const ext = mime.includes("mp4") || mime.includes("m4a") ? "m4a"
      : mime.includes("ogg") ? "ogg"
      : mime.includes("wav") ? "wav"
      : mime.includes("mpeg") || mime.includes("mp3") ? "mp3"
      : "webm";

    const fd = new FormData();
    fd.append("file", new Blob([audio], { type: mime }), `flight.${ext}`);
    fd.append("model", "whisper-1");
    fd.append("language", "en");
    fd.append(
      "prompt",
      "Drone flight operations debrief. Terms: Mavic, Matrice, Autel, Skydio, Wingtra, RTK, AGL, thermal, orthomosaic, LiDAR, multispectral, VLOS, BVLOS, Part 107, NOTAM, TFR, preflight, RTH, gimbal, payload.",
    );

    const trRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: fd,
    });
    if (!trRes.ok) {
      const detail = await trRes.text();
      console.error("Whisper error:", detail);
      return json({ error: "Could not transcribe the recording. Please try again." }, 502);
    }
    const transcript: string = (await trRes.json()).text ?? "";
    if (!transcript.trim()) {
      return json({ error: "Nothing was heard in that recording. Try again, closer to the mic." }, 422);
    }

    // ── 2. Load org context so names can resolve to real records ─────────────
    const [projectsRes, missionsRes, dronesRes, membersRes] = await Promise.all([
      supabase.from("projects").select("id, name").eq("organization_id", organization_id).order("name").limit(200),
      supabase.from("missions").select("id, title, project_id, mission_date").eq("organization_id", organization_id).order("mission_date", { ascending: false }).limit(200),
      supabase.from("drone_models").select("id, name, drone_manufacturers(name)").eq("organization_id", organization_id).order("name").limit(200),
      supabase.from("memberships").select("user_id, profiles:user_id(full_name)").eq("organization_id", organization_id).limit(200),
    ]);

    const projects = (projectsRes.data ?? []).map((p: any) => ({ id: p.id, name: p.name }));
    const missions = (missionsRes.data ?? []).map((m: any) => ({ id: m.id, title: m.title, project_id: m.project_id, date: m.mission_date }));
    const drones = (dronesRes.data ?? []).map((d: any) => ({
      id: d.id,
      name: [d.drone_manufacturers?.name, d.name].filter(Boolean).join(" "),
    }));
    const people = (membersRes.data ?? []).map((m: any) => ({ id: m.user_id, name: m.profiles?.full_name || "" }));

    const today = new Date().toISOString().split("T")[0];

    const system = [
      "You convert a drone pilot's spoken flight debrief into structured flight-log fields.",
      "Return ONLY JSON matching the requested schema. Never invent facts that were not spoken.",
      "If something was not mentioned, use null (or omit it). Do not guess durations, outcomes, or equipment.",
      "Match project, mission, drone and pilot names against the provided lists, tolerating loose or partial speech (e.g. 'the Riverside job' -> the Riverside project, 'Mavic thermal' -> DJI Mavic 3T). If no confident match exists, return null for that id and put what was said in the matching *_spoken field.",
      `Today is ${today}. Resolve relative dates ('today', 'yesterday', 'this morning') against it. Dates use YYYY-MM-DD.`,
      "Times: if a clock time was spoken (e.g. '9:15'), return HH:MM 24-hour. Assume the flight date unless another date was clearly stated.",
      "duration_minutes is an integer. If launch and landing times are both given, you may compute it.",
      "outcome must be exactly one of: completed, partial, aborted, cancelled. Default to completed only if the pilot clearly indicated a normal, finished flight.",
      "Put anything the pilot said that doesn't fit a specific field into postflight_notes verbatim-ish. Never drop mention of incidents, damage, or near-misses — those belong in 'incidents'.",
    ].join(" ");

    const schemaHint = {
      title: "short descriptive flight title, e.g. 'Roof inspection - north elevation'",
      flight_date: "YYYY-MM-DD or null",
      project_id: "id from projects list or null",
      project_spoken: "what the pilot called the project, or null",
      mission_id: "id from missions list or null",
      mission_spoken: "string or null",
      drone_model_id: "id from drones list or null",
      drone_spoken: "string or null",
      pilot_id: "id from people list or null",
      pilot_spoken: "string or null",
      outcome: "completed | partial | aborted | cancelled",
      duration_minutes: "integer or null",
      launch_time: "HH:MM or null",
      landing_time: "HH:MM or null",
      launch_location: "string or null",
      objective: "string or null",
      weather_summary: "string or null",
      airspace_notes: "string or null",
      incidents: "string or null - anything abnormal, damage, near-miss",
      deliverables_summary: "string or null - what imagery/data was captured",
      battery_equipment_notes: "string or null",
      flight_area_summary: "string or null",
      postflight_notes: "string or null - everything else worth keeping",
      preflight_completed: "true only if the pilot said preflight checks were done, else false",
      confidence_notes: "one short sentence naming anything you were unsure about, or null",
    };

    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              `TRANSCRIPT:\n${transcript}`,
              `\nPROJECTS:\n${JSON.stringify(projects)}`,
              `\nMISSIONS:\n${JSON.stringify(missions)}`,
              `\nDRONES:\n${JSON.stringify(drones)}`,
              `\nPEOPLE:\n${JSON.stringify(people)}`,
              `\nRETURN JSON with exactly these keys:\n${JSON.stringify(schemaHint, null, 2)}`,
            ].join("\n"),
          },
        ],
      }),
    });

    if (!chatRes.ok) {
      const detail = await chatRes.text();
      console.error("Extraction error:", detail);
      // Transcript still useful on its own
      return json({ transcript, fields: null, warning: "Transcribed, but could not fill the form automatically." });
    }

    const chatJson = await chatRes.json();
    let fields: Record<string, unknown> | null = null;
    try {
      fields = JSON.parse(chatJson.choices?.[0]?.message?.content ?? "{}");
    } catch {
      fields = null;
    }

    // Guard: never return ids that aren't real records for this org.
    if (fields) {
      const valid = (list: { id: string }[], v: unknown) =>
        typeof v === "string" && list.some((x) => x.id === v) ? v : null;
      fields.project_id = valid(projects, fields.project_id);
      fields.mission_id = valid(missions, fields.mission_id);
      fields.drone_model_id = valid(drones, fields.drone_model_id);
      fields.pilot_id = valid(people, fields.pilot_id);
      const outcomes = ["completed", "partial", "aborted", "cancelled"];
      if (!outcomes.includes(String(fields.outcome))) fields.outcome = "completed";
    }

    return json({ transcript, fields });
  } catch (err) {
    console.error("voice-flight-log error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
