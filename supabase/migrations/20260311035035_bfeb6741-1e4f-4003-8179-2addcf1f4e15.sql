
-- Organization settings table
CREATE TABLE public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  default_tax_rate numeric DEFAULT 0,
  default_payment_terms_days integer DEFAULT 30,
  default_discount_type text DEFAULT 'flat',
  default_currency text DEFAULT 'USD',
  invoice_notes_template text DEFAULT '',
  alert_cert_expiry_days integer DEFAULT 14,
  alert_maintenance_threshold numeric DEFAULT 90,
  alert_issue_age_days integer DEFAULT 7,
  alerts_enabled boolean DEFAULT true,
  client_can_view_flight_logs boolean DEFAULT false,
  client_can_view_invoices boolean DEFAULT true,
  client_can_view_deliverables boolean DEFAULT true,
  client_can_view_mission_status boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org settings"
  ON public.organization_settings FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins+ can manage org settings"
  ON public.organization_settings FOR ALL TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role]))
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role]));

CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Project categories table
CREATE TABLE public.project_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories"
  ON public.project_categories FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins+ can manage categories"
  ON public.project_categories FOR ALL TO authenticated
  USING (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role]))
  WITH CHECK (get_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::membership_role, 'admin'::membership_role]));
