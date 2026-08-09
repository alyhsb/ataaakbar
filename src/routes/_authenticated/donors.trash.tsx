import { createFileRoute, Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DeleteDonorButton } from "@/components/DeleteDonorButton";
import { useDeletedDonors, formatIQD, restoreDonor, purgeDonor } from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/donors/trash")({
  head: () => ({
    meta: [
      { title: "المتبرعون المحذوفون — عطاء الأكبر" },
      {
        name: "description",
        content: "سلة المحذوفات: استعد المتبرعين المحذوفين أو احذفهم نهائياً من سجلات الموكب.",
      },
      { property: "og:title", content: "المتبرعون المحذوفون — عطاء الأكبر" },
      { property: "og:description", content: "استعادة أو حذف نهائي للمتبرعين المحذوفين." },
    ],
  }),
  component: DeletedDonors,
});

function DeletedDonors() {
  const donors = useDeletedDonors();

  return (
    <AppShell
      title="المتبرعون المحذوفون"
      subtitle={`${donors.length} متبرع في سلة المحذوفات`}
      action={
        <Link
          to="/donors"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
        >
          العودة إلى القائمة
        </Link>
      }
    >
      <div className="surface-card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">الاسم</th>
              <th className="px-5 py-3 font-medium">الهاتف</th>
              <th className="px-5 py-3 font-medium">المنطقة</th>
              <th className="px-5 py-3 font-medium">التبرع الشهري</th>
              <th className="px-5 py-3 font-medium">تاريخ الحذف</th>
              <th className="px-5 py-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {donors.map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-5 py-3.5 font-semibold text-ink">{d.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{d.phone}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{d.area}</td>
                <td className="px-5 py-3.5 font-medium text-primary">{formatIQD(d.monthlyAmount)}</td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {d.deletedAt ? d.deletedAt.slice(0, 10) : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await restoreDonor(d.id);
                          toast.success("تمت استعادة المتبرع");
                        } catch {
                          toast.error("تعذّرت الاستعادة");
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <RotateCcw className="h-4 w-4" />
                      استعادة
                    </button>
                    <DeleteDonorButton
                      name={d.name}
                      permanent
                      onConfirm={async () => {
                        try {
                          await purgeDonor(d.id);
                          toast.success("تم الحذف نهائياً");
                        } catch {
                          toast.error("تعذّر الحذف");
                        }
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {donors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  سلة المحذوفات فارغة
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}