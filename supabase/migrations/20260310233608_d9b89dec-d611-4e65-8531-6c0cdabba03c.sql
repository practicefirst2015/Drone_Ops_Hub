
-- Issue severity enum
CREATE TYPE public.issue_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Issue resolution status enum
CREATE TYPE public.issue_resolution_status AS ENUM ('open', 'investigating', 'resolved', 'wont_fix');

-- Postflight issues table
CREATE TABLE public.postflight_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flight_log_id UUID NOT NULL REFERENCES public.flight_logs(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  drone_model_id UUID REFERENCES public.drone_models(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pilot_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity issue_severity NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  resolution_status issue_resolution_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.postflight_issues ENABLE ROW LEVEL SECURITY;

-- Members can view org issues
CREATE POLICY "Members can view org postflight issues"
ON public.postflight_issues
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), organization_id));

-- Managers+ can insert issues
CREATE POLICY "Managers+ can insert postflight issues"
ON public.postflight_issues
FOR INSERT
TO authenticated
WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

-- Pilots can insert own issues (reported_by = self)
CREATE POLICY "Pilots can insert own postflight issues"
ON public.postflight_issues
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = reported_by) AND (get_org_role(auth.uid(), organization_id) = 'pilot'::membership_role));

-- Managers+ can update issues
CREATE POLICY "Managers+ can update postflight issues"
ON public.postflight_issues
FOR UPDATE
TO authenticated
USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

-- Admins+ can delete issues
CREATE POLICY "Admins+ can delete postflight issues"
ON public.postflight_issues
FOR DELETE
TO authenticated
USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role]));
