import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Ban, RotateCcw, Pencil, ShieldPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth";
import {
  useMawakib,
  useStoreLoaded,
  createMawkib,
  updateMawkib,
  setMawkibDisabled,
  mawkibStats,
  formatIQD,
  errorMessage,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/mawakib")({
  head: () => ({
    meta: [
      { title: "المواكب — عطاء الأكبر" },
      {
        name: "description",
        content: "إدارة كل المواكب المسجّلة في التطبيق: إنشاء، تعديل، تعطيل واستعادة، مع إحصاءات كل موكب.",
      },
      { property: "og:title", content: "المواكب — عطاء الأكبر" },
      { property: "og:description", content: "إدارة المواكب وإحصاءاتها." },
    ],
  }),
  component: MawakibPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

type Draft = { id?: string; name: string; area: string; phone: string; description: string };

const emptyDraft: Draft = { name: "", area: "", phone: "", description: "" };

function MawakibPage() {
  const { role } = useAuth();
  const loaded = useStoreLoaded();
  const mawakib = useMawakib();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  if (role !== "admin") {
    return (
      <AppShell title="المواكب">
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          هذه الصفحة مخصّصة لإدارة التطبيق فقط.
        </div>
      </AppShell>
    );
  }

  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      if (draft.name.trim().length < 3) throw new Error("اسم الموكب قصير جداً");
      if (draft.id) {
        await updateMawkib(draft.id, {
          name: draft.name.trim(),
          area: draft.area,
          phone: draft.phone,
          description: draft.description,
        });
        toast.success("تم تحديث بيانات الموكب");
      } else {
        await createMawkib({
          name: draft.name.trim(),
          area: draft.area,
          phone: draft.phone,
          description: draft.description,
        });
        toast.success("تم إنشاء الموكب");
      }
      setDraft(null);
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر حفظ الموكب"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="المواكب"
      subtitle="كل المواكب المسجّلة في التطبيق"
      action={
        <div className="flex gap-2">
          <Link
            to="/owners/new"
            className="flex items-center gap-1.5 rounded-lg border border-gold/50 px-3 py-2 text-xs font-semibold text-gold"
          >
            <ShieldPlus className="h-4 w-4" /> إضافة صاحب موكب
          </Link>
          <button
            type="button"
            onClick={() => setDraft({ ...emptyDraft })}
            className="gradient-emerald flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> موكب جديد
          </button>
        </div>
      }
    >
      {draft ? (
        <div className="surface-card mb-6 space-y-3 p-5">
          <h2 className="font-display text-base font-bold text-ink">
            {draft.id ? "تعديل الموكب" : "موكب جديد"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">اسم الموكب</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">المنطقة</span>
              <input
                value={draft.area}
                onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">رقم التواصل</span>
              <input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink">نبذة عن الموكب</span>
              <textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className={inputCls}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="gradient-emerald flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} حفظ
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : null}

      {!loaded ? (
        <div className="surface-card flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
        </div>
      ) : mawakib.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          لا توجد مواكب مسجّلة بعد.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mawakib.map((m) => {
            const s = mawkibStats(m.id);
            return (
              <div key={m.id} className="surface-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-bold text-ink">{m.name}</p>
                  {m.disabledAt ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                      معطّل
                    </span>
                  ) : null}
                </div>
                {m.area ? <p className="mt-1 text-xs text-muted-foreground">{m.area}</p> : null}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary px-3 py-2">
                    <dt className="text-muted-foreground">المتبرعون</dt>
                    <dd className="font-semibold text-ink">{s.donors}</dd>
                  </div>
                  <div className="rounded-lg bg-secondary px-3 py-2">
                    <dt className="text-muted-foreground">طلبات معلّقة</dt>
                    <dd className="font-semibold text-ink">{s.pending}</dd>
                  </div>
                  <div className="rounded-lg bg-secondary px-3 py-2">
                    <dt className="text-muted-foreground">المتوقع شهرياً</dt>
                    <dd className="font-semibold text-ink">{formatIQD(s.expectedMonthly)}</dd>
                  </div>
                  <div className="rounded-lg bg-secondary px-3 py-2">
                    <dt className="text-muted-foreground">المُحصّل</dt>
                    <dd className="font-semibold text-primary">{formatIQD(s.collected)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        id: m.id,
                        name: m.name,
                        area: m.area,
                        phone: m.phone,
                        description: m.description,
                      })
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-muted-foreground hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" /> تعديل
                  </button>
                  <ConfirmDialog
                    title={m.disabledAt ? "استعادة الموكب" : "تعطيل الموكب"}
                    description={
                      m.disabledAt
                        ? `سيعود ${m.name} للظهور للمتبرعين.`
                        : `لن يظهر ${m.name} للمتبرعين الجدد، مع بقاء بيانات متبرعيه وتبرعاتهم.`
                    }
                    confirmLabel="تأكيد"
                    onConfirm={async () => {
                      try {
                        await setMawkibDisabled(m.id, !m.disabledAt);
                        toast.success("تم تحديث حالة الموكب");
                      } catch (err) {
                        toast.error(errorMessage(err, "تعذّر تحديث الموكب"));
                      }
                    }}
                    trigger={(open) => (
                      <button
                        onClick={open}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-muted-foreground hover:text-ink"
                      >
                        {m.disabledAt ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" /> استعادة
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5" /> تعطيل
                          </>
                        )}
                      </button>
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
