import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { addDonor } from "@/lib/donors-store";

export const Route = createFileRoute("/donors/new")({
  head: () => ({
    meta: [
      { title: "إضافة متبرع جديد — عطاء" },
      {
        name: "description",
        content: "أضف متبرعاً جديداً إلى الموكب وحدد مبلغ الاشتراك الشهري والمنطقة.",
      },
      { property: "og:title", content: "إضافة متبرع جديد — عطاء" },
      { property: "og:description", content: "تسجيل متبرع جديد ضمن تبرعات الموكب الشهرية." },
    ],
  }),
  component: AddDonorPage,
});

const amounts = [25000, 50000, 75000, 100000];

function AddDonorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    area: "",
    monthlyAmount: 50000,
    notes: "",
  });

  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AppShell title="إضافة متبرع" subtitle="سجّل متبرعاً جديداً في قائمة الموكب">
      <form
        className="surface-card max-w-2xl space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const donor = addDonor({
            name: form.name.trim(),
            phone: form.phone.trim(),
            area: form.area.trim(),
            monthlyAmount: Number(form.monthlyAmount),
            notes: form.notes.trim(),
          });
          navigate({ to: "/donors/$donorId", params: { donorId: donor.id } });
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="الاسم الكامل">
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="مثال: حسين علي"
              className={inputCls}
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              required
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="07XX XXX XXXX"
              className={inputCls}
            />
          </Field>
          <Field label="المنطقة">
            <input
              required
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder="مثال: الكاظمية"
              className={inputCls}
            />
          </Field>
          <Field label="مبلغ الاشتراك الشهري (د.ع)">
            <input
              required
              type="number"
              min={1000}
              step={1000}
              value={form.monthlyAmount}
              onChange={(e) => set("monthlyAmount", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          {amounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => set("monthlyAmount", a)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                form.monthlyAmount === a
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {a.toLocaleString("ar-IQ")} د.ع
            </button>
          ))}
        </div>

        <Field label="ملاحظات (اختياري)">
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="أي تفاصيل إضافية عن المتبرع…"
            className={inputCls}
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="gradient-emerald rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            حفظ المتبرع
          </button>
          <Link
            to="/donors"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            إلغاء
          </Link>
        </div>
      </form>
    </AppShell>
  );
}

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