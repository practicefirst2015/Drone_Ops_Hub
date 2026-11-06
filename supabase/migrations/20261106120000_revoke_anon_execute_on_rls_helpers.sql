-- Close the Supabase advisor finding "Public Can Execute SECURITY DEFINER
-- Function" (lint 0028) for the eight RLS helper functions that are still
-- callable without signing in via /rest/v1/rpc/*.
--
-- These helpers answer questions such as "what role does user X have in
-- org Y?" and run as the function owner, so anyone holding the public anon
-- key could call them directly. Signed-in users keep EXECUTE, because the
-- table RLS policies call these helpers on every authenticated request.
--
-- Same pattern as 20260901025625 / 20260901025635: revoke from PUBLIC and
-- anon, then grant back to authenticated and service_role.
--
-- Effect on signed-out requests: the app makes no table queries while
-- signed out (landing, legal, /doc and /auth pages don't query tables, and
-- /doc goes through the view-document edge function with the service role).
-- A raw anon REST request to a table whose policy calls one of these
-- helpers will now get "permission denied for function" instead of an
-- empty result, which only an outside caller would see.

REVOKE ALL ON FUNCTION public.client_portal_can_view(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_org_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_membership(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_can_access_project(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_client_id(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_staff_org_with(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.client_portal_can_view(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_org_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_membership(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_can_access_project(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_client_id(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_staff_org_with(uuid, uuid) TO authenticated, service_role;
