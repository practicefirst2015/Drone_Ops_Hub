import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useOrgSettings() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["org-settings", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (error) throw error;

      // Auto-create settings row if it doesn't exist
      if (!data) {
        const { data: created, error: createError } = await supabase
          .from("organization_settings")
          .insert({ organization_id: orgId })
          .select()
          .single();
        if (createError) throw createError;
        return created;
      }
      return data;
    },
    enabled: !!orgId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!settings?.id) return;
      const { error } = await supabase
        .from("organization_settings")
        .update(updates)
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings", orgId] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  return { settings, isLoading, updateSettings };
}
