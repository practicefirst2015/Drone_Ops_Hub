
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  suggested_drone_categories TEXT[] NOT NULL DEFAULT '{}',
  suggested_payload_types TEXT[] NOT NULL DEFAULT '{}',
  estimated_budget_min NUMERIC,
  estimated_budget_max NUMERIC,
  estimated_duration_days INTEGER,
  risk_notes TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org templates"
  ON public.project_templates FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage templates"
  ON public.project_templates FOR ALL
  TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]))
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));
