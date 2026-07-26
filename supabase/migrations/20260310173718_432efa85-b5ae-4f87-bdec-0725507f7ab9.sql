-- ============================================================
-- 1. CRITICAL: Fix profiles RLS - allow org members to see each other
-- ============================================================
CREATE POLICY "Org members can view co-member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m1
      JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
    )
  );

-- ============================================================
-- 2. Missing updated_at triggers
-- ============================================================
CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at
  BEFORE UPDATE ON public.user_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. Missing unique constraints to prevent duplicate assignments
-- ============================================================
ALTER TABLE public.project_drones
  ADD CONSTRAINT project_drones_project_drone_unique UNIQUE (project_id, drone_id);

ALTER TABLE public.project_skills
  ADD CONSTRAINT project_skills_project_skill_unique UNIQUE (project_id, skill_id);

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_project_user_unique UNIQUE (project_id, user_id);

-- ============================================================
-- 4. Missing unique constraint on user_skills (one assignment per user+skill+org)
-- ============================================================
ALTER TABLE public.user_skills
  ADD CONSTRAINT user_skills_user_skill_org_unique UNIQUE (user_id, skill_id, organization_id);