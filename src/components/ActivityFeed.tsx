import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  FolderKanban, Users, FileText, Upload, Plane, Award, ShieldCheck,
  BookOpen, Settings, Trash2, CheckCircle2, Send, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const ACTION_ICONS: Record<string, any> = {
  created: CheckCircle2,
  updated: Settings,
  deleted: Trash2,
  status_changed: ArrowRight,
  uploaded: Upload,
  generated: FileText,
  assigned: Users,
  verified: ShieldCheck,
};

const ENTITY_ICONS: Record<string, any> = {
  project: FolderKanban,
  client: Users,
  invoice: FileText,
  document: Upload,
  drone: Plane,
  drone_model: Plane,
  skill: BookOpen,
  certification: Award,
  user_skill: ShieldCheck,
  task: CheckCircle2,
  invoice_file: FileText,
};

const ENTITY_ROUTES: Record<string, string> = {
  project: "/projects",
  client: "/clients",
  invoice: "/invoices",
};

function actionLabel(action: string, entityType: string, entityName?: string | null, metadata?: any): string {
  const name = entityName ? `"${entityName}"` : "";
  switch (action) {
    case "created": return `Created ${entityType} ${name}`;
    case "updated": return `Updated ${entityType} ${name}`;
    case "deleted": return `Deleted ${entityType} ${name}`;
    case "status_changed": return `Changed ${entityType} ${name} status to ${metadata?.new_status || "—"}`;
    case "uploaded": return `Uploaded ${entityType === "document" ? "document" : "file"} ${name}`;
    case "generated": return `Generated PDF for invoice ${name}`;
    case "assigned": return `Assigned skill ${name}`;
    case "verified": return `Verified skill ${name}`;
    default: return `${action} ${entityType} ${name}`;
  }
}

type Props = {
  entityType?: string;
  entityId?: string;
  limit?: number;
  showEntity?: boolean;
};

export function ActivityFeed({ entityType, entityId, limit = 15, showEntity = true }: Props) {
  const { currentOrg } = useOrg();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity_logs", currentOrg?.id, entityType, entityId],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("*, profiles:user_id(full_name)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entityType) query = query.eq("entity_type", entityType);
      if (entityId) query = query.eq("entity_id", entityId);

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentOrg,
  });

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="w-2 h-2 bg-primary animate-pulse-glow mx-auto" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="px-6 py-8 text-center font-mono text-xs text-muted-foreground">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {logs.map((log) => {
        const ActionIcon = ACTION_ICONS[log.action] || Settings;
        const EntityIcon = ENTITY_ICONS[log.entity_type] || FolderKanban;
        const route = ENTITY_ROUTES[log.entity_type];
        const label = actionLabel(log.action, log.entity_type, log.entity_name, log.metadata);

        return (
          <div key={log.id} className="px-6 py-3.5 flex items-start gap-3">
            <div className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center bg-secondary/50 rounded">
              <ActionIcon className="w-3 h-3 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground leading-snug">
                {route && log.entity_id && showEntity ? (
                  <Link to={`${route}/${log.entity_id}`} className="hover:text-primary transition-colors">
                    {label}
                  </Link>
                ) : (
                  label
                )}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {log.profiles?.full_name || "System"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60">·</span>
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
                {showEntity && (
                  <>
                    <span className="font-mono text-[10px] text-muted-foreground/60">·</span>
                    <EntityIcon className="w-3 h-3 text-muted-foreground/40" />
                    <span className="font-mono text-[10px] text-muted-foreground/40">{log.entity_type}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
