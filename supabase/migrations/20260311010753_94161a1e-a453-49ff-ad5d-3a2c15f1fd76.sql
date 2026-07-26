
CREATE TABLE public.flight_log_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_log_id UUID NOT NULL REFERENCES public.flight_logs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'postflight_report',
  file_size_bytes BIGINT,
  generated_by UUID NOT NULL REFERENCES public.profiles(id),
  snapshot_outcome TEXT NOT NULL DEFAULT 'completed',
  snapshot_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flight_log_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org flight log files" ON public.flight_log_files
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert flight log files" ON public.flight_log_files
  FOR INSERT TO authenticated
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

CREATE POLICY "Pilots can insert own flight log files" ON public.flight_log_files
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flight_logs fl
      WHERE fl.id = flight_log_files.flight_log_id AND fl.pilot_id = auth.uid()
    )
    AND get_org_role(auth.uid(), organization_id) = 'pilot'::membership_role
  );

CREATE POLICY "Admins+ can delete flight log files" ON public.flight_log_files
  FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role]));
