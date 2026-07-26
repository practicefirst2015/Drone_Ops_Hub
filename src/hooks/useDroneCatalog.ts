import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/contexts/OrgContext";

export function useManufacturers() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const manufacturers = useQuery({
    queryKey: ["drone_manufacturers", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_manufacturers")
        .select("*")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createManufacturer = useMutation({
    mutationFn: async (values: { name: string; country?: string; website?: string }) => {
      const { data, error } = await supabase
        .from("drone_manufacturers")
        .insert({ ...values, organization_id: orgId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_manufacturers", orgId] }),
  });

  const updateManufacturer = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("drone_manufacturers").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_manufacturers", orgId] }),
  });

  const deleteManufacturer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drone_manufacturers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_manufacturers", orgId] }),
  });

  return { manufacturers, createManufacturer, updateManufacturer, deleteManufacturer };
}

export function useDroneModels() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const models = useQuery({
    queryKey: ["drone_models", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_models")
        .select("*, drone_manufacturers(id, name, country)")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createModel = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from("drone_models")
        .insert({ ...values, organization_id: orgId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_models", orgId] }),
  });

  const updateModel = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("drone_models").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_models", orgId] }),
  });

  const deleteModel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drone_models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_models", orgId] }),
  });

  return { models, createModel, updateModel, deleteModel };
}

export function usePayloads() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const payloads = useQuery({
    queryKey: ["drone_payloads", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_payloads")
        .select("*")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createPayload = useMutation({
    mutationFn: async (values: { name: string; type?: string; weight_kg?: number; description?: string; manufacturer?: string }) => {
      const { data, error } = await supabase
        .from("drone_payloads")
        .insert({ ...values, organization_id: orgId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_payloads", orgId] }),
  });

  return { payloads, createPayload };
}

export function useModelPayloads(modelId: string | undefined) {
  const qc = useQueryClient();

  const modelPayloads = useQuery({
    queryKey: ["drone_model_payloads", modelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_model_payloads")
        .select("*, drone_payloads(id, name, type, weight_kg)")
        .eq("model_id", modelId!);
      if (error) throw error;
      return data;
    },
    enabled: !!modelId,
  });

  const addPayload = useMutation({
    mutationFn: async (values: { model_id: string; payload_id: string; notes?: string }) => {
      const { error } = await supabase.from("drone_model_payloads").insert(values);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_model_payloads", modelId] }),
  });

  const removePayload = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drone_model_payloads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drone_model_payloads", modelId] }),
  });

  return { modelPayloads, addPayload, removePayload };
}
