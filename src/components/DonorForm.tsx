import { Link } from "@tanstack/react-router";
import { useState } from "react";

export type DonorFormValues = {
  name: string;
  phone: string;
  area: string;
  location: string;
  monthlyAmount: number;
  dueDay: number;
  notes: string;
  accessCode?: string;
};

const amounts = [25000, 50000, 75000, 100000];

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

export function DonorForm({
  initial,
  submitLabel,
  withAccessCode = false,
  onSubmit,
}: {
  initial: DonorFormValues;
  submitLabel: string;
  withAccessCode?: boolean;
  onSubmit: (values: DonorFormValues) => void;
}) {
  const [form, setForm] = useState<DonorFormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof DonorFormValues, string>>>({});

  const set = (k: keyof DonorFormValues, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  function validate(values: DonorFormValues) {
    const e: Partial<Record<keyof DonorFormValues, string>> = {};
    const name = values.name.trim();
    const phone = values.phone.trim();
    if (name.length < 3 || name.length > 100) e.name = "الاسم يجب أن يكون بين ٣ و ١٠٠ حرف";
    if (!/^[\d\s+-]{7,20}$/.test(phone)) e.phone = "رقم هاتف غير صالح";
    if (values.area.trim().length > 60) e.area = "اسم المنطقة طويل جداً";
    if (values.location.trim().length > 120) e.location = "العنوان طويل جداً";
    if (!Number.isFinite(values.monthlyAmount) || values.monthlyAmount < 1000)
      e.monthlyAmount = "أقل مبلغ هو ١٠٠٠ دينار";
    if (!Number.isFinite(values.dueDay) || values.dueDay < 1 || values.dueDay > 28)
      e.dueDay = "يوم الاستحقاق يجب أن يكون بين ١ و ٢٨";
    if (withAccessCode) {
      const code = (values.accessCode ?? "").trim();
      if (code.length < 6 || code.length > 32) e.accessCode = "رمز الدخول يجب أن يكون ٦ خانات فأكثر";
    }
    if (values.notes.length > 500) e.notes = "الملاحظات يجب ألا تتجاوز ٥٠٠ حرف";
    return e;
  }

  const [pendingAmountConfirm, setPendingAmountConfirm] = useState(false);
  const amountChanged = Number(form.monthlyAmount) !== Number(initial.monthlyAmount);

  return (
    <form
      className="surface-card max-w-2xl space-y-5 p-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const errs = validate(form);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        if (amountChanged && !pendingAmountConfirm) {
          setPendingAmountConfirm(true);
          return;
        }
        onSubmit({
          name: form.name.trim(),
          phone: form.phone.trim(),
          area: form.area.trim(),
          location: form.location.trim(),
          monthlyAmount: Number(form.monthlyAmount),
          dueDay: Number(form.dueDay),
          notes: form.notes.trim(),
          accessCode: (form.accessCode ?? "").trim(),
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="الاسم الكامل" error={errors.name}>
          <input
            value={form.name}
            maxLength={100}
            onChange={(e) => set("name", e.target.value)}
            placeholder="مثال: حسين علي"
            className={inputCls}
          />
        </Field>
        <Field label="رقم الهاتف" error={errors.phone}>
          <input
            value={form.phone}
            maxLength={20}
            inputMode="tel"
            onChange={(e) => set("phone", e.target.value)}
            placeholder="07XX XXX XXXX"
            className={inputCls}
          />
        </Field>
        <Field label="المنطقة" error={errors.area}>
          <input
            value={form.area}
            maxLength={60}
            onChange={(e) => set("area", e.target.value)}
            placeholder="مثال: الكاظمية"
            className={inputCls}
          />
        </Field>
        <Field label="العنوان (اختياري)" error={errors.location}>
          <input
            value={form.location}
            maxLength={120}
            onChange={(e) => set("location", e.target.value)}
            placeholder="مثال: الهاشمية - حي المعلمين"
            className={inputCls}
          />
        </Field>
        <Field label="مبلغ التبرع الشهري (د.ع)" error={errors.monthlyAmount}>
          <input
            type="number"
            min={1000}
            step={1000}
            value={form.monthlyAmount}
            onChange={(e) => set("monthlyAmount", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="يوم الاستحقاق الشهري" error={errors.dueDay}>
          <select
            value={form.dueDay}
            onChange={(e) => set("dueDay", Number(e.target.value))}
            className={inputCls}
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                يوم {d} من كل شهر
              </option>
            ))}
          </select>
        </Field>
        {withAccessCode ? (
          <Field label="رمز الدخول / Access Code" error={errors.accessCode}>
            <input
              value={form.accessCode ?? ""}
              maxLength={32}
              onChange={(e) => set("accessCode", e.target.value)}
              placeholder="رمز يُسلَّم للمتبرع لتسجيل الدخول"
              className={inputCls}
            />
          </Field>
        ) : null}
      </div>

      {pendingAmountConfirm ? (
        <div className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs text-ink">
          سيتم تغيير مبلغ التبرع الشهري من {initial.monthlyAmount.toLocaleString("ar-IQ")} د.ع إلى{" "}
          {Number(form.monthlyAmount).toLocaleString("ar-IQ")} د.ع. اضغط «تأكيد الحفظ» للمتابعة.
        </div>
      ) : null}

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

      <Field label="ملاحظات (اختياري)" error={errors.notes}>
        <textarea
          rows={3}
          maxLength={500}
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
          {pendingAmountConfirm ? "تأكيد الحفظ" : submitLabel}
        </button>
        <Link
          to="/donors"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
        >
          إلغاء
        </Link>
      </div>
    </form>
  );
}