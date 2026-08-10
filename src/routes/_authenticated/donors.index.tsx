import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Pencil, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { DeleteDonorButton } from "@/components/DeleteDonorButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useAllDonors,
  donorStatus,
  formatIQD,
  deleteDonor,
  restoreDonor,
  purgeDonor,
  usePayments,
  useStoreLoaded,
  overdueDays,
  lastDonationDate,
  errorMessage,
  type Donor,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/donors/")({
  head: () => ({
    meta: [
      { title: "قائمة المتبرعين — عطاء الأكبر" },
      {
        name: "description",
        content: "استعرض جميع متبرعي الموكب مع مبالغ اشتراكهم الشهري وحالة الدفع.",
      },
      { property: "og:title", content: "قائمة المتبرعين — عطاء الأكبر" },
      { property: "og:description", content: "جميع متبرعي الموكب وحالة دفعاتهم الشهرية." },
    ],
  }),
  component: DonorsList,
});

type FilterKey = "all" | "paid" | "unpaid" | "overdue" | "active" | "deleted";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "paid", label: "مدفوع" },
  { key: "unpaid", label: "غير مدفوع" },
  { key: "overdue", label: "متأخر" },
  { key: "active", label: "نشط" },
  { key: "deleted", label: "محذوف" },
];

function matchesFilter(d: Donor, filter: FilterKey) {
  const deleted = Boolean(d.deletedAt);
  switch (filter) {
    case "deleted":
      return deleted;
    case "active":
      return !deleted;
    case "paid":
      return !deleted && donorStatus(d) === "paid";
    case "unpaid":
      return !deleted && donorStatus(d) === "unpaid";
    case "overdue":
      return !deleted && overdueDays(d) > 0;
    default:
      return !deleted;
  }
}

function DonorsList() {
  const donors = useAllDonors();
  usePayments();
  const loaded = useStoreLoaded();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return donors.filter(
      (d) =>
        matchesFilter(d, filter) &&
        (term === "" ||
          d.name.toLowerCase().includes(term) ||
          (d.code ?? "").toLowerCase().includes(term) ||
          d.phone.includes(term) ||
          d.area.toLowerCase().includes(term) ||
          (d.notes ?? "").toLowerCase().includes(term)),
    );
  }, [donors, q, filter]);

  const activeCount = donors.filter((d) => !d.deletedAt).length;
  const showingDeleted = filter === "deleted";

  return (
    <AppShell
      title="قائمة المتبرعين"
      subtitle={`${activeCount} متبرع نشط في الموكب`}
      action={
        <Link
          to="/donors/new"
          className="gradient-gold rounded-lg px-4 py-2 text-sm font-semibold text-gold-foreground shadow-[var(--shadow-soft)]"
        >
          + إضافة متبرع
        </Link>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو المنطقة أو الملاحظات…"
            maxLength={60}
            className="w-full rounded-lg border border-input bg-card py-2.5 pr-10 pl-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">المعرّف</th>
              <th className="px-5 py-3 font-medium">الاسم</th>
              <th className="px-5 py-3 font-medium">الهاتف</th>
              <th className="px-5 py-3 font-medium">التبرع الشهري</th>
              <th className="px-5 py-3 font-medium">آخر تبرع</th>
              <th className="px-5 py-3 font-medium">الحالة</th>
              <th className="px-5 py-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((d) => {
              const over = d.deletedAt ? 0 : overdueDays(d);
              const last = lastDonationDate(d.id);
              return (
              <tr key={d.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground" dir="ltr">
                  {d.code ?? "—"}
                </td>
                <td className="px-5 py-3.5 font-semibold text-ink">{d.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{d.phone}</td>
                <td className="px-5 py-3.5 font-medium text-primary">{formatIQD(d.monthlyAmount)}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{last ?? "لا يوجد"}</td>
                <td className="px-5 py-3.5">
                  {d.deletedAt ? (
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      محذوف
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusPill status={donorStatus(d)} />
                      {over > 0 ? (
                        <span className="inline-flex rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                          متأخر {over} يوم
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    {d.deletedAt ? (
                      <>
                        <ConfirmDialog
                          title="استعادة المتبرع"
                          description={`سيتم إرجاع «${d.name}» إلى قائمة المتبرعين النشطين مع كامل سجل دفعاته.`}
                          confirmLabel="نعم، استعده"
                          onConfirm={async () => {
                            try {
                              await restoreDonor(d.id);
                              toast.success("تمت استعادة المتبرع");
                            } catch (err) {
                              toast.error(errorMessage(err, "تعذّرت الاستعادة"));
                            }
                          }}
                          trigger={(open) => (
                            <button
                              type="button"
                              onClick={open}
                              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                            >
                              <RotateCcw className="h-4 w-4" />
                              استعادة
                            </button>
                          )}
                        />
                        <DeleteDonorButton
                          name={d.name}
                          permanent
                          onConfirm={async () => {
                            try {
                              await purgeDonor(d.id);
                              toast.success("تم الحذف نهائياً");
                            } catch (err) {
                              toast.error(errorMessage(err, "تعذّر الحذف"));
                            }
                          }}
                        />
                      </>
                    ) : (
                      <>
                    <Link
                      to="/donors/$donorId"
                      params={{ donorId: d.id }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      التفاصيل
                    </Link>
                    <Link
                      to="/donors/edit/$donorId"
                      params={{ donorId: d.id }}
                      aria-label={`تعديل ${d.name}`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <DeleteDonorButton
                      name={d.name}
                      onConfirm={async () => {
                        try {
                          await deleteDonor(d.id);
                          toast.success("تم نقل المتبرع إلى المحذوفين مع الاحتفاظ بسجل دفعاته");
                        } catch (err) {
                          toast.error(errorMessage(err, "تعذّر حذف المتبرع"));
                        }
                      }}
                    />
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            {!loaded ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ تحميل بيانات المتبرعين…
                  </span>
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  {showingDeleted
                    ? "لا يوجد متبرعون محذوفون"
                    : q.trim()
                      ? "لا توجد نتائج مطابقة لبحثك"
                      : "لا يوجد متبرعون بعد. ابدأ بإضافة متبرع جديد."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}