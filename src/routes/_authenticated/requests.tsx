import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth";
import {
  usePendingMemberships,
  useAmountRequests,
  useAllDonors,
  decideMembership,
  decideAmountRequest,
  formatMoney,
  mawkibName,
  errorMessage,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "طلبات المتبرعين — عطاء الأكبر" },
      {
        name: "description",
        content: "راجع طلبات الانضمام إلى الموكب وطلبات تعديل مبلغ التبرع الشهري ووافق عليها.",
      },
      { property: "og:title", content: "طلبات المتبرعين — عطاء الأكبر" },
      { property: "og:description", content: "إدارة طلبات الانضمام وتعديل المبالغ." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { userId } = useAuth();
  const pending = usePendingMemberships();
  const donors = useAllDonors();
  const amountReqs = useAmountRequests().filter((r) => r.status === "pending");

  return (
    <AppShell title="طلبات المتبرعين" subtitle="الموافقة على الانضمام وتعديل المبالغ">
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">
          طلبات الانضمام ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="surface-card p-6 text-center text-sm text-muted-foreground">
            لا توجد طلبات انضمام حالياً.
          </div>
        ) : (
          <ul className="surface-card divide-y divide-border">
            {pending.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{d.name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {d.phone}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mawkibName(d.mawkibId)} • {formatMoney(d.monthlyAmount, d.currency)} شهرياً
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ConfirmDialog
                    title="الموافقة على طلب الانضمام"
                    description={`سيتم قبول ${d.name} كمتبرع في الموكب.`}
                    confirmLabel="نعم، وافق"
                    onConfirm={async () => {
                      try {
                        await decideMembership(d.id, true);
                        toast.success("تمت الموافقة على الطلب");
                      } catch (err) {
                        toast.error(errorMessage(err, "تعذّر تنفيذ العملية"));
                      }
                    }}
                    trigger={(open) => (
                      <button
                        onClick={open}
                        className="gradient-emerald flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        <Check className="h-3.5 w-3.5" />
                        موافقة
                      </button>
                    )}
                  />
                  <ConfirmDialog
                    title="رفض طلب الانضمام"
                    description={`سيتم رفض طلب ${d.name}.`}
                    confirmLabel="نعم، ارفض"
                    destructive
                    onConfirm={async () => {
                      try {
                        await decideMembership(d.id, false);
                        toast.success("تم رفض الطلب");
                      } catch (err) {
                        toast.error(errorMessage(err, "تعذّر تنفيذ العملية"));
                      }
                    }}
                    trigger={(open) => (
                      <button
                        onClick={open}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                        رفض
                      </button>
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">
          طلبات تعديل المبلغ ({amountReqs.length})
        </h2>
        {amountReqs.length === 0 ? (
          <div className="surface-card p-6 text-center text-sm text-muted-foreground">
            لا توجد طلبات تعديل مبالغ حالياً.
          </div>
        ) : (
          <ul className="surface-card divide-y divide-border">
            {amountReqs.map((r) => {
              const d = donors.find((x) => x.id === r.donorId);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{d?.name ?? "متبرع"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatMoney(r.currentAmount, d?.currency ?? "IQD")} ← {formatMoney(r.requestedAmount, d?.currency ?? "IQD")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConfirmDialog
                      title="الموافقة على تعديل المبلغ"
                      description={`سيصبح المبلغ الشهري ${formatMoney(r.requestedAmount, d?.currency ?? "IQD")}.`}
                      confirmLabel="نعم، وافق"
                      onConfirm={async () => {
                        try {
                          await decideAmountRequest(r.id, true, userId ?? undefined);
                          toast.success("تم تحديث مبلغ التبرع");
                        } catch (err) {
                          toast.error(errorMessage(err, "تعذّر تنفيذ العملية"));
                        }
                      }}
                      trigger={(open) => (
                        <button
                          onClick={open}
                          className="gradient-emerald flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                        >
                          <Check className="h-3.5 w-3.5" />
                          موافقة
                        </button>
                      )}
                    />
                    <ConfirmDialog
                      title="رفض تعديل المبلغ"
                      description="سيبقى المبلغ الشهري كما هو."
                      confirmLabel="نعم، ارفض"
                      destructive
                      onConfirm={async () => {
                        try {
                          await decideAmountRequest(r.id, false, userId ?? undefined);
                          toast.success("تم رفض الطلب");
                        } catch (err) {
                          toast.error(errorMessage(err, "تعذّر تنفيذ العملية"));
                        }
                      }}
                      trigger={(open) => (
                        <button
                          onClick={open}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                          رفض
                        </button>
                      )}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
