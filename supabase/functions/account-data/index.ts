// Account data rights: export (GDPR Art. 20) and deletion (GDPR Art. 17 / CCPA).
//
// POST { action: "export" }  -> JSON bundle of everything tied to the caller
// POST { action: "delete", confirm_email } -> irreversibly removes the account
//
// Deletion rules that matter:
//  - If the caller is the sole OWNER of an org that still has other members,
//    deletion is refused. Removing them would orphan the organisation and its
//    data. They must transfer ownership or remove the members first.
//  - Orgs where the caller is the only member are deleted outright (cascades
//    remove projects, missions, flight logs, invoices, files metadata).
//  - Storage objects for those orgs are removed on a best-effort basis.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const userId = claimsData.claims.sub as string;
    const userEmail = String(claimsData.claims.email ?? "");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, confirm_email } = await req.json();

    // ── EXPORT ───────────────────────────────────────────────────────────────
    if (action === "export") {
      const { data: memberships } = await supabase
        .from("memberships")
        .select("organization_id, role, created_at, organizations(name, slug)")
        .eq("user_id", userId);

      const orgIds = (memberships ?? []).map((m: any) => m.organization_id);

      const pull = async (table: string, column = "organization_id") => {
        if (orgIds.length === 0) return [];
        const { data } = await supabase.from(table).select("*").in(column, orgIds);
        return data ?? [];
      };

      const [profile, roles, userSkills, certs] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", userId),
        supabase.from("user_skills").select("*").eq("user_id", userId),
        supabase.from("certifications").select("*").eq("user_id", userId),
      ]);

      const bundle = {
        exported_at: new Date().toISOString(),
        account: { id: userId, email: userEmail },
        profile: profile.data ?? null,
        app_roles: roles.data ?? [],
        memberships: memberships ?? [],
        my_skills: userSkills.data ?? [],
        my_certifications: certs.data ?? [],
        organization_data: {
          note: "Records from organisations you belong to. Shared with co-members.",
          organizations: await pull("organizations", "id"),
          clients: await pull("clients"),
          projects: await pull("projects"),
          missions: await pull("missions"),
          flight_logs: await pull("flight_logs"),
          invoices: await pull("invoices"),
          drones: await pull("drones"),
          drone_models: await pull("drone_models"),
          batteries: await pull("batteries"),
          maintenance_events: await pull("maintenance_events"),
          postflight_issues: await pull("postflight_issues"),
          activity_logs: await pull("activity_logs"),
        },
      };

      return json(bundle);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (action === "delete") {
      if (!confirm_email || String(confirm_email).trim().toLowerCase() !== userEmail.toLowerCase()) {
        return json({ error: "Type your email address exactly to confirm deletion." }, 400);
      }

      const { data: myMemberships } = await supabase
        .from("memberships")
        .select("organization_id, role")
        .eq("user_id", userId);

      const soleOwnerBlockers: string[] = [];
      const orgsToDelete: string[] = [];

      for (const m of myMemberships ?? []) {
        const { count } = await supabase
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", m.organization_id);

        if ((count ?? 0) <= 1) {
          orgsToDelete.push(m.organization_id);
        } else if (m.role === "owner") {
          const { count: ownerCount } = await supabase
            .from("memberships")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", m.organization_id)
            .eq("role", "owner");
          if ((ownerCount ?? 0) <= 1) {
            const { data: org } = await supabase
              .from("organizations").select("name").eq("id", m.organization_id).maybeSingle();
            soleOwnerBlockers.push(org?.name ?? m.organization_id);
          }
        }
      }

      if (soleOwnerBlockers.length > 0) {
        return json({
          error: "sole_owner",
          message:
            `You're the only owner of ${soleOwnerBlockers.join(", ")}. ` +
            "Promote another member to owner, or remove the other members first, then delete your account.",
          organizations: soleOwnerBlockers,
        }, 409);
      }

      // Best-effort storage cleanup for orgs being removed.
      for (const orgId of orgsToDelete) {
        for (const bucket of ["project-documents", "mission-deliverables"]) {
          try {
            const { data: files } = await supabase.storage.from(bucket).list(orgId, { limit: 1000 });
            if (files?.length) {
              await supabase.storage.from(bucket).remove(files.map((f) => `${orgId}/${f.name}`));
            }
            for (const prefix of ["invoices", "mission-briefs", "postflight-reports"]) {
              const { data: sub } = await supabase.storage.from(bucket).list(`${prefix}/${orgId}`, { limit: 1000 });
              if (sub?.length) {
                await supabase.storage.from(bucket).remove(sub.map((f) => `${prefix}/${orgId}/${f.name}`));
              }
            }
          } catch (e) {
            console.error("storage cleanup failed", bucket, orgId, e);
          }
        }
      }

      // Delete orgs where this user was the only member (cascades through FKs).
      for (const orgId of orgsToDelete) {
        const { error } = await supabase.from("organizations").delete().eq("id", orgId);
        if (error) console.error("org delete failed", orgId, error);
      }

      // Finally remove the auth user. profiles/memberships cascade from here.
      const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
      if (delErr) {
        console.error("auth user delete failed:", delErr);
        return json({ error: "Could not complete deletion. Please contact support." }, 500);
      }

      return json({ success: true, deleted_organizations: orgsToDelete.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("account-data error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
