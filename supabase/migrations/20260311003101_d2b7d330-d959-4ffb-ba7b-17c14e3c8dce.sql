
-- Add new values to deliverable_status enum
ALTER TYPE public.deliverable_status ADD VALUE IF NOT EXISTS 'in_processing';
ALTER TYPE public.deliverable_status ADD VALUE IF NOT EXISTS 'completed';

-- Create project-level deliverables table
CREATE TABLE public.project_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  deliverable_type public.deliverable_type NOT NULL,
  label TEXT,
  description TEXT,
  status public.deliverable_status NOT NULL DEFAULT 'expected',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

-- Members can view
CREATE POLICY "Members can view project deliverables"
  ON public.project_deliverables FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Managers+ can manage
CREATE POLICY "Managers+ can manage project deliverables"
  ON public.project_deliverables FOR ALL TO authenticated
  USING (get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'))
  WITH CHECK (get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

-- Junction table linking deliverables to documents
CREATE TABLE public.deliverable_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_deliverable_id UUID REFERENCES public.project_deliverables(id) ON DELETE CASCADE,
  flight_deliverable_id UUID REFERENCES public.flight_log_deliverables(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id)
);

ALTER TABLE public.deliverable_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view deliverable documents"
  ON public.deliverable_documents FOR SELECT TO authenticated
  USING (
    (project_deliverable_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.project_deliverables pd WHERE pd.id = deliverable_documents.project_deliverable_id AND is_org_member(auth.uid(), pd.organization_id)
    ))
    OR
    (flight_deliverable_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.flight_log_deliverables fld WHERE fld.id = deliverable_documents.flight_deliverable_id AND is_org_member(auth.uid(), fld.organization_id)
    ))
  );

CREATE POLICY "Contributors can manage deliverable documents"
  ON public.deliverable_documents FOR ALL TO authenticated
  USING (
    (project_deliverable_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.project_deliverables pd WHERE pd.id = deliverable_documents.project_deliverable_id AND get_org_role(auth.uid(), pd.organization_id) IN ('owner', 'admin', 'manager', 'pilot')
    ))
    OR
    (flight_deliverable_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.flight_log_deliverables fld WHERE fld.id = deliverable_documents.flight_deliverable_id AND get_org_role(auth.uid(), fld.organization_id) IN ('owner', 'admin', 'manager', 'pilot')
    ))
  )
  WITH CHECK (
    (project_deliverable_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.project_deliverables pd WHERE pd.id = deliverable_documents.project_deliverable_id AND get_org_role(auth.uid(), pd.organization_id) IN ('owner', 'admin', 'manager', 'pilot')
    ))
    OR
    (flight_deliverable_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.flight_log_deliverables fld WHERE fld.id = deliverable_documents.flight_deliverable_id AND get_org_role(auth.uid(), fld.organization_id) IN ('owner', 'admin', 'manager', 'pilot')
    ))
  );
