
-- Deliverable types enum
CREATE TYPE public.deliverable_type AS ENUM (
  'rgb_imagery', 'thermal_imagery', 'multispectral_imagery',
  'video', 'orthomosaic_source', 'lidar_data',
  'inspection_notes', 'mapping_data', 'survey_data', 'other'
);

-- Deliverable status enum
CREATE TYPE public.deliverable_status AS ENUM ('expected', 'captured', 'partial', 'not_captured');

-- Flight log deliverables table
CREATE TABLE public.flight_log_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_log_id UUID NOT NULL REFERENCES public.flight_logs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  deliverable_type deliverable_type NOT NULL,
  status deliverable_status NOT NULL DEFAULT 'expected',
  label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flight_log_deliverables ENABLE ROW LEVEL SECURITY;

-- Members can view
CREATE POLICY "Members can view org deliverables"
  ON public.flight_log_deliverables FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Managers+ can manage
CREATE POLICY "Managers+ can manage deliverables"
  ON public.flight_log_deliverables FOR ALL TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

-- Pilots can insert for their own flight logs
CREATE POLICY "Pilots can insert own deliverables"
  ON public.flight_log_deliverables FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flight_logs fl
      WHERE fl.id = flight_log_deliverables.flight_log_id
        AND fl.pilot_id = auth.uid()
    )
    AND get_org_role(auth.uid(), organization_id) = 'pilot'::membership_role
  );

-- Pilots can update their own deliverables
CREATE POLICY "Pilots can update own deliverables"
  ON public.flight_log_deliverables FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flight_logs fl
      WHERE fl.id = flight_log_deliverables.flight_log_id
        AND fl.pilot_id = auth.uid()
    )
    AND get_org_role(auth.uid(), organization_id) = 'pilot'::membership_role
  );
