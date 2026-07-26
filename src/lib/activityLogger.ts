import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "created" | "updated" | "deleted"
  | "status_changed" | "uploaded" | "generated"
  | "assigned" | "verified"
  | "logged_in" | "logged_out"
  | "invited" | "removed" | "role_changed"
  | "exported" | "archived" | "restored"
  | "approved" | "rejected" | "completed";

export type EntityType =
  | "project" | "client" | "invoice" | "document"
  | "drone" | "drone_model" | "skill" | "certification"
  | "user_skill" | "task" | "invoice_file"
  | "mission" | "flight_log" | "membership"
  | "settings" | "category" | "deliverable"
  | "postflight_issue" | "checklist";

export async function logActivity(params: {
  organizationId: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("activity_logs").insert({
      organization_id: params.organizationId,
      user_id: user.id,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      entity_name: params.entityName || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.warn("[ActivityLog] Failed to write log:", error.message);
    }
  } catch (err) {
    // Activity logging should never break the calling flow
    console.warn("[ActivityLog] Unexpected error:", err);
  }
}
