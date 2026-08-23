import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import {
  useActiveMawakib,
  useMyMemberships,
  requestJoinMawkib,
  errorMessage,
  formatIQD,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/donor/browse")({
  head: () => ({
    meta: [
      { title: "إضافة موكب — عطاء الأكبر" },
      {
        name: "description",
        content: "تصفّح المواكب الحسينية المتاحة وأرسل طلب انضمام بمبلغ التبرع الشهري الذي تختاره.",
      },
      { property: "og:title", content: "إضافة موكب — عطاء الأكبر" },
      { property: "og:description", content: "اختر موكباً وأرسل طلب انضمام لإدارته." },
    ],
  }),
  component: BrowseMawakibPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function BrowseMawakibPage() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const mawakib = useActiveMawakib();
  const memberships = useMyMemberships(userId ?? undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState(10000);
  const [busy, setBusy] = useState(false);

  const me = memberships[0];
  const joinedIds = new Set(memberships.map((m) => m.mawkibId));
  const available = mawakib.filter((m) => !joinedIds.has(m.id));

  async function submit(mawkibId: string) {
    if (busy || !userId) return;
    setBusy(true);
    try {
      if (amount <= 0) throw new Error("أدخل مبلغ تبرع صحيح");
      await requestJoinMawkib({
        userId,
        name: me?.name ?? "متبرع",
        phone: me?.phone ?? "",
        mawkibId,
        monthlyAmount: amount,
        area: me?.area ?? "",
        location: me?.location ?? "",
      });
      toast.success("تم إرسال طلب الانضمام، بانتظار موافقة صاحب الموكب");
      navigate({ to: "/donor" });
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر إرسال الطلب"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="إضافة موكب" subtitle="اختر موكباً وحدد مبلغ تبرعك الشهري">
      {available.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          لا توجد مواكب متاحة للانضمام حالياً.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((m) => (
            <div key={m.id} className="surface-card p-5">
              <p className="font-display text-base font-bold text-ink">{m.name}</p>
              {m.area ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {m.area}
                </p>
              ) : null}
              {m.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
              ) : null}

              {selected === m.id ? (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">
                      مبلغ التبرع الشهري
                    </span>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className={inputCls}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatIQD(amount || 0)}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submit(m.id)}
                      className="gradient-emerald flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      إرسال طلب الانضمام
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelected(m.id)}
                  className="mt-4 w-full rounded-lg border border-primary/40 py-2.5 text-sm font-semibold text-primary"
                >
                  اختيار هذا الموكب
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
