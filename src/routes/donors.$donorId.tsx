import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Phone, MapPin, CalendarDays, Pencil } from "lucide-react";
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
} from "@/lib/donors-store";

export const Route = createFileRoute("/donors/$donorId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المتبرع — عطاء" },
      {
        name: "description",
        content: "بيانات المتبرع وسجل دفعاته الشهرية مع إمكانية تحديث حالة كل دفعة.",
      },
      { property: "og:title", content: "تفاصيل المتبرع — عطاء" },
      { property: "og:description", content: "سجل الدفعات الشهرية لمتبرع الموكب." },
    ],
  }),
  component: DonorDetails,
});

function DonorDetails() {
  const { donorId } = Route.useParams();
  const donor = useDonor(donorId);
  const payments = useDonorPayments(donorId);
  const navigate = useNavigate();

  if (!donor) {
    return (
      <AppShell title="المتبرع غير موجود">
        <Link to="/donors" className="text-sm font-semibold text-primary">
          العودة إلى القائمة
        </Link>
      </AppShell>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

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
            onConfirm={() => {
              deleteDonor(donor.id);
              toast.success("تم حذف المتبرع");
              navigate({ to: "/donors" });
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
              <StatusPill status={donorStatus(donor)} />
            </div>
          </div>

          <dl className="space-y-3 border-t border-border pt-4 text-sm">
            <Row icon={Phone} label="الهاتف" value={donor.phone} />
            <Row icon={MapPin} label="المنطقة" value={donor.area} />
            <Row icon={CalendarDays} label="تاريخ الإضافة" value={donor.joinedAt} />
          </dl>

          {donor.notes ? (
            <p className="rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              {donor.notes}
            </p>
          ) : null}
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
              <AddPaymentForm donorId={donor.id} defaultAmount={donor.monthlyAmount} />
            </div>
            <ul className="divide-y divide-border">
              {sortPayments(payments).map((p) => (
                <PaymentRow key={p.id} payment={p} />
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