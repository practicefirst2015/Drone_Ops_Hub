-- Already applied to production (hgggkbnxlgthydfzjkpt) on 2026-09-01 as
-- migration 20260901025635 "revoke_public_rpc_execute". Committed here so the
-- repo matches what production runs.

REVOKE ALL ON FUNCTION public.prune_api_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_api_usage() TO service_role;

REVOKE ALL ON FUNCTION public.consume_rate_limit(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(uuid, uuid, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_organization(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Org members can view co-member profiles" ON public.profiles;
