import { Bell, XCircle, AlertTriangle, Info, ShieldAlert, Wrench, FileWarning, DollarSign, Package, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications, useNotificationBadge, type Notification, type NotificationType } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

const typeIcons: Record<NotificationType, typeof Bell> = {
  certification: ShieldAlert,
  maintenance: Wrench,
  postflight_issue: FileWarning,
  pilot_currency: ShieldAlert,
  blocked_mission: XCircle,
  overdue_invoice: DollarSign,
  incomplete_deliverable: Package,
};

const urgencyStyles = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-muted-foreground",
};

function NotificationRow({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (n: Notification) => void;
}) {
  const Icon = typeIcons[notification.type] || Info;
  const colorClass = urgencyStyles[notification.urgency];

  return (
    <button
      onClick={() => onSelect(notification)}
      className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-mono text-xs truncate ${notification.isRead ? "text-muted-foreground" : "text-foreground"}`}>
          {notification.title}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground truncate">{notification.subtitle}</p>
        <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && (
        <div className="flex-shrink-0 mt-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
      )}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Bell className="w-6 h-6 text-muted-foreground/40 mb-2" />
      <p className="font-mono text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Inner panel — only rendered when popover is open.
 * This triggers the heavy useNotifications hook.
 */
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useNotifications();
  const navigate = useNavigate();

  const handleSelect = (n: Notification) => {
    if (!n.isRead) markRead(n.id);
    onClose();
    navigate(n.link);
  };

  const unread = notifications.filter((n) => !n.isRead);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Notifications</p>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-1 font-mono text-[10px] text-primary hover:text-primary/80 transition-colors"
          >
            <Check className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      <Tabs defaultValue="unread" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 mb-0 h-8 bg-secondary">
          <TabsTrigger value="unread" className="font-mono text-[10px] h-6 px-3">
            Unread{unreadCount > 0 && ` (${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value="all" className="font-mono text-[10px] h-6 px-3">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="flex-1 overflow-y-auto mt-0">
          {isLoading ? (
            <div className="px-4 py-6">
              <div className="h-3 w-32 bg-secondary animate-pulse mb-2" />
              <div className="h-3 w-48 bg-secondary animate-pulse" />
            </div>
          ) : unread.length === 0 ? (
            <EmptyState message="All caught up" />
          ) : (
            unread.map((n) => <NotificationRow key={n.id} notification={n} onSelect={handleSelect} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="flex-1 overflow-y-auto mt-0">
          {isLoading ? (
            <div className="px-4 py-6">
              <div className="h-3 w-32 bg-secondary animate-pulse mb-2" />
              <div className="h-3 w-48 bg-secondary animate-pulse" />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState message="No notifications" />
          ) : (
            notifications.map((n) => <NotificationRow key={n.id} notification={n} onSelect={handleSelect} />)
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  // Badge uses a lightweight query — no heavy alert chain
  const { dismissedKeys } = useNotificationBadge();

  // We don't know exact unread count without the heavy hook,
  // but we show a simple dot indicator if there are fewer than expected dismissals
  // The full count loads when popover opens.

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
          {/* Show a small dot as a hint — exact count loads on open */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 max-h-[500px] flex flex-col">
        {open && <NotificationPanel onClose={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  );
}
