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

    // Verify caller
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

    const { lat, lon, org_id, units = "metric" } = await req.json();
    // Note: lat/lon of 0 are valid (equator / prime meridian) — check for
    // null/undefined and numeric validity, not falsiness.
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (
      lat == null || lon == null ||
      !Number.isFinite(latNum) || !Number.isFinite(lonNum) ||
      latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180
    ) {
      return new Response(JSON.stringify({ error: "valid lat and lon required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read API key from org_integrations if org_id provided, else fall back to env secret
    let apiKey = Deno.env.get("OPENWEATHER_API_KEY");
    if (org_id) {
      const { data: integration } = await supabase
        .from("organization_integrations")
        .select("credentials_encrypted, enabled")
        .eq("organization_id", org_id)
        .eq("integration_key", "openweather")
        .maybeSingle();

      if (integration?.enabled && (integration.credentials_encrypted as any)?.api_key) {
        apiKey = (integration.credentials_encrypted as any).api_key;
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenWeather not configured. Add API key in Settings > Integrations." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latNum}&lon=${lonNum}&appid=${apiKey}&units=${units}`;
    const currentRes = await fetch(currentUrl);
    if (!currentRes.ok) {
      const body = await currentRes.text();
      return new Response(JSON.stringify({ error: `OpenWeather API error: ${body}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const current = await currentRes.json();

    // 5-day forecast (3-hour intervals)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latNum}&lon=${lonNum}&appid=${apiKey}&units=${units}&cnt=8`;
    const forecastRes = await fetch(forecastUrl);
    const forecast = forecastRes.ok ? await forecastRes.json() : null;

    const windSpeed = current.wind?.speed || 0;
    const visibility = (current.visibility || 10000) / 1000; // km
    const weatherId = current.weather?.[0]?.id || 800;
    const hasPrecipitation = weatherId < 700; // codes < 700 = rain/snow/drizzle/thunderstorm
    const tempUnit = units === "metric" ? "°C" : "°F";
    const windUnit = units === "metric" ? "m/s" : "mph";
    const windLimit = units === "metric" ? 10 : 22; // m/s vs mph
    const isFlySafe = windSpeed < windLimit && visibility >= 5 && !hasPrecipitation;

    const nextPeriods = forecast?.list?.slice(0, 4).map((p: any) => ({
      time: p.dt_txt,
      temp: Math.round(p.main.temp),
      windSpeed: p.wind.speed,
      description: p.weather?.[0]?.description,
      icon: p.weather?.[0]?.icon,
    })) || [];

    return new Response(
      JSON.stringify({
        temperature: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        windSpeed: Math.round(windSpeed * 10) / 10,
        windDirection: current.wind?.deg || 0,
        visibility: Math.round(visibility * 10) / 10,
        description: current.weather?.[0]?.description || "",
        icon: current.weather?.[0]?.icon || "01d",
        weatherId,
        isFlySafe,
        flySafeReasons: [
          windSpeed >= windLimit ? `Wind ${windSpeed.toFixed(1)}${windUnit} (limit: ${windLimit}${windUnit})` : null,
          visibility < 5 ? `Visibility ${visibility.toFixed(1)}km (min: 5km)` : null,
          hasPrecipitation ? `Precipitation: ${current.weather?.[0]?.description}` : null,
        ].filter(Boolean),
        tempUnit,
        windUnit,
        forecast: nextPeriods,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-weather error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
