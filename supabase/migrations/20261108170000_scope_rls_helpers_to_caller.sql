-- Scope the role and membership helpers to the signed-in caller.
--
-- NOT YET APPLIED to production (hgggkbnxlgthydfzjkpt). Supabase does not
-- apply migrations on merge; apply it separately once reviewed.
--
-- Problem: these SECURITY DEFINER helpers take a user id as a parameter and
-- signed-in users can call them directly through /rest/v1/rpc/*. Because
-- they run as the function owner and skip RLS, any signed-in user could ask
-- "what role does user X have in org Y?" (get_org_role), "is X a member of
-- Y?" (is_org_member, has_org_membership), "which client is X tied to in Y?"
-- (portal_client_id), and so on, for any user and any org.
--
-- Why not just revoke EXECUTE from authenticated: every table RLS policy and
-- the storage helpers call these functions on each signed-in request, and a
-- policy can only call a function the requesting role may execute. Revoking
-- would lock signed-in users out of their own data.
--
-- Fix: each helper now only answers about the caller. When the request comes
-- from the anon or authenticated API roles, the user id argument must equal
-- auth.uid(); otherwise the helper returns false / NULL, exactly as if no
-- membership existed. Every RLS policy and storage helper already passes
-- auth.uid() as that argument (checked against pg_policies and pg_proc on
-- 2026-11-08), so policy results are unchanged. Calls with no API role at
-- all (service_role key, migrations, SQL editor) keep the old behaviour.
--
-- client_portal_can_view has no user argument; it now answers only for orgs
-- the caller belongs to (any role, including client-portal viewers, which is
-- who the portal policies use it for).
--
-- Signatures, return types, volatility, SECURITY DEFINER and search_path are
-- unchanged, so existing grants and the generated TypeScript types still
-- apply. The Supabase advisor will still list these as "callable by signed-in
-- users" (lint 0029), because they must stay executable for RLS; what that
-- lint warns about, reading other users' data through them, is what this
-- closes.

CREATE OR REPLACE FUNCTION public.get_org_role(_user_id uuid, _org_id uuid)
RETURNS public.membership_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.memberships
  WHERE user_id = _user_id
    AND organization_id = _org_id
    AND (_user_id = auth.uid() OR COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  LIMIT 1
$$;

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
      AND (_user_id = auth.uid() OR COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_membership(_user_id uuid, _org_id uuid)
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
      AND (_user_id = auth.uid() OR COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_user_id = auth.uid() OR COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  )
$$;

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
    AND (_user_id = auth.uid() OR COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  LIMIT 1
$$;

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
      AND (_user_id = auth.uid() OR COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  )
$$;

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
      AND (_viewer = auth.uid() OR COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  )
$$;

CREATE OR REPLACE FUNCTION public.client_portal_can_view(_org_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(auth.role(), '') IN ('anon', 'authenticated')
         AND NOT EXISTS (
           SELECT 1 FROM public.memberships
           WHERE user_id = auth.uid() AND organization_id = _org_id
         )
      THEN false
    ELSE CASE _feature
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
  END
$$;
