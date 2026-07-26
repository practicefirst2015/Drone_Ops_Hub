import { useOperationalAlerts, type OperationalAlert, type AlertType } from "@/hooks/useOperationalAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, isBefore } from "date-fns";
import { useEffect } from "react";

export type NotificationType = AlertType | "blocked_mission" | "overdue_invoice" | "incomplete_deliverable";

export interface Notification {
  id: string;
  type: NotificationType;
  urgency: "critical" | "warning" | "info";
  title: string;
  subtitle: string;
  link: string;
  timestamp: Date;
  isRead: boolean;
}

function alertToLink(alert: OperationalAlert): string {
  switch (alert.type) {
    case "certification":
    case "pilot_currency":
      return "/skills";
    case "maintenance":
      return "/drones";
    case "postflight_issue":
      return alert.metadata?.flightLogId ? `/flight-logs/${alert.metadata.flightLogId}` : "/flight-logs";
    default:
      return "/";
  }
}

/**
 * Lightweight hook that only fetches dismissal keys + counts.
 * Used by the bell icon badge — does NOT trigger the heavy alert chain.
 */
export function useNotificationBadge() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const userId = user?.id;

  const dismissals = useQuery({
    queryKey: ["notification_dismissals", userId, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_dismissals")
        .select("alert_key")
        .eq("user_id", userId!)
        .eq("organization_id", orgId!);
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.alert_key));
    },
    enabled: !!userId && !!orgId,
    staleTime: 120_000, // 2 min — badge doesn't need to be instant
  });

  return { dismissedKeys: dismissals.data ?? new Set<string>(), isLoading: dismissals.isLoading };
}

/**
 * Full notifications hook — only use when the notification panel is OPEN.
 * Triggers the heavy useOperationalAlerts + dashboard data chain.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { alerts, isLoading: alertsLoading } = useOperationalAlerts();

  // Lightweight dashboard queries scoped to notifications
  const missions = useQuery({
    queryKey: ["notif_missions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("id, title, status, mission_date, go_status, project_id, projects(name)")
        .eq("organization_id", orgId!)
        .eq("go_status", "no_go" as any)
        .in("status", ["draft", "planning", "approved", "ready", "in_progress"])
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const invoices = useQuery({
    queryKey: ["notif_invoices", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, clients(name)")
        .eq("organization_id", orgId!)
        .in("status", ["issued", "overdue"])
        .order("due_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const deliverables = useQuery({
    queryKey: ["notif_deliverables", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_deliverables")
        .select("id, deliverable_type, label, status, project_id, projects(name)")
        .eq("organization_id", orgId!)
        .in("status", ["expected", "partial", "not_captured", "in_processing"])
        .limit(15);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const dismissals = useQuery({
    queryKey: ["notification_dismissals", userId, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_dismissals")
        .select("alert_key")
        .eq("user_id", userId!)
        .eq("organization_id", orgId!);
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.alert_key));
    },
    enabled: !!userId && !!orgId,
    staleTime: 120_000,
  });

  const dismissedKeys = dismissals.data ?? new Set<string>();
  const now = new Date();

  // Convert operational alerts
  const notifications: Notification[] = alerts.map((a) => ({
    id: a.id,
    type: a.type,
    urgency: a.urgency,
    title: a.title,
    subtitle: a.subtitle,
    link: alertToLink(a),
    timestamp: a.dueDate,
    isRead: dismissedKeys.has(a.id),
  }));

  // Blocked missions
  if (missions.data) {
    for (const m of missions.data as any[]) {
      const id = `blocked-mission-${m.id}`;
      notifications.push({
        id,
        type: "blocked_mission",
        urgency: "critical",
        title: `Mission blocked: ${m.title}`,
        subtitle: m.projects?.name || "No project",
        link: `/missions`,
        timestamp: m.mission_date ? new Date(m.mission_date) : now,
        isRead: dismissedKeys.has(id),
      });
    }
  }

  // Overdue invoices
  if (invoices.data) {
    for (const inv of invoices.data as any[]) {
      if (inv.status === "overdue" || (inv.due_date && isBefore(new Date(inv.due_date), now) && inv.status === "issued")) {
        const id = `overdue-invoice-${inv.id}`;
        const daysOverdue = inv.due_date ? differenceInDays(now, new Date(inv.due_date)) : 0;
        notifications.push({
          id,
          type: "overdue_invoice",
          urgency: daysOverdue > 30 ? "critical" : "warning",
          title: `Invoice ${inv.invoice_number} overdue`,
          subtitle: inv.clients?.name || "No client",
          link: `/invoices/${inv.id}`,
          timestamp: inv.due_date ? new Date(inv.due_date) : now,
          isRead: dismissedKeys.has(id),
        });
      }
    }
  }

  // Incomplete deliverables
  if (deliverables.data) {
    for (const d of deliverables.data as any[]) {
      const id = `incomplete-del-${d.id}`;
      notifications.push({
        id,
        type: "incomplete_deliverable",
        urgency: "info",
        title: `Deliverable incomplete: ${d.label || d.deliverable_type}`,
        subtitle: d.projects?.name || "No project",
        link: `/projects/${d.project_id}`,
        timestamp: now,
        isRead: dismissedKeys.has(id),
      });
    }
  }

  // Sort: unread first, then by urgency
  const urgencyRank = { critical: 0, warning: 1, info: 2 };
  notifications.sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return urgencyRank[a.urgency] - urgencyRank[b.urgency];
  });

  const markRead = useMutation({
    mutationFn: async (alertKey: string) => {
      const { error } = await supabase
        .from("notification_dismissals")
        .upsert({ user_id: userId!, alert_key: alertKey, organization_id: orgId! }, { onConflict: "user_id,alert_key" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification_dismissals"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.isRead);
      if (unread.length === 0) return;
      const rows = unread.map((n) => ({ user_id: userId!, alert_key: n.id, organization_id: orgId! }));
      const { error } = await supabase
        .from("notification_dismissals")
        .upsert(rows, { onConflict: "user_id,alert_key" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification_dismissals"] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isLoading = alertsLoading || missions.isLoading || invoices.isLoading || deliverables.isLoading || dismissals.isLoading;

  // Realtime subscriptions — invalidate relevant queries on any change
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`notifications-${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "missions", filter: `organization_id=eq.${orgId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notif_missions", orgId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `organization_id=eq.${orgId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notif_invoices", orgId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_deliverables", filter: `organization_id=eq.${orgId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notif_deliverables", orgId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notification_dismissals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["notification_dismissals"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return { notifications, unreadCount, markRead: markRead.mutate, markAllRead: markAllRead.mutate, isLoading };
}
