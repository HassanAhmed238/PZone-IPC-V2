import { Bell, CheckCheck } from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();

  const handleClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.related_entity_type === "budget_header" && notification.related_entity_id) {
      navigate(`/budgets/${notification.related_entity_id}`);
    }
  };

  const typeIcon: Record<string, string> = {
    budget_approval: "📋",
    info: "ℹ️",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-heading font-semibold text-sm">الإشعارات</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead.mutate()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck size={14} />
              قراءة الكل
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              لا توجد إشعارات
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-right px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex gap-3">
                  <span className="text-lg mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
