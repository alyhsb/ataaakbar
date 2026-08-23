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
        aria-label={`إزالة ${name} من الموكب`}
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
            <AlertDialogTitle>{permanent ? "حذف العضوية نهائياً" : "إزالة المتبرع من الموكب"}</AlertDialogTitle>
            <AlertDialogDescription>
              {permanent
                ? `سيتم حذف عضوية «${name}» في هذا الموكب وسجل دفعاتها نهائياً. حساب المتبرع في التطبيق وبقية مواكبه تبقى كما هي.`
                : `سيتم إنهاء عضوية «${name}» في هذا الموكب فقط. حسابه في التطبيق ومواكبه الأخرى تبقى فعّالة، ويمكنك استعادة العضوية في أي وقت.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-start">
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {permanent ? "نعم، احذف العضوية نهائياً" : "نعم، أزله من الموكب"}
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}