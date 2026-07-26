
-- Flight outcome enum
CREATE TYPE public.flight_outcome AS ENUM ('completed', 'partial', 'aborted', 'cancelled');

-- Flight logs table
CREATE TABLE public.flight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  mission_id uuid REFERENCES public.missions(id),
  drone_model_id uuid REFERENCES public.drone_models(id),
  pilot_id uuid NOT NULL REFERENCES public.profiles(id),

  title text NOT NULL,
  flight_date date NOT NULL,
  launch_time timestamptz,
  landing_time timestamptz,
  duration_minutes integer,

  launch_location text,
  flight_area_summary text,
  objective text,

  outcome flight_outcome NOT NULL DEFAULT 'completed',
  incidents text,
  weather_summary text,
  airspace_notes text,

  preflight_completed boolean NOT NULL DEFAULT false,
  postflight_notes text,
  battery_equipment_notes text,
  deliverables_summary text,

  flight_hours_contribution numeric DEFAULT 0,
  drone_utilization_contribution numeric DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Flight crew junction table
CREATE TABLE public.flight_crew (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_log_id uuid NOT NULL REFERENCES public.flight_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  role text NOT NULL DEFAULT 'crew',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flight_log_id, user_id)
);

-- Enable RLS
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_crew ENABLE ROW LEVEL SECURITY;

-- RLS: flight_logs
CREATE POLICY "Members can view org flight logs"
  ON public.flight_logs FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert flight logs"
  ON public.flight_logs FOR INSERT TO authenticated
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

CREATE POLICY "Managers+ can update flight logs"
  ON public.flight_logs FOR UPDATE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

CREATE POLICY "Admins+ can delete flight logs"
  ON public.flight_logs FOR DELETE TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role]));

-- Pilots can insert their own flight logs
CREATE POLICY "Pilots can insert own flight logs"
  ON public.flight_logs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = pilot_id
    AND get_org_role(auth.uid(), organization_id) = 'pilot'::membership_role
  );

-- Pilots can update their own flight logs
CREATE POLICY "Pilots can update own flight logs"
  ON public.flight_logs FOR UPDATE TO authenticated
  USING (
    auth.uid() = pilot_id
    AND get_org_role(auth.uid(), organization_id) = 'pilot'::membership_role
  );

-- RLS: flight_crew
CREATE POLICY "Members can view flight crew"
  ON public.flight_crew FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flight_logs fl
    WHERE fl.id = flight_crew.flight_log_id
    AND is_org_member(auth.uid(), fl.organization_id)
  ));

CREATE POLICY "Managers+ can manage flight crew"
  ON public.flight_crew FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flight_logs fl
    WHERE fl.id = flight_crew.flight_log_id
    AND get_org_role(auth.uid(), fl.organization_id) = ANY (ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role])
  ));

-- Updated_at trigger
CREATE TRIGGER update_flight_logs_updated_at
  BEFORE UPDATE ON public.flight_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for flight_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.flight_logs;
