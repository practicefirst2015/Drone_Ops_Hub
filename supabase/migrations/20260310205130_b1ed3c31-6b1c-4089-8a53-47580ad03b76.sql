
-- Mission status enum
CREATE TYPE public.mission_status AS ENUM ('draft', 'planning', 'approved', 'ready', 'in_progress', 'completed', 'aborted', 'cancelled');

-- Go/no-go enum
CREATE TYPE public.mission_go_status AS ENUM ('pending', 'go', 'no_go');

-- Preflight checklist status enum
CREATE TYPE public.preflight_status AS ENUM ('not_started', 'in_progress', 'complete', 'failed');

-- Main missions table
CREATE TABLE public.missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status mission_status NOT NULL DEFAULT 'draft',
  objective TEXT,
  mission_date DATE,
  launch_location TEXT,
  target_area TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  planned_flight_zone TEXT,
  altitude_notes TEXT,
  flight_duration_estimate_min INTEGER,
  risk_notes TEXT,
  weather_notes TEXT,
  airspace_notes TEXT,
  readiness_notes TEXT,
  go_status mission_go_status NOT NULL DEFAULT 'pending',
  preflight_status preflight_status NOT NULL DEFAULT 'not_started',
  postflight_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mission operators (assigned team members)
CREATE TABLE public.mission_operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mission_id, user_id)
);

-- Mission drone models (assigned drone models)
CREATE TABLE public.mission_drone_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  drone_model_id UUID NOT NULL REFERENCES public.drone_models(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mission_id, drone_model_id)
);

-- Mission required skills
CREATE TABLE public.mission_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mission_id, skill_id)
);

-- Mission required certifications (by skill reference)
CREATE TABLE public.mission_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mission_id, skill_id)
);

-- Updated_at trigger
CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_drone_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_certifications ENABLE ROW LEVEL SECURITY;

-- Missions policies
CREATE POLICY "Members can view org missions" ON public.missions
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert missions" ON public.missions
  FOR INSERT TO authenticated
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

CREATE POLICY "Managers+ can update missions" ON public.missions
  FOR UPDATE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

CREATE POLICY "Admins+ can delete missions" ON public.missions
  FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role]));

-- Mission operators policies
CREATE POLICY "Members can view mission operators" ON public.mission_operators
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_operators.mission_id AND is_org_member(auth.uid(), m.organization_id)));

CREATE POLICY "Managers+ can manage mission operators" ON public.mission_operators
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_operators.mission_id AND get_org_role(auth.uid(), m.organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role])));

-- Mission drone models policies
CREATE POLICY "Members can view mission drone models" ON public.mission_drone_models
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_drone_models.mission_id AND is_org_member(auth.uid(), m.organization_id)));

CREATE POLICY "Managers+ can manage mission drone models" ON public.mission_drone_models
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_drone_models.mission_id AND get_org_role(auth.uid(), m.organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role])));

-- Mission skills policies
CREATE POLICY "Members can view mission skills" ON public.mission_skills
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_skills.mission_id AND is_org_member(auth.uid(), m.organization_id)));

CREATE POLICY "Managers+ can manage mission skills" ON public.mission_skills
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_skills.mission_id AND get_org_role(auth.uid(), m.organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role])));

-- Mission certifications policies
CREATE POLICY "Members can view mission certifications" ON public.mission_certifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_certifications.mission_id AND is_org_member(auth.uid(), m.organization_id)));

CREATE POLICY "Managers+ can manage mission certifications" ON public.mission_certifications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_certifications.mission_id AND get_org_role(auth.uid(), m.organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role])));
