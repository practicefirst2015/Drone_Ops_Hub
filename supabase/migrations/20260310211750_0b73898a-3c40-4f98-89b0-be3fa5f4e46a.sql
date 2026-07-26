
-- Preflight checklist items per mission
CREATE TABLE public.preflight_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  label TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  is_auto BOOLEAN NOT NULL DEFAULT false,
  auto_status TEXT DEFAULT 'pending',
  manual_checked BOOLEAN NOT NULL DEFAULT false,
  override_note TEXT,
  checked_by UUID REFERENCES public.profiles(id),
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mission_id, check_key)
);

ALTER TABLE public.preflight_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view mission checklist items"
  ON public.preflight_checklist_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM missions m WHERE m.id = preflight_checklist_items.mission_id
    AND is_org_member(auth.uid(), m.organization_id)
  ));

CREATE POLICY "Managers+ can manage mission checklist items"
  ON public.preflight_checklist_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM missions m WHERE m.id = preflight_checklist_items.mission_id
    AND get_org_role(auth.uid(), m.organization_id) IN ('owner', 'admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM missions m WHERE m.id = preflight_checklist_items.mission_id
    AND get_org_role(auth.uid(), m.organization_id) IN ('owner', 'admin', 'manager')
  ));

-- Also allow pilots assigned to the mission to check items
CREATE POLICY "Assigned pilots can update checklist items"
  ON public.preflight_checklist_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mission_operators mo WHERE mo.mission_id = preflight_checklist_items.mission_id
    AND mo.user_id = auth.uid()
  ));
