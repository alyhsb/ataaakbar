import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { DeleteDonorButton } from "@/components/DeleteDonorButton";
import {
  useDonors,
  donorStatus,
  formatIQD,
  deleteDonor,
  usePayments,
  type PaymentStatus,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/donors/")({
  head: () => ({
    meta: [
      { title: "قائمة المتبرعين — عطاء" },
      {
        name: "description",
        content: "استعرض جميع متبرعي الموكب مع مبالغ اشتراكهم الشهري وحالة الدفع.",
      },
      { property: "og:title", content: "قائمة المتبرعين — عطاء" },
      { property: "og:description", content: "جميع متبرعي الموكب وحالة دفعاتهم الشهرية." },
    ],
  }),
  component: DonorsList,
});

const filters: { key: PaymentStatus | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "paid", label: "مدفوع هذا الشهر" },
  { key: "unpaid", label: "غير مدفوع" },
];

function DonorsList() {
  const donors = useDonors();
  usePayments();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<PaymentStatus | "all">("all");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return donors.filter(
      (d) =>
        (filter === "all" || donorStatus(d) === filter) &&
        (term === "" ||
          d.name.toLowerCase().includes(term) ||
          d.phone.includes(term) ||
          d.area.toLowerCase().includes(term) ||
          (d.notes ?? "").toLowerCase().includes(term)),
    );
  }, [donors, q, filter]);

  return (
    <AppShell
      title="قائمة المتبرعين"
      subtitle={`${donors.length} متبرع مسجّل في الموكب`}
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
              <th className="px-5 py-3 font-medium">الاسم</th>
              <th className="px-5 py-3 font-medium">الهاتف</th>
              <th className="px-5 py-3 font-medium">المنطقة</th>
              <th className="px-5 py-3 font-medium">التبرع الشهري</th>
              <th className="px-5 py-3 font-medium">تاريخ الإضافة</th>
              <th className="px-5 py-3 font-medium">الحالة</th>
              <th className="px-5 py-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-5 py-3.5 font-semibold text-ink">{d.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{d.phone}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{d.area}</td>
                <td className="px-5 py-3.5 font-medium text-primary">{formatIQD(d.monthlyAmount)}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{d.joinedAt}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={donorStatus(d)} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
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
                      onConfirm={() => {
                        deleteDonor(d.id);
                        toast.success("تم حذف المتبرع");
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}