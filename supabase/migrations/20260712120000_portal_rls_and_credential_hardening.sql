-- ============================================================================
-- Portal RLS scoping + credential lockdown
-- ----------------------------------------------------------------------------
-- Problem this fixes:
--   Client-portal users are `viewer`-role members of an org. Every "Members can
--   view org X" policy used `is_org_member(auth.uid(), org)`, which was true for
--   viewers. That let any client read the ENTIRE org's data (other clients'
--   invoices, all projects/missions/flight logs, integration credentials) by
--   calling the API directly. The portal restriction was client-side only.
--
-- Approach:
--   1. `is_org_member` is redefined to mean "STAFF member" (role <> 'viewer').
--      Because ~35 existing SELECT policies call it, this single change removes
--      viewers from the entire internal data plane in one place. Write policies
--      already use `get_org_role(...) IN (...)`, which never included viewers,
--      so writes are unaffected.
--   2. Client-portal (viewer) access is granted back ONLY through explicit,
--      narrowly-scoped `Portal clients ...` policies below, restricted to the
--      viewer's own linked client and gated by the org's client-visibility
--      settings.
--   3. Integration credentials are no longer readable by non-admin members.
-- ============================================================================

-- ── 1. Link portal (viewer) users to a specific client ──────────────────────
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.memberships.client_id IS
  'For viewer-role (client-portal) memberships: the client this user represents. '
  'NULL for staff memberships. Portal RLS policies scope viewers to this client.';

CREATE INDEX IF NOT EXISTS idx_memberships_client ON public.memberships(client_id);

-- ── 2. Helper functions ─────────────────────────────────────────────────────

-- Pure membership check (any role, INCLUDING viewers). Use where a viewer must
-- legitimately be recognised as belonging to the org (e.g. reading org name).
CREATE OR REPLACE FUNCTION public.has_org_membership(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- STAFF membership check. NOTE: this intentionally EXCLUDES the `viewer` role.
-- Client-portal users are viewers and must not see general org data; they are
-- granted access only via the explicit "Portal clients ..." policies below.
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role <> 'viewer'
  )
$$;

COMMENT ON FUNCTION public.is_org_member(uuid, uuid) IS
  'True only for STAFF members (role <> viewer). Client-portal viewers are '
  'excluded by design; grant them access via explicit portal policies instead. '
  'Use has_org_membership() for a role-agnostic membership check.';

-- The client_id a viewer is scoped to in a given org (NULL for staff/non-viewers).
CREATE OR REPLACE FUNCTION public.portal_client_id(_user_id uuid, _org_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.memberships
  WHERE user_id = _user_id
    AND organization_id = _org_id
    AND role = 'viewer'
  LIMIT 1
$$;

-- Whether a viewer may access a given project (project belongs to their client).
CREATE OR REPLACE FUNCTION public.portal_can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.memberships m ON m.organization_id = p.organization_id
    WHERE p.id = _project_id
      AND m.user_id = _user_id
      AND m.role = 'viewer'
      AND m.client_id IS NOT NULL
      AND m.client_id = p.client_id
  )
$$;

-- Org's client-visibility toggle for a portal feature (falls back to the same
-- defaults as the app when no settings row exists).
CREATE OR REPLACE FUNCTION public.client_portal_can_view(_org_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _feature
    WHEN 'invoices' THEN
      COALESCE((SELECT client_can_view_invoices FROM public.organization_settings WHERE organization_id = _org_id), true)
    WHEN 'deliverables' THEN
      COALESCE((SELECT client_can_view_deliverables FROM public.organization_settings WHERE organization_id = _org_id), true)
    WHEN 'flight_logs' THEN
      COALESCE((SELECT client_can_view_flight_logs FROM public.organization_settings WHERE organization_id = _org_id), false)
    WHEN 'mission_status' THEN
      COALESCE((SELECT client_can_view_mission_status FROM public.organization_settings WHERE organization_id = _org_id), false)
    ELSE false
  END
$$;

-- ── 3. Portal (viewer) access policies ──────────────────────────────────────
-- Each is additive (RLS policies are OR-ed). Staff continue to use the existing
-- is_org_member/get_org_role policies; these apply only to viewers.

-- Org name/header + so OrgContext's memberships->organizations join resolves.
DROP POLICY IF EXISTS "Portal clients can view their organization" ON public.organizations;
CREATE POLICY "Portal clients can view their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (has_org_membership(auth.uid(), id));

-- Client-visibility flags (so the portal UI can hide disabled sections, matching
-- what RLS enforces). Financial defaults in this row are not sensitive to the client.
DROP POLICY IF EXISTS "Portal clients can view org settings" ON public.organization_settings;
CREATE POLICY "Portal clients can view org settings"
  ON public.organization_settings FOR SELECT TO authenticated
  USING (has_org_membership(auth.uid(), organization_id));

-- Projects for the viewer's own client only.
DROP POLICY IF EXISTS "Portal clients can view their projects" ON public.projects;
CREATE POLICY "Portal clients can view their projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    client_id IS NOT NULL
    AND client_id = portal_client_id(auth.uid(), organization_id)
  );

-- Invoices for the viewer's own client, when the org allows it.
DROP POLICY IF EXISTS "Portal clients can view their invoices" ON public.invoices;
CREATE POLICY "Portal clients can view their invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    client_id IS NOT NULL
    AND client_id = portal_client_id(auth.uid(), organization_id)
    AND client_portal_can_view(organization_id, 'invoices')
  );

-- Invoice line items belonging to a visible invoice.
DROP POLICY IF EXISTS "Portal clients can view their invoice line items" ON public.invoice_line_items;
CREATE POLICY "Portal clients can view their invoice line items"
  ON public.invoice_line_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.client_id IS NOT NULL
        AND i.client_id = portal_client_id(auth.uid(), i.organization_id)
        AND client_portal_can_view(i.organization_id, 'invoices')
    )
  );

-- Deliverables for the viewer's client projects, when allowed.
DROP POLICY IF EXISTS "Portal clients can view their deliverables" ON public.project_deliverables;
CREATE POLICY "Portal clients can view their deliverables"
  ON public.project_deliverables FOR SELECT TO authenticated
  USING (
    portal_can_access_project(auth.uid(), project_id)
    AND client_portal_can_view(organization_id, 'deliverables')
  );

-- Flight logs for the viewer's client projects, when allowed.
DROP POLICY IF EXISTS "Portal clients can view their flight logs" ON public.flight_logs;
CREATE POLICY "Portal clients can view their flight logs"
  ON public.flight_logs FOR SELECT TO authenticated
  USING (
    portal_can_access_project(auth.uid(), project_id)
    AND client_portal_can_view(organization_id, 'flight_logs')
  );

-- Missions for the viewer's client projects, when allowed.
DROP POLICY IF EXISTS "Portal clients can view their missions" ON public.missions;
CREATE POLICY "Portal clients can view their missions"
  ON public.missions FOR SELECT TO authenticated
  USING (
    portal_can_access_project(auth.uid(), project_id)
    AND client_portal_can_view(organization_id, 'mission_status')
  );

-- ── 4. Credential lockdown ──────────────────────────────────────────────────
-- Previously ALL members (including viewers) could SELECT organization_integrations,
-- exposing credentials_encrypted (stored plaintext, read server-side by edge
-- functions). Remove the broad member-read; owner/admin retain read+write via the
-- existing "Admins+ can manage integrations" FOR ALL policy. Edge functions use
-- the service role and are unaffected.
DROP POLICY IF EXISTS "Members can view integrations" ON public.organization_integrations;

-- ── 5. Co-member profile visibility ─────────────────────────────────────────
-- Profiles were self-only, so staff UIs showing teammate/operator/pilot names
-- rendered blank. Allow STAFF to read profiles of users they share an org with.
-- (Viewers are excluded — they should not enumerate the operator roster.)
CREATE OR REPLACE FUNCTION public.shares_staff_org_with(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships viewer_m
    JOIN public.memberships target_m
      ON viewer_m.organization_id = target_m.organization_id
    WHERE viewer_m.user_id = _viewer
      AND viewer_m.role <> 'viewer'
      AND target_m.user_id = _target
  )
$$;

DROP POLICY IF EXISTS "Staff can view co-member profiles" ON public.profiles;
CREATE POLICY "Staff can view co-member profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (shares_staff_org_with(auth.uid(), id));
