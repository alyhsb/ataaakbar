import { useState } from "react";
import { Check, X, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { StatusPill } from "@/components/AppShell";
import {
  formatIQD,
  periodLabel,
  setPaymentStatus,
  updatePayment,
  type MonthlyPayment,
} from "@/lib/donors-store";

export function PaymentRow({ payment }: { payment: MonthlyPayment }) {
  const [openNotes, setOpenNotes] = useState(false);
  const [notes, setNotes] = useState(payment.notes ?? "");
  const paid = payment.status === "paid";

  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {periodLabel(payment.month, payment.year)}
          </p>
          <p className="text-xs text-muted-foreground">
            {paid ? `تاريخ الدفع: ${payment.paidAt ?? "—"}` : "لم يتم التسديد بعد"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-primary">{formatIQD(payment.amount)}</span>
          <StatusPill status={payment.status} />
          <button
            onClick={() => {
              setPaymentStatus(payment.id, paid ? "unpaid" : "paid");
              toast.success(paid ? "تم تعليم الدفعة كغير مدفوعة" : "تم تسجيل الدفعة كمدفوعة");
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              paid
                ? "border border-border text-muted-foreground hover:bg-secondary"
                : "gradient-emerald text-primary-foreground"
            }`}
          >
            {paid ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {paid ? "إلغاء الدفع" : "تعليم كمدفوع"}
          </button>
          <button
            onClick={() => setOpenNotes((v) => !v)}
            aria-label="ملاحظات الدفعة"
            className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {payment.notes && !openNotes ? (
        <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          {payment.notes}
        </p>
      ) : null}

      {openNotes ? (
        <div className="mt-3 space-y-2 rounded-lg bg-secondary/60 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              تاريخ الدفع
              <input
                type="date"
                value={payment.paidAt ?? ""}
                onChange={(e) => updatePayment(payment.id, { paidAt: e.target.value || undefined })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              المبلغ
              <input
                type="number"
                value={payment.amount}
                onChange={(e) => updatePayment(payment.id, { amount: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-muted-foreground">
            ملاحظات
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
              placeholder="ملاحظة حول هذه الدفعة"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpenNotes(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              إغلاق
            </button>
            <button
              onClick={() => {
                updatePayment(payment.id, { notes: notes.trim() || undefined });
                setOpenNotes(false);
                toast.success("تم حفظ بيانات الدفعة");
              }}
              className="gradient-emerald rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              حفظ
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
