import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  MawkibGoalsSection,
  MawkibPostsSection,
  visibleGoals,
} from "@/components/MawkibContentSections";
import { useAuth } from "@/lib/auth";
import { useMawkibContent } from "@/lib/mawkib-content";
import type { Currency } from "@/lib/donors-store";
import {
  useDonor,
  useDonorPayments,
  useAmountRequests,
  useAmountHistory,
  requestAmountChange,
  periodLabel,
  formatMoney,
  donorStatus,
  nextDueDate,
  overdueDays,
  mawkibName,
  errorMessage,
} from "@/lib/donors-store";


export const Route = createFileRoute("/_authenticated/donor/mawkib/$donorId")({
  head: () => ({
    meta: [
      { title: "تفاصيل الاشتراك — عطاء الأكبر" },
      {
        name: "description",
        content: "تفاصيل اشتراكك في الموكب: سجل الدفعات، مبلغ التبرع الشهري وطلبات تعديل المبلغ.",
      },
      { property: "og:title", content: "تفاصيل الاشتراك — عطاء الأكبر" },
      { property: "og:description", content: "سجل دفعاتك الشهرية في هذا الموكب." },
    ],
  }),
  component: MembershipPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function MembershipPage() {
  const { donorId } = Route.useParams();
  const { userId } = useAuth();
  const donor = useDonor(donorId);
  const payments = useDonorPayments(donorId);
  const requests = useAmountRequests().filter((r) => r.donorId === donorId);
  const history = useAmountHistory(donorId);
  const [amount, setAmount] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const content = useMawkibContent(donor?.mawkibId);


  if (!donor || donor.userId !== userId) {
    return (
      <AppShell title="غير متاح" subtitle="">
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          هذا الاشتراك غير موجود أو لا يخصّك.
        </div>
      </AppShell>
    );
  }

  const pendingReq = requests.find((r) => r.status === "pending");
  const over = overdueDays(donor);
  const myContributions = content.contributions.filter((c) => c.donorId === donor.id);
  const sumBy = (cur: Currency) => ({
    paid: payments
      .filter((p) => p.status === "paid" && p.currency === cur)
      .reduce((s, p) => s + p.amount, 0),
    goals: myContributions.filter((c) => c.currency === cur).reduce((s, c) => s + c.amount, 0),
  });
  const totals = (["IQD", "USD"] as Currency[])
    .map((cur) => ({ cur, ...sumBy(cur) }))
    .filter((t) => t.paid > 0 || t.goals > 0);

  /** Monthly payments + other contributions, merged into one history list. */
  const historyRows = [
    ...payments.map((p) => ({
      key: `p-${p.id}`,
      title: periodLabel(p.month, p.year),
      subtitle:
        p.status === "paid" ? `تاريخ الدفع: ${p.paidAt ?? "—"}` : "لم يتم التسديد بعد",
      amount: p.amount,
      currency: p.currency,
      status: p.status as "paid" | "unpaid",
      date: p.paidAt ?? `${p.year}-${String(p.month).padStart(2, "0")}-01`,
    })),
    ...myContributions.map((c) => {
      const goal = content.goals.find((g) => g.id === c.goalId);
      return {
        key: `c-${c.id}`,
        title: goal?.title ?? "مساهمة إضافية",
        subtitle: `مساهمة أخرى • ${c.contributedOn}`,
        amount: c.amount,
        currency: c.currency,
        status: "paid" as const,
        date: c.contributedOn,
      };
    }),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || amount === "") return;
    setBusy(true);
    try {
      await requestAmountChange(donorId, Number(amount));
      toast.success("تم إرسال طلب تعديل المبلغ، بانتظار موافقة صاحب الموكب");
      setAmount("");
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر إرسال الطلب"));
    } finally {
      setBusy(false);
    }
  }

  const goalsForDonor = visibleGoals(content.goals);
  const latestGoal = goalsForDonor.length > 0 ? [goalsForDonor[0]!] : [];
  const tabs = [
    { id: "home" as const, label: "الرئيسية" },
    { id: "payments" as const, label: "سجل الدفعات" },
    ...(goalsForDonor.length > 0 ? [{ id: "goals" as const, label: "أهداف مستقبلية" }] : []),
  ];

  return (
    <AppShell
      title={mawkibName(donor.mawkibId)}
      subtitle="تفاصيل اشتراكك في هذا الموكب"
      action={<NotificationBell donorId={donor.id} />}
    >
      <nav className="surface-card mb-5 flex flex-wrap gap-1 p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "gradient-emerald text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "home" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="surface-card p-5">
              <p className="text-sm text-muted-foreground">التبرع الشهري</p>
              <p className="font-display text-2xl font-bold text-primary">
                {formatMoney(donor.monthlyAmount, donor.currency)}
              </p>
            </div>
            <div className="surface-card p-5">
              <p className="text-sm text-muted-foreground">حالة الشهر الحالي</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusPill status={donorStatus(donor)} />
                {over > 0 ? (
                  <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground">
                    متأخر {over} يوم
                  </span>
                ) : null}
              </div>
            </div>
            <div className="surface-card p-5">
              <p className="text-sm text-muted-foreground">الاستحقاق القادم</p>
              <p className="font-display text-lg font-bold text-ink">{nextDueDate(donor)}</p>
            </div>
          </div>

          <section className="surface-card mt-6 p-5">
            <h2 className="font-display text-lg font-bold text-ink">إجمالي تبرعاتي لهذا الموكب</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              منذ انضمامك إلى {mawkibName(donor.mawkibId)} — لا تُحتسب ضمنه تبرعاتك لمواكب أخرى.
            </p>
            {totals.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">لا توجد مساهمات مسجّلة بعد.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {totals.map((t) => (
                  <div key={t.cur} className="gradient-emerald rounded-lg px-4 py-3">
                    <p className="text-xs text-primary-foreground/80">إجمالي مساهماتي</p>
                    <p className="font-display text-2xl font-bold text-primary-foreground">
                      {formatMoney(t.paid + t.goals, t.cur)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card mt-6 p-5">
            <h2 className="font-display text-lg font-bold text-ink">طلب تعديل مبلغ التبرع</h2>
            {pendingReq ? (
              <p className="mt-2 text-sm text-muted-foreground">
                لديك طلب قيد الانتظار لتغيير المبلغ إلى{" "}
                {formatMoney(pendingReq.requestedAmount, donor.currency)}.
              </p>
            ) : (
              <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
                <label className="min-w-[180px] flex-1">
                  <span className="mb-1.5 block text-sm font-medium text-ink">المبلغ الجديد</span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputCls}
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="gradient-emerald flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  إرسال الطلب
                </button>
              </form>
            )}

            {history.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <History className="h-4 w-4" />
                  سجل تغييرات المبلغ
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {history.map((h) => (
                    <li key={h.id}>
                      {formatMoney(h.oldAmount, donor.currency)} ←{" "}
                      {formatMoney(h.newAmount, donor.currency)} •{" "}
                      {new Date(h.createdAt).toLocaleDateString("ar-IQ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <MawkibGoalsSection
            goals={latestGoal}
            contributions={content.contributions}
            donorId={donor.id}
            heading="أحدث هدف مستقبلي"
          />

          <MawkibPostsSection posts={content.posts} />
        </>
      ) : null}

      {tab === "payments" ? (
        <>
          <section className="surface-card p-5">
            <h2 className="font-display text-lg font-bold text-ink">إجمالي تبرعاتي لهذا الموكب</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              منذ انضمامك إلى {mawkibName(donor.mawkibId)} — لا تُحتسب ضمنه تبرعاتك لمواكب أخرى.
            </p>
            {totals.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">لا توجد مساهمات مسجّلة بعد.</p>
            ) : (
              totals.map((t) => (
                <div key={t.cur} className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-secondary px-4 py-3">
                    <p className="text-xs text-muted-foreground">التبرعات الشهرية</p>
                    <p className="font-display text-xl font-bold text-primary">
                      {formatMoney(t.paid, t.cur)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary px-4 py-3">
                    <p className="text-xs text-muted-foreground">مساهمات أخرى</p>
                    <p className="font-display text-xl font-bold text-gold">
                      {formatMoney(t.goals, t.cur)}
                    </p>
                  </div>
                  <div className="gradient-emerald rounded-lg px-4 py-3">
                    <p className="text-xs text-primary-foreground/80">الإجمالي</p>
                    <p className="font-display text-xl font-bold text-primary-foreground">
                      {formatMoney(t.paid + t.goals, t.cur)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-3 font-display text-lg font-bold text-ink">سجل الدفعات والمساهمات</h2>
            {historyRows.length === 0 ? (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                لا توجد دفعات مسجّلة بعد.
              </div>
            ) : (
              <ul className="surface-card divide-y divide-border">
                {historyRows.map((row) => (
                  <li
                    key={row.key}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{row.title}</p>
                      <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">
                        {formatMoney(row.amount, row.currency)}
                      </span>
                      <StatusPill status={row.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {tab === "goals" ? (
        <MawkibGoalsSection
          goals={goalsForDonor}
          contributions={content.contributions}
          donorId={donor.id}
        />
      ) : null}
    </AppShell>
  );
}

