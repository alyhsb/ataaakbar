import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Phone,
  MapPin,
  CalendarDays,
  Pencil,
  KeyRound,
  Hash,
  Clock,
  Activity,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { DeleteDonorButton } from "@/components/DeleteDonorButton";
import { PaymentRow } from "@/components/PaymentRow";
import { AddPaymentForm } from "@/components/AddPaymentForm";
import {
  useDonor,
  formatIQD,
  donorStatus,
  deleteDonor,
  useDonorPayments,
  sortPayments,
  loadAll,
  overdueDays,
  nextDueDate,
  lastDonationDate,
  errorMessage,
  useStoreLoaded,
} from "@/lib/donors-store";
import { updateDonorCredentials } from "@/lib/accounts.functions";

export const Route = createFileRoute("/_authenticated/donors/$donorId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المتبرع — عطاء الأكبر" },
      {
        name: "description",
        content: "بيانات المتبرع وسجل دفعاته الشهرية مع إمكانية تحديث حالة كل دفعة.",
      },
      { property: "og:title", content: "تفاصيل المتبرع — عطاء الأكبر" },
      { property: "og:description", content: "سجل الدفعات الشهرية لمتبرع الموكب." },
    ],
  }),
  component: DonorDetails,
});

function DonorDetails() {
  const { donorId } = Route.useParams();
  const donor = useDonor(donorId);
  const loaded = useStoreLoaded();
  const payments = useDonorPayments(donorId);
  const navigate = useNavigate();
  const makeAccount = useServerFn(createDonorAccount);
  const resetPassword = useServerFn(resetDonorPassword);
  const updateAccount = useServerFn(adminUpdateDonorAccount);
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!donor) {
    return (
      <AppShell title={loaded ? "المتبرع غير موجود" : "جارٍ التحميل…"}>
        <p className="mb-3 text-sm text-muted-foreground">
          {loaded ? "لم نعثر على هذا المتبرع، ربما تم حذفه نهائياً." : "جارٍ تحميل بيانات المتبرع…"}
        </p>
        <Link to="/donors" className="text-sm font-semibold text-primary">
          العودة إلى القائمة
        </Link>
      </AppShell>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const over = overdueDays(donor);
  const lastDonation = lastDonationDate(donor.id);

  return (
    <AppShell
      title={donor.name}
      subtitle="ملف المتبرع وسجل الدفعات الشهرية"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/donors/edit/$donorId"
            params={{ donorId: donor.id }}
            className="gradient-emerald flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            <Pencil className="h-4 w-4" />
            تعديل
          </Link>
          <DeleteDonorButton
            name={donor.name}
            variant="button"
            onConfirm={async () => {
              try {
                await deleteDonor(donor.id);
                toast.success("تم نقل المتبرع إلى المحذوفين مع الاحتفاظ بسجل دفعاته");
                navigate({ to: "/donors" });
              } catch (err) {
                toast.error(errorMessage(err, "تعذّر حذف المتبرع"));
              }
            }}
          />
          <Link
            to="/donors"
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Link>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="surface-card space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="gradient-emerald flex h-14 w-14 items-center justify-center rounded-2xl font-display text-xl font-bold text-primary-foreground">
              {donor.name.charAt(0)}
            </span>
            <div>
              <p className="font-display text-lg font-bold text-ink">{donor.name}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={donorStatus(donor)} />
                {over > 0 ? (
                  <span className="inline-flex rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                    متأخر {over} يوم
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <dl className="space-y-3 border-t border-border pt-4 text-sm">
            <Row icon={Hash} label="معرّف المتبرع" value={donor.code ?? "—"} />
            <Row icon={Phone} label="الهاتف" value={donor.phone} />
            <Row icon={MapPin} label="المنطقة" value={donor.area} />
            {donor.location ? <Row icon={MapPin} label="العنوان" value={donor.location} /> : null}
            <Row icon={CalendarDays} label="تاريخ الإضافة" value={donor.joinedAt} />
            <Row icon={Clock} label="يوم الاستحقاق" value={`يوم ${donor.dueDay} من كل شهر`} />
            <Row icon={CalendarDays} label="الاستحقاق القادم" value={nextDueDate(donor)} />
            <Row icon={CalendarDays} label="آخر تبرع" value={lastDonation ?? "لا يوجد"} />
          </dl>

          <div className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Activity className="h-4 w-4 text-gold" />
              آخر نشاط
            </p>
            <p>آخر تسجيل دخول: {donor.lastLoginAt ? donor.lastLoginAt.slice(0, 10) : "لم يسجّل دخول بعد"}</p>
            <p>آخر تبرع: {lastDonation ?? "لا يوجد"}</p>
            <p>
              آخر تحديث للملف:{" "}
              {donor.lastProfileUpdateAt ? donor.lastProfileUpdateAt.slice(0, 10) : donor.joinedAt}
            </p>
          </div>

          {donor.notes ? (
            <p className="rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              {donor.notes}
            </p>
          ) : null}

          <div className="space-y-3 border-t border-border pt-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-gold" />
              حساب الدخول
            </p>
            {creds ? (
              <div className="space-y-1 rounded-lg bg-secondary p-3 text-xs text-ink">
                <p>
                  اسم المستخدم: <span className="font-bold">{creds.username}</span>
                </p>
                <p>
                  كلمة المرور المؤقتة: <span className="font-bold">{creds.password}</span>
                </p>
                <p className="text-muted-foreground">
                  سلّم هذه البيانات للمتبرع؛ لن تظهر مرة أخرى. يسجّل الدخول برقم هاتفه.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {donor.userId
                  ? `لديه حساب باسم المستخدم ${donor.username ?? donor.phone}`
                  : "لا يملك حساب دخول بعد."}
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = donor.userId
                    ? await resetPassword({ data: { donorId: donor.id } })
                    : await makeAccount({ data: { donorId: donor.id } });
                  setCreds(result);
                  await loadAll();
                  toast.success("تم إنشاء بيانات الدخول");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "تعذّر إنشاء الحساب");
                } finally {
                  setBusy(false);
                }
              }}
              className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {donor.userId ? "إنشاء كلمة مرور جديدة" : "إنشاء حساب دخول"}
            </button>

            {donor.userId ? (
              <div className="space-y-2 border-t border-border pt-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="بريد إلكتروني جديد"
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة مرور محددة (اختياري)"
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={busy || (!newEmail.trim() && !newPassword)}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await updateAccount({
                        data: {
                          donorId: donor.id,
                          ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
                          ...(newPassword ? { password: newPassword } : {}),
                        },
                      });
                      setNewEmail("");
                      setNewPassword("");
                      toast.success("تم تحديث بيانات الحساب");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "تعذّر تحديث الحساب");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  حفظ بيانات الحساب
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-card p-5">
              <p className="text-sm text-muted-foreground">التبرع الشهري</p>
              <p className="mt-2 font-display text-2xl font-bold text-primary">
                {formatIQD(donor.monthlyAmount)}
              </p>
            </div>
            <div className="surface-card p-5">
              <p className="text-sm text-muted-foreground">إجمالي ما تبرّع به</p>
              <p className="mt-2 font-display text-2xl font-bold text-ink">{formatIQD(totalPaid)}</p>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="font-display text-base font-bold text-ink">سجل الدفعات الشهرية</h2>
              <AddPaymentForm
                donorId={donor.id}
                defaultAmount={donor.monthlyAmount}
                donorName={donor.name}
              />
            </div>
            <ul className="divide-y divide-border">
              {sortPayments(payments).map((p) => (
                <PaymentRow key={p.id} payment={p} donorName={donor.name} />
              ))}
              {payments.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  لا توجد دفعات مسجّلة بعد
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}