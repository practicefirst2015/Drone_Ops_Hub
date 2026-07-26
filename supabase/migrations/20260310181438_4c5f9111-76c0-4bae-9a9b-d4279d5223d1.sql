
-- Activity log table for audit trail
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast org-scoped queries
CREATE INDEX idx_activity_logs_org_created ON public.activity_logs(organization_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Members can view org activity
CREATE POLICY "Members can view org activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Authenticated org members can insert logs
CREATE POLICY "Members can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Only admins can delete logs
CREATE POLICY "Admins can delete activity logs"
  ON public.activity_logs
  FOR DELETE
  TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role]));
