import { useState } from "react";
import { Trash2 } from "lucide-react";
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

export function DeleteDonorButton({
  name,
  onConfirm,
  variant = "icon",
  permanent = false,
}: {
  name: string;
  onConfirm: () => void;
  variant?: "icon" | "button";
  permanent?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`حذف ${name}`}
        className={
          variant === "icon"
            ? "rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
            : "flex items-center gap-1.5 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        }
      >
        <Trash2 className="h-4 w-4" />
        {variant === "button" ? "حذف" : null}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>{permanent ? "حذف نهائي" : "حذف المتبرع"}</AlertDialogTitle>
            <AlertDialogDescription>
              {permanent
                ? `سيتم حذف «${name}» وجميع سجلات دفعاته نهائياً. لا يمكن التراجع عن هذا الإجراء.`
                : `سيتم نقل «${name}» إلى سلة المحذوفات، ويمكنك استعادته في أي وقت.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-start">
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {permanent ? "نعم، احذف نهائياً" : "نعم، انقله إلى المحذوفات"}
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}