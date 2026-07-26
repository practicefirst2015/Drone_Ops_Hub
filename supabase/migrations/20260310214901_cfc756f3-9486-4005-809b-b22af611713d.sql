
-- Mission files table to track generated briefs
CREATE TABLE public.mission_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_type TEXT NOT NULL DEFAULT 'brief',
  generated_by UUID NOT NULL REFERENCES public.profiles(id),
  snapshot_go_status TEXT NOT NULL DEFAULT 'pending',
  snapshot_preflight_status TEXT NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.mission_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org mission files"
  ON public.mission_files FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert mission files"
  ON public.mission_files FOR INSERT TO authenticated
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

CREATE POLICY "Admins+ can delete mission files"
  ON public.mission_files FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role]));
