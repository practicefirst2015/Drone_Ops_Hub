
-- Enum for membership roles
CREATE TYPE public.membership_role AS ENUM ('owner', 'admin', 'manager', 'pilot', 'viewer');

-- Enum for app-level roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Enum for project status
CREATE TYPE public.project_status AS ENUM ('draft', 'active', 'pending', 'complete', 'archived');

-- Enum for client status
CREATE TYPE public.client_status AS ENUM ('active', 'inactive');

-- Timestamp updater function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==================
-- PROFILES
-- ==================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================
-- USER ROLES (app-level)
-- ==================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ==================
-- ORGANIZATIONS
-- ==================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================
-- MEMBERSHIPS
-- ==================
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Helper: get user's org role
CREATE OR REPLACE FUNCTION public.get_org_role(_user_id UUID, _org_id UUID)
RETURNS membership_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.memberships
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1
$$;

-- Memberships: members can see co-members
CREATE POLICY "Members can view org memberships"
  ON public.memberships FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can manage memberships"
  ON public.memberships FOR ALL
  USING (
    public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "Users can view their own memberships"
  ON public.memberships FOR SELECT
  USING (auth.uid() = user_id);

-- Organizations: visible to members
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (public.get_org_role(auth.uid(), id) = 'owner');

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==================
-- CLIENTS (org-scoped)
-- ==================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  phone TEXT,
  status client_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Members can view org clients"
  ON public.clients FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "Managers+ can update clients"
  ON public.clients FOR UPDATE
  USING (
    public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "Admins+ can delete clients"
  ON public.clients FOR DELETE
  USING (
    public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- ==================
-- PROJECTS (org-scoped)
-- ==================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'draft',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Members can view org projects"
  ON public.projects FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "Managers+ can update projects"
  ON public.projects FOR UPDATE
  USING (
    public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "Admins+ can delete projects"
  ON public.projects FOR DELETE
  USING (
    public.get_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Indexes for performance
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Function to create org + owner membership in one transaction
CREATE OR REPLACE FUNCTION public.create_organization(_name TEXT, _slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  INSERT INTO public.memberships (user_id, organization_id, role)
  VALUES (auth.uid(), _org_id, 'owner');

  RETURN _org_id;
END;
$$;
