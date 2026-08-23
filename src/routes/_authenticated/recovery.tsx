import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, X, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth";
import { listRecoveryRequests, decideAccountRecovery } from "@/lib/users.functions";
import { errorMessage } from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/recovery")({
  head: () => ({
    meta: [
      { title: "طلبات استعادة الحساب — عطاء الأكبر" },
      {
        name: "description",
        content:
          "راجع طلبات استعادة الحساب من المتبرعين الذين نسوا رمز الدخول ووافق عليها ليضعوا رمزاً جديداً.",
      },
      { property: "og:title", content: "طلبات استعادة الحساب — عطاء الأكبر" },
      { property: "og:description", content: "الموافقة على استعادة حسابات المتبرعين." },
    ],
  }),
  component: RecoveryPage,
});

type Row = {
  id: string;
  phone: string;
  requester_name: string;
  status: string;
  created_at: string;
};

function RecoveryPage() {
  const { role } = useAuth();
  const fetchRows = useServerFn(listRecoveryRequests);
  const decide = useServerFn(decideAccountRecovery);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      setError(null);
      setRows((await fetchRows({})) as Row[]);
    } catch (err) {
      setError(errorMessage(err, "تعذّر تحميل الطلبات"));
    }
  }

  useEffect(() => {
    if (role === "admin" || role === "owner") void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (role !== "admin" && role !== "owner") {
    return (
      <AppShell title="استعادة الحساب">
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          هذه الصفحة مخصّصة للإدارة.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="طلبات استعادة الحساب"
      subtitle="المتبرع نسي رمز الدخول — بعد التحقق من هويته وافق ليضع رمزاً جديداً بنفسه"
    >
      {error ? (
        <div className="surface-card p-6 text-center text-sm text-destructive">{error}</div>
      ) : rows === null ? (
        <div className="surface-card flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
        </div>
      ) : rows.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          لا توجد طلبات استعادة حالياً.
        </div>
      ) : (
        <ul className="surface-card divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <KeyRound className="h-4 w-4 text-gold" />
                  {r.requester_name || "متبرع"}
                </p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {r.phone}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("ar-IQ")} •{" "}
                  {r.status === "approved" ? "تمت الموافقة — بانتظار وضع رمز جديد" : "بانتظار المراجعة"}
                </p>
              </div>
              {r.status === "pending" ? (
                <div className="flex items-center gap-2">
                  <ConfirmDialog
                    title="الموافقة على الاستعادة"
                    description="تأكّد من هوية صاحب الرقم عبر الاتصال به. بعد الموافقة يستطيع وضع رمز دخول جديد لحسابه نفسه دون فقدان أي بيانات."
                    confirmLabel="نعم، وافق"
                    onConfirm={async () => {
                      try {
                        await decide({ data: { requestId: r.id, approve: true } });
                        toast.success("تمت الموافقة على الطلب");
                        await reload();
                      } catch (err) {
                        toast.error(errorMessage(err, "تعذّر تنفيذ العملية"));
                      }
                    }}
                    trigger={(open) => (
                      <button
                        onClick={open}
                        className="gradient-emerald flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        <Check className="h-3.5 w-3.5" /> موافقة
                      </button>
                    )}
                  />
                  <ConfirmDialog
                    title="رفض الطلب"
                    description="سيبقى رمز الدخول الحالي كما هو."
                    confirmLabel="نعم، ارفض"
                    onConfirm={async () => {
                      try {
                        await decide({ data: { requestId: r.id, approve: false } });
                        toast.success("تم رفض الطلب");
                        await reload();
                      } catch (err) {
                        toast.error(errorMessage(err, "تعذّر تنفيذ العملية"));
                      }
                    }}
                    trigger={(open) => (
                      <button
                        onClick={open}
                        className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive"
                      >
                        <X className="h-3.5 w-3.5" /> رفض
                      </button>
                    )}
                  />
                </div>
              ) : (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  بانتظار المتبرع
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
