import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusPill } from "@/components/AppShell";
import { useDonor, formatIQD, monthLabel, donorStatus, CURRENT_MONTH } from "@/lib/donors-store";

export const Route = createFileRoute("/donor")({
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
  if (!donor) return null;

  const paid = donor.payments.filter((p) => p.status === "paid");
  const current = donor.payments.find((p) => p.month === CURRENT_MONTH);

  return (
    <AppShell title={`أهلاً، ${donor.name}`} subtitle="متابعة اشتراكك الشهري في الموكب الحسيني">
      <div className="gradient-emerald relative overflow-hidden rounded-2xl p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <p className="text-sm text-primary-foreground/75">اشتراكك الشهري</p>
        <p className="mt-2 font-display text-4xl font-bold text-gradient-gold">
          {formatIQD(donor.monthlyAmount)}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-primary-foreground/80">
          <span>شهر {monthLabel(CURRENT_MONTH)}:</span>
          <StatusPill status={current?.status ?? "pending"} />
          <span className="text-primary-foreground/50">•</span>
          <span>الحالة العامة: {donorStatus(donor) === "paid" ? "منتظم" : "بحاجة متابعة"}</span>
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
          {[...donor.payments].reverse().map((p) => (
            <li key={p.month} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">{monthLabel(p.month)} ٢٠٢٦</p>
                <p className="text-xs text-muted-foreground">
                  {p.date ? `تم التسديد في ${p.date}` : "لم يُسدَّد بعد"}
                </p>
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