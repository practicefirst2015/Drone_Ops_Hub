
-- ==================
-- DRONE MANUFACTURERS
-- ==================
CREATE TABLE public.drone_manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.drone_manufacturers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_drone_manufacturers_org ON public.drone_manufacturers(organization_id);

CREATE POLICY "Members can view drone manufacturers"
  ON public.drone_manufacturers FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage drone manufacturers"
  ON public.drone_manufacturers FOR ALL
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

-- ==================
-- DRONE MODELS (catalog/specs)
-- ==================
CREATE TABLE public.drone_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  manufacturer_id UUID NOT NULL REFERENCES public.drone_manufacturers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'multirotor',
  -- Flight specs
  max_flight_time_min INTEGER,
  max_range_km NUMERIC(8,2),
  max_speed_ms NUMERIC(8,2),
  max_altitude_m INTEGER,
  max_wind_resistance_ms NUMERIC(6,2),
  -- Physical specs
  weight_kg NUMERIC(8,3),
  max_payload_kg NUMERIC(8,3),
  dimensions TEXT,
  folded_dimensions TEXT,
  -- Propulsion
  propeller_count INTEGER,
  motor_type TEXT,
  -- Navigation & sensors
  gps_type TEXT,
  obstacle_avoidance TEXT,
  positioning_accuracy TEXT,
  -- Camera/imaging
  has_built_in_camera BOOLEAN DEFAULT false,
  camera_sensor TEXT,
  camera_resolution TEXT,
  video_resolution TEXT,
  gimbal_stabilization TEXT,
  -- Operations
  ip_rating TEXT,
  operating_temp_range TEXT,
  noise_level_db NUMERIC(5,1),
  -- Certifications
  faa_category TEXT,
  remote_id_capable BOOLEAN DEFAULT true,
  -- Meta
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, manufacturer_id, name)
);

ALTER TABLE public.drone_models ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_drone_models_org ON public.drone_models(organization_id);
CREATE INDEX idx_drone_models_manufacturer ON public.drone_models(manufacturer_id);
CREATE INDEX idx_drone_models_category ON public.drone_models(category);

CREATE TRIGGER update_drone_models_updated_at
  BEFORE UPDATE ON public.drone_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Members can view drone models"
  ON public.drone_models FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage drone models"
  ON public.drone_models FOR ALL
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

-- ==================
-- PAYLOADS
-- ==================
CREATE TABLE public.drone_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'camera',
  weight_kg NUMERIC(8,3),
  description TEXT,
  manufacturer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.drone_payloads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_drone_payloads_org ON public.drone_payloads(organization_id);

CREATE POLICY "Members can view payloads"
  ON public.drone_payloads FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage payloads"
  ON public.drone_payloads FOR ALL
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

-- ==================
-- MODEL-PAYLOAD COMPATIBILITY
-- ==================
CREATE TABLE public.drone_model_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.drone_models(id) ON DELETE CASCADE,
  payload_id UUID NOT NULL REFERENCES public.drone_payloads(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_id, payload_id)
);

ALTER TABLE public.drone_model_payloads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_drone_model_payloads_model ON public.drone_model_payloads(model_id);
CREATE INDEX idx_drone_model_payloads_payload ON public.drone_model_payloads(payload_id);

CREATE POLICY "Members can view model payloads"
  ON public.drone_model_payloads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drone_models m
      WHERE m.id = model_id
      AND public.is_org_member(auth.uid(), m.organization_id)
    )
  );

CREATE POLICY "Managers+ can manage model payloads"
  ON public.drone_model_payloads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.drone_models m
      WHERE m.id = model_id
      AND public.get_org_role(auth.uid(), m.organization_id) IN ('owner', 'admin', 'manager')
    )
  );

-- Link existing drones table to drone_models
ALTER TABLE public.drones ADD COLUMN drone_model_id UUID REFERENCES public.drone_models(id) ON DELETE SET NULL;
CREATE INDEX idx_drones_model ON public.drones(drone_model_id);
