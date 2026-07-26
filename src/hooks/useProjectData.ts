import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/contexts/OrgContext";
import { logActivity } from "@/lib/activityLogger";

export function useProjects() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const projects = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createProject = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      client_id?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      budget?: number;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...values, organization_id: orgId!, status: (values.status || "draft") as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["projects", orgId] });
      qc.invalidateQueries({ queryKey: ["map_projects"] });
      if (orgId) logActivity({ organizationId: orgId, action: "created", entityType: "project", entityId: data.id, entityName: data.name });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["projects", orgId] });
      qc.invalidateQueries({ queryKey: ["project", vars.id] });
      qc.invalidateQueries({ queryKey: ["map_projects"] });
      if (orgId) logActivity({ organizationId: orgId, action: "updated", entityType: "project", entityId: vars.id, entityName: data.name });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries({ queryKey: ["projects", orgId] });
      qc.invalidateQueries({ queryKey: ["project", deletedId] });
      qc.invalidateQueries({ queryKey: ["map_projects"] });
      qc.invalidateQueries({ queryKey: ["tasks", deletedId] });
      qc.invalidateQueries({ queryKey: ["project_members", deletedId] });
      qc.invalidateQueries({ queryKey: ["project_drones", deletedId] });
      qc.invalidateQueries({ queryKey: ["project_skills", deletedId] });
      qc.invalidateQueries({ queryKey: ["project_notes", deletedId] });
      qc.invalidateQueries({ queryKey: ["project_documents", deletedId] });
      qc.invalidateQueries({ queryKey: ["project_invoices", deletedId] });
      qc.invalidateQueries({ queryKey: ["project_deliverables", deletedId] });
    },
  });

  return { projects, createProject, updateProject, deleteProject };
}

export function useProject(projectId: string | undefined) {
  const { currentOrg } = useOrg();

  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name)")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!currentOrg,
  });
}

export function useProjectTasks(projectId: string | undefined) {
  const qc = useQueryClient();

  const tasks = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, profiles:assigned_to(id, full_name)")
        .eq("project_id", projectId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const createTask = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      assigned_to?: string;
      due_date?: string;
      project_id: string;
      organization_id: string;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...values,
          status: (values.status || "todo") as any,
          priority: (values.priority || "medium") as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  return { tasks, createTask, updateTask, deleteTask };
}

export function useProjectMembers(projectId: string | undefined) {
  const qc = useQueryClient();

  const members = useQuery({
    queryKey: ["project_members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("*, profiles:user_id(id, full_name, avatar_url)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const addMember = useMutation({
    mutationFn: async (values: { project_id: string; user_id: string; role?: string }) => {
      const { data, error } = await supabase
        .from("project_members")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_members", projectId] }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_members", projectId] }),
  });

  return { members, addMember, removeMember };
}

export function useProjectDrones(projectId: string | undefined) {
  const qc = useQueryClient();

  const drones = useQuery({
    queryKey: ["project_drones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_drones")
        .select("*, drones(id, name, model, status, battery_level)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const assignDrone = useMutation({
    mutationFn: async (values: { project_id: string; drone_id: string }) => {
      const { data, error } = await supabase
        .from("project_drones")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_drones", projectId] }),
  });

  const removeDrone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_drones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_drones", projectId] }),
  });

  return { drones, assignDrone, removeDrone };
}

export function useProjectSkills(projectId: string | undefined) {
  const qc = useQueryClient();

  const skills = useQuery({
    queryKey: ["project_skills", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_skills")
        .select("*, skills(id, name)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const addSkill = useMutation({
    mutationFn: async (values: { project_id: string; skill_id: string }) => {
      const { data, error } = await supabase
        .from("project_skills")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_skills", projectId] }),
  });

  const removeSkill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_skills", projectId] }),
  });

  return { skills, addSkill, removeSkill };
}

export function useProjectInvoices(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_invoices", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useOrgMembers() {
  const { currentOrg } = useOrg();

  return useQuery({
    queryKey: ["org_members", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("*, profiles:user_id(id, full_name, avatar_url)")
        .eq("organization_id", currentOrg!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });
}

export function useOrgDrones() {
  const { currentOrg } = useOrg();

  return useQuery({
    queryKey: ["org_drones", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drones")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });
}

export function useOrgSkills() {
  const { currentOrg } = useOrg();

  return useQuery({
    queryKey: ["org_skills", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });
}

export function useProjectNotes(projectId: string | undefined) {
  const qc = useQueryClient();

  const notes = useQuery({
    queryKey: ["project_notes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*, profiles:user_id(id, full_name, avatar_url)")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const addNote = useMutation({
    mutationFn: async (values: { project_id: string; user_id: string; content: string; note_type?: string }) => {
      const { data, error } = await supabase
        .from("project_notes")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_notes", projectId] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_notes", projectId] }),
  });

  return { notes, addNote, deleteNote };
}

export function useProjectDocuments(projectId: string | undefined) {
  const qc = useQueryClient();

  const documents = useQuery({
    queryKey: ["project_documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*, profiles:uploaded_by(id, full_name)")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const addDocument = useMutation({
    mutationFn: async (values: {
      project_id: string;
      uploaded_by: string;
      file_name: string;
      file_url: string;
      file_size_bytes?: number;
      mime_type?: string;
    }) => {
      const { data, error } = await supabase
        .from("project_documents")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_documents", projectId] }),
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_documents", projectId] }),
  });

  return { documents, addDocument, deleteDocument };
}
