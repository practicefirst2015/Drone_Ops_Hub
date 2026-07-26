
-- Ingestion files table for bulk upload tracking
CREATE TABLE public.ingestion_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  flight_log_id uuid REFERENCES public.flight_logs(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  file_category text NOT NULL DEFAULT 'other',
  tags text[] DEFAULT '{}',
  notes text,
  processing_status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for browsing by project/mission
CREATE INDEX idx_ingestion_files_project ON public.ingestion_files(project_id);
CREATE INDEX idx_ingestion_files_mission ON public.ingestion_files(mission_id);
CREATE INDEX idx_ingestion_files_category ON public.ingestion_files(file_category);

-- RLS
ALTER TABLE public.ingestion_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org ingestion files"
  ON public.ingestion_files FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Contributors can insert ingestion files"
  ON public.ingestion_files FOR INSERT TO authenticated
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner','admin','manager','pilot']::membership_role[]));

CREATE POLICY "Contributors can update ingestion files"
  ON public.ingestion_files FOR UPDATE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner','admin','manager','pilot']::membership_role[]));

CREATE POLICY "Admins can delete ingestion files"
  ON public.ingestion_files FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner','admin']::membership_role[]));

-- Updated_at trigger
CREATE TRIGGER set_ingestion_files_updated_at
  BEFORE UPDATE ON public.ingestion_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mission deliverables storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('mission-deliverables', 'mission-deliverables', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for mission-deliverables bucket
CREATE POLICY "Authenticated users can upload to mission-deliverables"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mission-deliverables');

CREATE POLICY "Authenticated users can read from mission-deliverables"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mission-deliverables');

CREATE POLICY "Admins can delete from mission-deliverables"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mission-deliverables');
