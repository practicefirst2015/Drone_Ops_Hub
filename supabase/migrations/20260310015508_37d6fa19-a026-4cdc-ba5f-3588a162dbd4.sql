
-- Project notes / activity timeline
CREATE TABLE public.project_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'note', -- 'note', 'status_change', 'activity'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project notes"
  ON public.project_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_notes.project_id
    AND is_org_member(auth.uid(), p.organization_id)
  ));

CREATE POLICY "Contributors can insert project notes"
  ON public.project_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_notes.project_id
    AND get_org_role(auth.uid(), p.organization_id) IN ('owner','admin','manager','pilot')
  ));

CREATE POLICY "Admins can delete project notes"
  ON public.project_notes FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_notes.project_id
      AND get_org_role(auth.uid(), p.organization_id) IN ('owner','admin')
    )
  );

-- Project documents
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project documents"
  ON public.project_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_documents.project_id
    AND is_org_member(auth.uid(), p.organization_id)
  ));

CREATE POLICY "Contributors can insert project documents"
  ON public.project_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_documents.project_id
    AND get_org_role(auth.uid(), p.organization_id) IN ('owner','admin','manager','pilot')
  ));

CREATE POLICY "Admins can delete project documents"
  ON public.project_documents FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_documents.project_id
      AND get_org_role(auth.uid(), p.organization_id) IN ('owner','admin')
    )
  );

-- Storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false);

CREATE POLICY "Org members can read project docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Contributors can upload project docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can delete project docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);
