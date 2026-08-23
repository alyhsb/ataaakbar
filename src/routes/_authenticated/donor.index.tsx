import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Clock, XCircle } from "lucide-react";
import { AppShell, StatusPill } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/lib/auth";
import {
  useMyMemberships,
  useStoreLoaded,
  formatIQD,
  donorStatus,
  overdueDays,
  nextDueDate,
  mawkibName,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/donor/")({
  head: () => ({
    meta: [
      { title: "مواكبي — عطاء الأكبر" },
      {
        name: "description",
        content: "تابع اشتراكاتك الشهرية في كل موكب حسيني تنتمي إليه ضمن تطبيق عطاء الأكبر.",
      },
      { property: "og:title", content: "مواكبي — عطاء الأكبر" },
      { property: "og:description", content: "لوحة المتبرع لمتابعة اشتراكاته في عدة مواكب." },
    ],
  }),
  component: DonorHome,
});

function DonorHome() {
  const { userId } = useAuth();
  const loaded = useStoreLoaded();
  const memberships = useMyMemberships(userId ?? undefined);
  const active = memberships.filter((m) => m.membershipStatus === "active");
  const pending = memberships.filter((m) => m.membershipStatus === "pending");
  const rejected = memberships.filter((m) => m.membershipStatus === "rejected");
  const name = memberships[0]?.name ?? "متبرع";

  return (
    <AppShell
      title={`السلام عليكم، ${name}`}
      subtitle="مواكبك واشتراكاتك الشهرية"
      action={active[0] ? <NotificationBell donorId={active[0].id} /> : undefined}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink">مواكبي</h2>
        <Link
          to="/donor/browse"
          className="gradient-emerald flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
        >
          <Plus className="h-4 w-4" />
          إضافة موكب
        </Link>
      </div>

      {!loaded ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
      ) : memberships.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          لم تنضم إلى أي موكب بعد. اختر «إضافة موكب» لتصفح المواكب المتاحة.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((m) => {
            const over = overdueDays(m);
            return (
              <Link
                key={m.id}
                to="/donor/mawkib/$donorId"
                params={{ donorId: m.id }}
                className="surface-card block p-5 transition-shadow hover:shadow-[var(--shadow-soft)]"
              >
                <p className="font-display text-base font-bold text-ink">{mawkibName(m.mawkibId)}</p>
                <p className="mt-2 text-sm text-muted-foreground">التبرع الشهري</p>
                <p className="font-display text-xl font-bold text-primary">
                  {formatIQD(m.monthlyAmount)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill status={donorStatus(m)} />
                  {over > 0 ? (
                    <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground">
                      متأخر {over} يوم
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  الاستحقاق القادم: {nextDueDate(m)}
                </p>
              </Link>
            );
          })}

          {pending.map((m) => (
            <div key={m.id} className="surface-card border border-gold/40 p-5">
              <p className="font-display text-base font-bold text-ink">{mawkibName(m.mawkibId)}</p>
              <p className="mt-2 text-sm text-muted-foreground">المبلغ المقترح</p>
              <p className="font-display text-xl font-bold text-ink">{formatIQD(m.monthlyAmount)}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
                <Clock className="h-3.5 w-3.5" />
                بانتظار الموافقة
              </span>
            </div>
          ))}

          {rejected.map((m) => (
            <div key={m.id} className="surface-card p-5 opacity-70">
              <p className="font-display text-base font-bold text-ink">{mawkibName(m.mawkibId)}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                تم رفض الطلب
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        جزاك الله خيراً على دعمك المستمر لمواكب أهل البيت عليهم السلام
      </p>
    </AppShell>
  );
}
