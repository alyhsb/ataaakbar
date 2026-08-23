import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { createMawkibOwner } from "@/lib/accounts.functions";

export const Route = createFileRoute("/_authenticated/owners/new")({
  head: () => ({
    meta: [
      { title: "إضافة صاحب موكب — عطاء الأكبر" },
      {
        name: "description",
        content: "إنشاء حساب صاحب موكب جديد مع رقم الهاتف ورمز الدخول وربطه بموكبه.",
      },
      { property: "og:title", content: "إضافة صاحب موكب — عطاء الأكبر" },
      { property: "og:description", content: "إنشاء حساب صاحب موكب جديد وربطه بموكب مستقل." },
    ],
  }),
  component: NewOwnerPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function NewOwnerPage() {
  const { role } = useAuth();
  const create = useServerFn(createMawkibOwner);
  const [form, setForm] = useState({
    mawkibName: "",
    mawkibArea: "",
    ownerName: "",
    phone: "",
    accessCode: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (role !== "admin") {
    return (
      <AppShell title="غير مصرح" subtitle="هذه الصفحة مخصصة للمشرف الرئيسي فقط">
        <div className="surface-card p-6 text-sm text-muted-foreground">
          لا تملك صلاحية إنشاء حسابات أصحاب المواكب.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="إضافة صاحب موكب" subtitle="إنشاء موكب جديد وحساب دخول لصاحبه">
      <form
        className="surface-card max-w-2xl space-y-5 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (form.accessCode.trim().length < 6) {
            toast.error("رمز الدخول يجب أن يكون ٦ خانات فأكثر");
            return;
          }
          setBusy(true);
          try {
            await create({
              data: {
                mawkibName: form.mawkibName.trim(),
                mawkibArea: form.mawkibArea.trim(),
                ownerName: form.ownerName.trim(),
                phone: form.phone.trim(),
                accessCode: form.accessCode.trim(),
              },
            });
            toast.success("تم إنشاء الموكب وحساب صاحبه بنجاح");
            setForm({ mawkibName: "", mawkibArea: "", ownerName: "", phone: "", accessCode: "" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "تعذّر إنشاء الحساب");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="اسم الموكب">
            <input
              required
              value={form.mawkibName}
              onChange={(e) => set("mawkibName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="منطقة الموكب (اختياري)">
            <input
              value={form.mawkibArea}
              onChange={(e) => set("mawkibArea", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="اسم صاحب الموكب">
            <input
              required
              value={form.ownerName}
              onChange={(e) => set("ownerName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              required
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="07XX XXX XXXX"
              className={inputCls}
            />
          </Field>
          <Field label="رمز الدخول">
            <input
              required
              value={form.accessCode}
              onChange={(e) => set("accessCode", e.target.value)}
              placeholder="٦ خانات فأكثر"
              className={inputCls}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="gradient-emerald flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          إنشاء الحساب
        </button>
      </form>
    </AppShell>
  );
}
