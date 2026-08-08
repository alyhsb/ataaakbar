import { useState } from "react";
import { Bell, BellRing, CalendarPlus, CheckCircle2, AlarmClock } from "lucide-react";
import {
  useNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/donors-store";

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-IQ", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function NotificationBell({ donorId }: { donorId: string }) {
  const [open, setOpen] = useState(false);
  const items = useNotifications(donorId);
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="الإشعارات"
        className="relative rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
      >
        {unread > 0 ? <BellRing className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4" />}
        {unread > 0 ? (
          <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="surface-card absolute left-0 z-30 mt-2 w-80 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-display text-sm font-bold text-ink">الإشعارات</span>
            {unread > 0 ? (
              <button
                onClick={() => markAllNotificationsRead(donorId)}
                className="text-xs font-semibold text-primary"
              >
                تعليم الكل كمقروء
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                لا توجد إشعارات بعد
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => markNotificationRead(n.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-secondary ${
                      n.read ? "" : "bg-primary/5"
                    }`}
                  >
                    {n.kind === "new_month" ? (
                      <CalendarPlus className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    ) : n.kind === "reminder" ? (
                      <AlarmClock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-ink">{n.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground/70">
                        {timeLabel(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}