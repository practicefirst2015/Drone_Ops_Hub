import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getIntegrationDef } from "@/lib/integrationRegistry";

export interface OrgIntegration {
  id: string;
  organization_id: string;
  integration_key: string;
  enabled: boolean;
  config: Record<string, any>;
  credentials_encrypted: Record<string, any>;
  status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useIntegrations() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["org-integrations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any)
        .from("organization_integrations")
        .select("*")
        .eq("organization_id", orgId)
        .order("integration_key");
      if (error) throw error;
      return (data ?? []) as OrgIntegration[];
    },
    enabled: !!orgId,
  });

  const getIntegration = (key: string) =>
    integrations.find((i) => i.integration_key === key);

  const isEnabled = (key: string) =>
    getIntegration(key)?.enabled ?? false;

  const upsertIntegration = useMutation({
    mutationFn: async ({
      integrationKey,
      enabled,
      config,
      credentials,
    }: {
      integrationKey: string;
      enabled?: boolean;
      config?: Record<string, any>;
      credentials?: Record<string, any>;
    }) => {
      if (!orgId) throw new Error("No organization");

      const existing = getIntegration(integrationKey);
      const def = getIntegrationDef(integrationKey);
      if (!def) throw new Error("Unknown integration");

      // Determine new status
      let status = "not_configured";
      const creds = credentials ?? existing?.credentials_encrypted ?? {};
      const hasRequiredCreds = def.credentialFields
        .filter((f) => f.required)
        .every((f) => creds[f.key]);
      if (hasRequiredCreds && (enabled ?? existing?.enabled)) {
        status = "configured";
      } else if (hasRequiredCreds) {
        status = "configured";
      }

      const updates: Record<string, any> = {
        organization_id: orgId,
        integration_key: integrationKey,
        status,
      };
      if (enabled !== undefined) updates.enabled = enabled;
      if (config) updates.config = config;
      if (credentials) updates.credentials_encrypted = credentials;
      updates.updated_at = new Date().toISOString();

      if (existing) {
        const { error } = await (supabase as any)
          .from("organization_integrations")
          .update(updates)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("organization_integrations")
          .insert(updates);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-integrations", orgId] });
      toast.success("Integration updated");
    },
    onError: () => toast.error("Failed to update integration"),
  });

  const toggleIntegration = useMutation({
    mutationFn: async ({ integrationKey, enabled }: { integrationKey: string; enabled: boolean }) => {
      await upsertIntegration.mutateAsync({ integrationKey, enabled });
    },
  });

  return {
    integrations,
    isLoading,
    getIntegration,
    isEnabled,
    upsertIntegration,
    toggleIntegration,
  };
}
