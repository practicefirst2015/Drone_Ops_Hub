
-- Enum for task status
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done');

-- Enum for task priority
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ==================
-- TASKS (project-scoped)
-- ==================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);

CREATE POLICY "Members can view org tasks"
  ON public.tasks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager', 'pilot'));

CREATE POLICY "Managers+ can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager', 'pilot'));

CREATE POLICY "Admins+ can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- ==================
-- PROJECT MEMBERS (assign users to projects)
-- ==================
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);

CREATE POLICY "Members can view project members"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_org_member(auth.uid(), p.organization_id)
    )
  );

CREATE POLICY "Managers+ can manage project members"
  ON public.project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.get_org_role(auth.uid(), p.organization_id) IN ('owner', 'admin', 'manager')
    )
  );

-- ==================
-- PROJECT DRONES (assign drones to projects)
-- ==================
CREATE TABLE public.drones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  battery_level INTEGER DEFAULT 100,
  flight_hours NUMERIC(10,1) DEFAULT 0,
  next_maintenance DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drones ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_drones_updated_at
  BEFORE UPDATE ON public.drones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_drones_org ON public.drones(organization_id);

CREATE POLICY "Members can view org drones"
  ON public.drones FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage drones"
  ON public.drones FOR ALL
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

CREATE TABLE public.project_drones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drone_id UUID NOT NULL REFERENCES public.drones(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, drone_id)
);

ALTER TABLE public.project_drones ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_drones_project ON public.project_drones(project_id);

CREATE POLICY "Members can view project drones"
  ON public.project_drones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_org_member(auth.uid(), p.organization_id)
    )
  );

CREATE POLICY "Managers+ can manage project drones"
  ON public.project_drones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.get_org_role(auth.uid(), p.organization_id) IN ('owner', 'admin', 'manager')
    )
  );

-- ==================
-- SKILLS
-- ==================
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_skills_org ON public.skills(organization_id);

CREATE POLICY "Members can view org skills"
  ON public.skills FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can manage skills"
  ON public.skills FOR ALL
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

-- Required skills for a project
CREATE TABLE public.project_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, skill_id)
);

ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_skills_project ON public.project_skills(project_id);

CREATE POLICY "Members can view project skills"
  ON public.project_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_org_member(auth.uid(), p.organization_id)
    )
  );

CREATE POLICY "Managers+ can manage project skills"
  ON public.project_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.get_org_role(auth.uid(), p.organization_id) IN ('owner', 'admin', 'manager')
    )
  );

-- ==================
-- INVOICES (org-scoped, linkable to projects)
-- ==================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  issued_date DATE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_invoices_project ON public.invoices(project_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);

CREATE POLICY "Members can view org invoices"
  ON public.invoices FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

CREATE POLICY "Managers+ can update invoices"
  ON public.invoices FOR UPDATE
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

CREATE POLICY "Admins+ can delete invoices"
  ON public.invoices FOR DELETE
  USING (public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));
