import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  MONTH_NAMES,
  CURRENT_MONTH,
  CURRENT_YEAR,
  addPayment,
  formatIQD,
  periodLabel,
  todayISO,
  errorMessage,
  type PaymentStatus,
} from "@/lib/donors-store";

export function AddPaymentForm({
  donorId,
  defaultAmount,
  donorName,
}: {
  donorId: string;
  defaultAmount: number;
  donorName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [amount, setAmount] = useState(defaultAmount);
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [notes, setNotes] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
      >
        <Plus className="h-3.5 w-3.5" />
        إضافة دفعة
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-xl bg-secondary/60 p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-medium text-muted-foreground">
          الشهر
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          السنة
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          المبلغ
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          الحالة
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
          >
            <option value="paid">مدفوع</option>
            <option value="unpaid">غير مدفوع</option>
          </select>
        </label>
      </div>
      <label className="block text-xs font-medium text-muted-foreground">
        ملاحظات
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
          placeholder="اختياري"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          إلغاء
        </button>
        <ConfirmDialog
          title="تأكيد تسجيل التبرع"
          description="هل أنت متأكد من تسجيل هذا التبرع؟"
          details={[
            ...(donorName ? [{ label: "المتبرع", value: donorName }] : []),
            { label: "المبلغ", value: formatIQD(amount) },
            { label: "الشهر", value: periodLabel(month, year) },
            { label: "التاريخ", value: todayISO() },
            { label: "الحالة", value: status === "paid" ? "مدفوع" : "غير مدفوع" },
          ]}
          confirmLabel="نعم، سجّل التبرع"
          onConfirm={async () => {
            try {
              await addPayment({
                donorId,
                month,
                year,
                amount,
                status,
                notes: notes.trim() || undefined,
              });
              setNotes("");
              setOpen(false);
              toast.success("تمت إضافة الدفعة بنجاح");
            } catch (err) {
              toast.error(errorMessage(err, "تعذّر حفظ الدفعة"));
            }
          }}
          trigger={(openDialog) => (
            <button
              onClick={() => {
                if (amount <= 0) {
                  toast.error("أدخل مبلغاً صحيحاً");
                  return;
                }
                openDialog();
              }}
              className="gradient-emerald rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              حفظ الدفعة
            </button>
          )}
        />
      </div>
    </div>
  );
}
