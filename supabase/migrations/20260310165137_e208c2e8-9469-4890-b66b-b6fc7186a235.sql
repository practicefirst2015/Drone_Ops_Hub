
-- Create client_documents table
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Members can view client documents (via client org membership)
CREATE POLICY "Members can view client documents"
  ON public.client_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_documents.client_id
      AND is_org_member(auth.uid(), c.organization_id)
    )
  );

-- Contributors can insert client documents
CREATE POLICY "Contributors can insert client documents"
  ON public.client_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_documents.client_id
      AND get_org_role(auth.uid(), c.organization_id) IN ('owner', 'admin', 'manager', 'pilot')
    )
  );

-- Admins or uploader can delete client documents
CREATE POLICY "Admins can delete client documents"
  ON public.client_documents FOR DELETE
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_documents.client_id
      AND get_org_role(auth.uid(), c.organization_id) IN ('owner', 'admin')
    )
  );

-- Add storage_path column to project_documents for signed URL support
ALTER TABLE public.project_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Storage bucket policies for project-documents
CREATE POLICY "Authenticated users can upload to project-documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can read from project-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-documents');

CREATE POLICY "Users can delete own uploads from project-documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-documents');
