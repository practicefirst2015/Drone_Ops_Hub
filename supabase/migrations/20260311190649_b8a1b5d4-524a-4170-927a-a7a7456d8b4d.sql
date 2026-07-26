
-- Integration registry table
CREATE TABLE public.organization_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_encrypted jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'not_configured',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, integration_key)
);

ALTER TABLE public.organization_integrations ENABLE ROW LEVEL SECURITY;

-- Only admins+ can manage integrations
CREATE POLICY "Admins+ can manage integrations"
  ON public.organization_integrations
  FOR ALL
  TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role]))
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role]));

-- Members can view integrations (to know what's enabled)
CREATE POLICY "Members can view integrations"
  ON public.organization_integrations
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
