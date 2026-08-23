import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";
import { MawkibPublicContent } from "@/components/MawkibContentSections";
import { useAuth } from "@/lib/auth";
import { useMawkibContent } from "@/lib/mawkib-content";
import {
  useDonor,
  useDonorPayments,
  useAmountRequests,
  useAmountHistory,
  requestAmountChange,
  sortPayments,
  periodLabel,
  formatIQD,
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

  return (
    <AppShell
      title={mawkibName(donor.mawkibId)}
      subtitle="تفاصيل اشتراكك في هذا الموكب"
      action={<NotificationBell donorId={donor.id} />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-sm text-muted-foreground">التبرع الشهري</p>
          <p className="font-display text-2xl font-bold text-primary">
            {formatIQD(donor.monthlyAmount)}
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
        <h2 className="font-display text-lg font-bold text-ink">طلب تعديل مبلغ التبرع</h2>
        {pendingReq ? (
          <p className="mt-2 text-sm text-muted-foreground">
            لديك طلب قيد الانتظار لتغيير المبلغ إلى {formatIQD(pendingReq.requestedAmount)}.
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
                  {formatIQD(h.oldAmount)} ← {formatIQD(h.newAmount)} •{" "}
                  {new Date(h.createdAt).toLocaleDateString("ar-IQ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">سجل الدفعات</h2>
        {payments.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            لا توجد دفعات مسجّلة بعد.
          </div>
        ) : (
          <ul className="surface-card divide-y divide-border">
            {sortPayments(payments).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{periodLabel(p.month, p.year)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.status === "paid" ? `تاريخ الدفع: ${p.paidAt ?? "—"}` : "لم يتم التسديد بعد"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">{formatIQD(p.amount)}</span>
                  <StatusPill status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
