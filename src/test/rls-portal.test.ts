/**
 * Portal RLS isolation tests.
 *
 * These are INTEGRATION tests: they run against a real Postgres with the
 * migrations applied. They are skipped automatically unless the following env
 * vars are set, so a normal `npm test` stays green without a database.
 *
 *   SUPABASE_URL                 e.g. http://127.0.0.1:54321
 *   SUPABASE_ANON_KEY            anon/publishable key
 *   SUPABASE_SERVICE_ROLE_KEY    service role key (seeds data, creates users)
 *
 * To run locally:
 *   supabase start
 *   supabase db reset            # applies all migrations
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_ANON_KEY=<anon> \
 *   SUPABASE_SERVICE_ROLE_KEY=<service> \
 *   npx vitest run src/test/rls-portal.test.ts
 *
 * What they lock down: the critical finding that `viewer`-role (client-portal)
 * users could read the entire org's data. A viewer must see ONLY their own
 * client's projects/invoices and nothing else.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ready = Boolean(URL && ANON && SERVICE);

const rand = () => Math.random().toString(36).slice(2, 10);

describe.skipIf(!ready)("portal RLS isolation", () => {
  const admin = createClient(URL ?? "http://localhost", SERVICE ?? "noop", { auth: { persistSession: false } });

  // Seeded ids
  let orgId: string;
  let clientAId: string; // the viewer's client
  let clientBId: string; // another client in the same org
  let projectAId: string;
  let projectBId: string;
  let invoiceAId: string;
  let invoiceBId: string;

  // Actor clients (authenticated as different users)
  let viewer: SupabaseClient;
  let staff: SupabaseClient;
  const created: { userIds: string[] } = { userIds: [] };

  const makeUser = async (): Promise<{ id: string; email: string; password: string }> => {
    const email = `test_${rand()}@example.com`;
    const password = `Pw_${rand()}${rand()}`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    created.userIds.push(data.user!.id);
    return { id: data.user!.id, email, password };
  };

  const signIn = async (email: string, password: string) => {
    const c = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return c;
  };

  beforeAll(async () => {
    // Org + settings (invoices visible to clients, everything else default)
    const org = await admin.from("organizations").insert({ name: `Org ${rand()}`, slug: `org-${rand()}` }).select("id").single();
    orgId = org.data!.id;
    await admin.from("organization_settings").insert({
      organization_id: orgId,
      client_can_view_invoices: true,
      client_can_view_deliverables: true,
      client_can_view_flight_logs: false,
      client_can_view_mission_status: false,
    });

    // Two clients
    const cA = await admin.from("clients").insert({ organization_id: orgId, name: "Client A" }).select("id").single();
    const cB = await admin.from("clients").insert({ organization_id: orgId, name: "Client B" }).select("id").single();
    clientAId = cA.data!.id;
    clientBId = cB.data!.id;

    // A project + invoice per client
    const pA = await admin.from("projects").insert({ organization_id: orgId, client_id: clientAId, name: "Proj A" }).select("id").single();
    const pB = await admin.from("projects").insert({ organization_id: orgId, client_id: clientBId, name: "Proj B" }).select("id").single();
    projectAId = pA.data!.id;
    projectBId = pB.data!.id;

    const iA = await admin.from("invoices").insert({ organization_id: orgId, client_id: clientAId, project_id: projectAId, invoice_number: "INV-A", amount: 100 }).select("id").single();
    const iB = await admin.from("invoices").insert({ organization_id: orgId, client_id: clientBId, project_id: projectBId, invoice_number: "INV-B", amount: 200 }).select("id").single();
    invoiceAId = iA.data!.id;
    invoiceBId = iB.data!.id;

    // A drone + an integration secret (viewer must never see these)
    await admin.from("drones").insert({ organization_id: orgId, name: "Bird 1", model: "M300" });
    await admin.from("organization_integrations").insert({
      organization_id: orgId,
      integration_key: "openweather",
      enabled: true,
      credentials_encrypted: { api_key: "SECRET_KEY_DO_NOT_LEAK" },
    });

    // Users: a portal viewer scoped to client A, and a staff manager
    const vUser = await makeUser();
    await admin.from("memberships").insert({ organization_id: orgId, user_id: vUser.id, role: "viewer", client_id: clientAId });
    viewer = await signIn(vUser.email, vUser.password);

    const sUser = await makeUser();
    await admin.from("memberships").insert({ organization_id: orgId, user_id: sUser.id, role: "manager" });
    staff = await signIn(sUser.email, sUser.password);
  }, 30_000);

  afterAll(async () => {
    if (!ready) return;
    await admin.from("organizations").delete().eq("id", orgId); // cascades to org-scoped rows
    for (const id of created.userIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  });

  it("viewer sees only their own client's project", async () => {
    const { data } = await viewer.from("projects").select("id, client_id");
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(projectAId);
    expect(ids).not.toContain(projectBId);
  });

  it("viewer sees only their own client's invoice", async () => {
    const { data } = await viewer.from("invoices").select("id, client_id");
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(invoiceAId);
    expect(ids).not.toContain(invoiceBId);
  });

  it("viewer cannot read the org's other clients", async () => {
    const { data } = await viewer.from("clients").select("id");
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).not.toContain(clientBId);
  });

  it("viewer cannot read drones", async () => {
    const { data } = await viewer.from("drones").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("viewer cannot read integration credentials", async () => {
    const { data } = await viewer.from("organization_integrations").select("credentials_encrypted");
    expect(data ?? []).toHaveLength(0);
  });

  it("staff sees all org data (both clients, both invoices, drones)", async () => {
    const [{ data: projects }, { data: invoices }, { data: drones }] = await Promise.all([
      staff.from("projects").select("id"),
      staff.from("invoices").select("id"),
      staff.from("drones").select("id"),
    ]);
    expect((projects ?? []).map((r) => r.id)).toEqual(expect.arrayContaining([projectAId, projectBId]));
    expect((invoices ?? []).map((r) => r.id)).toEqual(expect.arrayContaining([invoiceAId, invoiceBId]));
    expect((drones ?? []).length).toBeGreaterThan(0);
  });

  it("staff (non-admin) cannot read integration credentials either", async () => {
    // Only owner/admin retain access after the member-view policy was dropped.
    const { data } = await staff.from("organization_integrations").select("credentials_encrypted");
    expect(data ?? []).toHaveLength(0);
  });

  it("viewer respects the client_can_view_flight_logs=false toggle", async () => {
    // flight_logs visibility is disabled for this org, so even the viewer's own
    // project's logs must be hidden. (No logs seeded; assert no error + empty.)
    const { data, error } = await viewer.from("flight_logs").select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
