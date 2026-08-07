import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusPill } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  useDonor,
  formatIQD,
  monthLabel,
  periodLabel,
  donorStatus,
  useDonorPayments,
  sortPayments,
  CURRENT_MONTH,
  CURRENT_YEAR,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/donor")({
  head: () => ({
    meta: [
      { title: "بوابة المتبرع — عطاء" },
      {
        name: "description",
        content: "تابع اشتراكك الشهري في الموكب الحسيني وسجل دفعاتك السابقة بكل وضوح.",
      },
      { property: "og:title", content: "بوابة المتبرع — عطاء" },
      { property: "og:description", content: "لوحة المتبرع لمتابعة الاشتراك الشهري والدفعات." },
    ],
  }),
  component: DonorDashboard,
});

function DonorDashboard() {
  const donor = useDonor("d1");
  const payments = useDonorPayments("d1");
  if (!donor) return null;

  const paid = payments.filter((p) => p.status === "paid");
  const unpaid = payments.filter((p) => p.status === "unpaid");
  const current = payments.find((p) => p.month === CURRENT_MONTH && p.year === CURRENT_YEAR);

  return (
    <AppShell
      title={`أهلاً، ${donor.name}`}
      subtitle="متابعة اشتراكك الشهري في الموكب الحسيني"
      action={<NotificationBell donorId={donor.id} />}
    >
      <div className="gradient-emerald relative overflow-hidden rounded-2xl p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <p className="text-sm text-primary-foreground/75">اشتراكك الشهري</p>
        <p className="mt-2 font-display text-4xl font-bold text-gradient-gold">
          {formatIQD(donor.monthlyAmount)}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-primary-foreground/80">
          <span>شهر {monthLabel(CURRENT_MONTH)}:</span>
          <StatusPill status={current?.status ?? "unpaid"} />
          <span className="text-primary-foreground/50">•</span>
          <span>
            الحالة العامة: {unpaid.length === 0 ? "منتظم" : `${unpaid.length} دفعة غير مسددة`}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat label="عدد الأشهر المدفوعة" value={`${paid.length} شهر`} />
        <Stat
          label="إجمالي تبرعاتك"
          value={formatIQD(paid.reduce((s, p) => s + p.amount, 0))}
        />
        <Stat label="تاريخ الانضمام" value={donor.joinedAt} />
      </div>

      <div className="surface-card mt-5 overflow-hidden">
        <h2 className="border-b border-border px-5 py-4 font-display text-base font-bold text-ink">
          سجل دفعاتك
        </h2>
        <ul className="divide-y divide-border">
          {sortPayments(payments).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{periodLabel(p.month, p.year)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.status === "paid"
                    ? `تم التسديد في ${p.paidAt ?? "—"}`
                    : "لم يُسدَّد بعد"}
                </p>
                {p.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground/80">{p.notes}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-primary">{formatIQD(p.amount)}</span>
                <StatusPill status={p.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        جزاك الله خيراً على دعمك المستمر لموكب أهل البيت عليهم السلام
      </p>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-xl font-bold text-ink">{value}</p>
    </div>
  );
}