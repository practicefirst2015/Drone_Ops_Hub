-- Rate limiting for edge functions that cost money or generate load.
CREATE TABLE IF NOT EXISTS public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  window_start timestamptz NOT NULL,
  call_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, function_name, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_lookup ON public.api_usage (user_id, function_name, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_org ON public.api_usage (organization_id, window_start DESC);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own api usage"
  ON public.api_usage FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _user_id uuid, _org_id uuid, _function_name text, _window_minutes integer DEFAULT 60
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bucket timestamptz; _count integer;
BEGIN
  _bucket := to_timestamp(floor(extract(epoch from now()) / (_window_minutes * 60)) * (_window_minutes * 60));
  INSERT INTO public.api_usage (user_id, organization_id, function_name, window_start, call_count)
  VALUES (_user_id, _org_id, _function_name, _bucket, 1)
  ON CONFLICT (user_id, function_name, window_start)
  DO UPDATE SET call_count = public.api_usage.call_count + 1
  RETURNING call_count INTO _count;
  RETURN _count;
END; $$;

CREATE OR REPLACE FUNCTION public.prune_api_usage()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.api_usage WHERE window_start < now() - interval '7 days';
$$;
