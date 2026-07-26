
-- User skill assignments with proficiency and verified status
CREATE TABLE public.user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proficiency_level text NOT NULL DEFAULT 'beginner',
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id, organization_id)
);

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Members can view org user_skills
CREATE POLICY "Members can view org user skills"
  ON public.user_skills FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Managers+ can manage user skills
CREATE POLICY "Managers+ can manage user skills"
  ON public.user_skills FOR ALL
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));
