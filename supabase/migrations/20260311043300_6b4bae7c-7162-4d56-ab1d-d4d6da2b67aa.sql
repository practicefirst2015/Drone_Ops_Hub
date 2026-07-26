
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  error_type text NOT NULL DEFAULT 'runtime',
  error_message text NOT NULL,
  error_stack text,
  component text,
  query_key text,
  url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'error',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org error logs"
  ON public.error_logs FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert error logs"
  ON public.error_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete error logs"
  ON public.error_logs FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role]));

CREATE INDEX idx_error_logs_org_created ON public.error_logs(organization_id, created_at DESC);
CREATE INDEX idx_error_logs_type ON public.error_logs(error_type);
