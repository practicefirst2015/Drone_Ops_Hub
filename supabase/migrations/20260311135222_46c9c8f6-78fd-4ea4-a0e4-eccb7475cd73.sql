
-- 1. Add acquisition_date to drones table
ALTER TABLE public.drones ADD COLUMN IF NOT EXISTS acquisition_date date DEFAULT NULL;

-- 2. Add drone_id to flight_logs for specific unit tracking
ALTER TABLE public.flight_logs ADD COLUMN IF NOT EXISTS drone_id uuid DEFAULT NULL REFERENCES public.drones(id) ON DELETE SET NULL;

-- 3. Create batteries table
CREATE TABLE public.batteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  drone_id uuid DEFAULT NULL REFERENCES public.drones(id) ON DELETE SET NULL,
  name text NOT NULL,
  serial_number text DEFAULT NULL,
  type text NOT NULL DEFAULT 'LiPo',
  capacity_mah integer DEFAULT NULL,
  cycle_count integer NOT NULL DEFAULT 0,
  health_percent integer DEFAULT 100,
  status text NOT NULL DEFAULT 'available',
  notes text DEFAULT NULL,
  acquired_date date DEFAULT NULL,
  retired_date date DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.batteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org batteries" ON public.batteries
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage batteries" ON public.batteries
  FOR ALL TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]))
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

-- 4. Create maintenance_events table for service history
CREATE TABLE public.maintenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  drone_id uuid NOT NULL REFERENCES public.drones(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'routine',
  description text NOT NULL,
  performed_by uuid DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at date NOT NULL DEFAULT CURRENT_DATE,
  cost numeric DEFAULT NULL,
  parts_replaced text DEFAULT NULL,
  flight_hours_at_service numeric DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org maintenance events" ON public.maintenance_events
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage maintenance events" ON public.maintenance_events
  FOR ALL TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]))
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role]));

-- 5. Create mission_drones junction table for specific unit assignment to missions
CREATE TABLE public.mission_drones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  drone_id uuid NOT NULL REFERENCES public.drones(id) ON DELETE CASCADE,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mission_id, drone_id)
);

ALTER TABLE public.mission_drones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view mission drones" ON public.mission_drones
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM missions m WHERE m.id = mission_drones.mission_id AND is_org_member(auth.uid(), m.organization_id)
  ));

CREATE POLICY "Managers+ can manage mission drones" ON public.mission_drones
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM missions m WHERE m.id = mission_drones.mission_id
    AND get_org_role(auth.uid(), m.organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM missions m WHERE m.id = mission_drones.mission_id
    AND get_org_role(auth.uid(), m.organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role, 'manager'::membership_role])
  ));

-- Add updated_at trigger for batteries
CREATE TRIGGER update_batteries_updated_at BEFORE UPDATE ON public.batteries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
