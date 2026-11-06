-- Already applied to production (hgggkbnxlgthydfzjkpt) on 2026-09-01 as
-- migration 20260901025625 "storage_tenant_isolation". Committed here so the
-- repo matches what production runs.

CREATE OR REPLACE FUNCTION public.storage_object_org(_bucket text, _name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parts text[];
  _s1 text;
  _s2 text;
  _uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  _org uuid;
BEGIN
  _parts := storage.foldername(_name);
  _s1 := COALESCE(_parts[1], '');
  _s2 := COALESCE(_parts[2], '');

  IF _bucket = 'project-documents' THEN
    IF _s1 = 'project' AND _s2 ~ _uuid_re THEN
      SELECT p.organization_id INTO _org FROM public.projects p WHERE p.id = _s2::uuid;
    ELSIF _s1 = 'client' AND _s2 ~ _uuid_re THEN
      SELECT c.organization_id INTO _org FROM public.clients c WHERE c.id = _s2::uuid;
    ELSIF _s1 IN ('invoices', 'mission-briefs', 'postflight-reports') AND _s2 ~ _uuid_re THEN
      SELECT o.id INTO _org FROM public.organizations o WHERE o.id = _s2::uuid;
    END IF;

  ELSIF _bucket = 'mission-deliverables' THEN
    IF _s1 ~ _uuid_re THEN
      SELECT o.id INTO _org FROM public.organizations o WHERE o.id = _s1::uuid;
      IF _org IS NULL THEN
        SELECT p.organization_id INTO _org FROM public.projects p WHERE p.id = _s1::uuid;
      END IF;
    END IF;
  END IF;

  RETURN _org;
END;
$$;

COMMENT ON FUNCTION public.storage_object_org(text, text) IS
  'Resolves the owning organisation for a storage object key. NULL means unrecognised shape, which storage policies treat as deny.';

CREATE OR REPLACE FUNCTION public.can_read_storage_object(_bucket text, _name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parts text[];
  _org uuid;
  _uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  _project uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  _org := public.storage_object_org(_bucket, _name);
  IF _org IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_org_member(auth.uid(), _org) THEN
    RETURN true;
  END IF;

  _parts := storage.foldername(_name);

  IF _bucket = 'project-documents'
     AND COALESCE(_parts[1], '') = 'project'
     AND COALESCE(_parts[2], '') ~ _uuid_re THEN
    _project := _parts[2]::uuid;
  ELSIF _bucket = 'mission-deliverables'
     AND COALESCE(_parts[2], '') = 'projects'
     AND COALESCE(_parts[3], '') ~ _uuid_re THEN
    _project := _parts[3]::uuid;
  END IF;

  IF _project IS NOT NULL THEN
    RETURN public.portal_can_access_project(auth.uid(), _project);
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_read_storage_object(text, text) IS
  'Storage SELECT predicate: org members see their org''s objects; portal users see documents on projects they can access.';

CREATE OR REPLACE FUNCTION public.can_write_storage_object(_bucket text, _name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.storage_object_org(_bucket, _name) IS NOT NULL
     AND public.get_org_role(auth.uid(), public.storage_object_org(_bucket, _name))
         IN ('owner', 'admin', 'manager', 'pilot');
$$;

COMMENT ON FUNCTION public.can_write_storage_object(text, text) IS
  'Storage INSERT/UPDATE/DELETE predicate: org members of role pilot or above.';

DROP POLICY IF EXISTS "Org members can read project docs" ON storage.objects;
DROP POLICY IF EXISTS "Contributors can upload project docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete project docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read from project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads from project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to mission-deliverables" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read from mission-deliverables" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from mission-deliverables" ON storage.objects;

CREATE POLICY "project-documents: tenant read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents' AND public.can_read_storage_object('project-documents', name));

CREATE POLICY "project-documents: tenant insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents' AND public.can_write_storage_object('project-documents', name));

CREATE POLICY "project-documents: tenant update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-documents' AND public.can_write_storage_object('project-documents', name))
  WITH CHECK (bucket_id = 'project-documents' AND public.can_write_storage_object('project-documents', name));

CREATE POLICY "project-documents: tenant delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents' AND public.can_write_storage_object('project-documents', name));

CREATE POLICY "mission-deliverables: tenant read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mission-deliverables' AND public.can_read_storage_object('mission-deliverables', name));

CREATE POLICY "mission-deliverables: tenant insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mission-deliverables' AND public.can_write_storage_object('mission-deliverables', name));

CREATE POLICY "mission-deliverables: tenant update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mission-deliverables' AND public.can_write_storage_object('mission-deliverables', name))
  WITH CHECK (bucket_id = 'mission-deliverables' AND public.can_write_storage_object('mission-deliverables', name));

CREATE POLICY "mission-deliverables: tenant delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mission-deliverables' AND public.can_write_storage_object('mission-deliverables', name));

REVOKE ALL ON FUNCTION public.storage_object_org(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_storage_object(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_storage_object(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_object_org(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_storage_object(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_storage_object(text, text) TO authenticated, service_role;
