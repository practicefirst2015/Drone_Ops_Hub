
-- Certifications table for tracking user certifications
CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  certification_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org certifications" ON public.certifications
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage certifications" ON public.certifications
  FOR ALL USING (
    get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager')
  );
