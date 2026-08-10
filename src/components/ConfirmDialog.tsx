import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Reusable Arabic confirmation dialog for sensitive actions. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  details,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  destructive = false,
  onConfirm,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description?: string;
  details?: { label: string; value: string }[];
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      {trigger(() => setOpen(true))}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>

          {details && details.length > 0 ? (
            <dl className="space-y-2 rounded-lg bg-secondary p-3 text-sm">
              {details.map((d) => (
                <div key={d.label} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="font-semibold text-ink">{d.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <AlertDialogFooter className="sm:justify-start">
            <AlertDialogAction
              disabled={busy}
              onClick={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              className={
                destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {busy ? "جارٍ التنفيذ…" : confirmLabel}
            </AlertDialogAction>
            <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}