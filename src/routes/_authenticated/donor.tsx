import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusPill } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/lib/auth";
import {
  useDonorByUser,
  useStoreLoaded,
  formatIQD,
  monthLabel,
  periodLabel,
  donorStatus,
  useDonorPayments,
  sortPayments,
  CURRENT_MONTH,
  CURRENT_YEAR,
  nextDueDate,
  overdueDays,
  lastDonationDate,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/donor")({
  head: () => ({
    meta: [
      { title: "بوابة المتبرع — عطاء الأكبر" },
      {
        name: "description",
        content: "تابع اشتراكك الشهري في الموكب الحسيني وسجل دفعاتك السابقة بكل وضوح.",
      },
      { property: "og:title", content: "بوابة المتبرع — عطاء الأكبر" },
      { property: "og:description", content: "لوحة المتبرع لمتابعة الاشتراك الشهري والدفعات." },
    ],
  }),
  component: DonorDashboard,
});

function DonorDashboard() {
  const { userId } = useAuth();
  const loaded = useStoreLoaded();
  const donor = useDonorByUser(userId ?? undefined);
  const payments = useDonorPayments(donor?.id ?? "");
  const navigate = useNavigate();

  useEffect(() => {
    if (donor && !donor.profileCompleted) navigate({ to: "/complete-profile", replace: true });
  }, [donor, navigate]);

  if (!donor) {
    return (
      <AppShell title="بوابة المتبرع">
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {loaded ? "لا يوجد ملف متبرع مرتبط بحسابك بعد. تواصل مع مسؤول الموكب." : "جارٍ التحميل…"}
        </div>
      </AppShell>
    );
  }

  const paid = payments.filter((p) => p.status === "paid");
  const unpaid = payments.filter((p) => p.status === "unpaid");
  const current = payments.find((p) => p.month === CURRENT_MONTH && p.year === CURRENT_YEAR);
  const over = overdueDays(donor);
  const lastDonation = lastDonationDate(donor.id);

  return (
    <AppShell
      title={`السلام عليكم، ${donor.name}`}
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
          {over > 0 ? (
            <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground">
              متأخر {over} يوم
            </span>
          ) : null}
          <span className="text-primary-foreground/50">•</span>
          <span>
            الحالة العامة: {unpaid.length === 0 ? "منتظم" : `${unpaid.length} دفعة غير مسددة`}
          </span>
        </div>
        <p className="mt-3 text-sm text-primary-foreground/80">
          موعد استحقاقك القادم: <span className="font-semibold">{nextDueDate(donor)}</span>
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="عدد الأشهر المدفوعة" value={`${paid.length} شهر`} />
        <Stat
          label="إجمالي تبرعاتك"
          value={formatIQD(paid.reduce((s, p) => s + p.amount, 0))}
        />
        <Stat label="آخر تبرع" value={lastDonation ?? "لا يوجد"} />
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
                {p.txnCode ? (
                  <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                    {p.txnCode}
                  </p>
                ) : null}
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
          {payments.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              لا توجد دفعات مسجّلة بعد.
            </li>
          ) : null}
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