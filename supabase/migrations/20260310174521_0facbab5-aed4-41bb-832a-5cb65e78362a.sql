
-- ============================================================
-- 1. PILOT SELF-SERVICE: user_skills
--    Pilots can INSERT/UPDATE/DELETE their own user_skills records
-- ============================================================
CREATE POLICY "Pilots can manage their own skills"
  ON public.user_skills
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND is_org_member(auth.uid(), organization_id))
  WITH CHECK (auth.uid() = user_id AND is_org_member(auth.uid(), organization_id));

-- ============================================================
-- 2. PILOT SELF-SERVICE: certifications
--    Pilots can INSERT/UPDATE/DELETE their own certification records
-- ============================================================
CREATE POLICY "Pilots can manage their own certifications"
  ON public.certifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND is_org_member(auth.uid(), organization_id))
  WITH CHECK (auth.uid() = user_id AND is_org_member(auth.uid(), organization_id));

-- ============================================================
-- 3. RESTRICT PILOT TASK UPDATES to assigned tasks only
--    Drop the overly broad policy and replace with two:
--    - Managers+ can update any task
--    - Pilots can only update tasks assigned to them
-- ============================================================
DROP POLICY "Managers+ can update tasks" ON public.tasks;

CREATE POLICY "Managers+ can update tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

CREATE POLICY "Pilots can update assigned tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    AND get_org_role(auth.uid(), organization_id) = 'pilot'::membership_role
  );

-- ============================================================
-- 4. RESTRICT PILOT TASK INSERTS to only pilots in the org
--    (current policy already includes pilots, keep as-is but
--     re-scope to authenticated role for consistency)
-- ============================================================
-- No change needed - current INSERT policy is correct

-- ============================================================
-- 5. VIEWER SAFETY: viewers should never write.
--    All existing write policies already exclude viewers (they
--    require pilot+ rank). No changes needed, just documenting.
-- ============================================================
