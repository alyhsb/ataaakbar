import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Wallet, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { AppShell, StatusPill } from "@/components/AppShell";
import {
  useDonors,
  stats,
  formatIQD,
  donorStatus,
  CURRENT_MONTH,
  monthLabel,
} from "@/lib/donors-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم المسؤول — عطاء" },
      {
        name: "description",
        content: "نظرة عامة على تبرعات الموكب: عدد المتبرعين، المبالغ المحصّلة، والدفعات المتأخرة.",
      },
      { property: "og:title", content: "لوحة تحكم المسؤول — عطاء" },
      { property: "og:description", content: "متابعة تبرعات الموكب الحسيني الشهرية." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const donors = useDonors();
  const s = stats();
  const recent = [...donors].slice(0, 5);

  const cards = [
    { label: "عدد المتبرعين", value: String(s.total), icon: Users },
    { label: "إجمالي المحصّل", value: formatIQD(s.collected), icon: Wallet },
    { label: `دفعوا شهر ${monthLabel(CURRENT_MONTH)}`, value: `${s.paidThisMonth} / ${s.total}`, icon: CheckCircle2 },
    { label: "دفعات متأخرة", value: String(s.lateCount), icon: AlertTriangle },
  ];

  return (
    <AppShell
      title="لوحة التحكم"
      subtitle="نظرة عامة على تبرعات الموكب لهذا الشهر"
      action={
        <Link
          to="/donors/new"
          className="gradient-gold rounded-lg px-4 py-2 text-sm font-semibold text-gold-foreground shadow-[var(--shadow-soft)]"
        >
          + إضافة متبرع
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="surface-card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-bold text-ink">أحدث المتبرعين</h2>
            <Link to="/donors" className="flex items-center gap-1 text-xs font-medium text-primary">
              عرض الكل <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <Link to="/donors/$donorId" params={{ donorId: d.id }} className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.area}</p>
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-primary">{formatIQD(d.monthlyAmount)}</span>
                  <StatusPill status={donorStatus(d)} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-base font-bold text-ink">الاشتراك الشهري المتوقع</h2>
          <p className="mt-3 font-display text-3xl font-bold text-primary">
            {formatIQD(s.expectedMonthly)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">مجموع التزامات المتبرعين الشهرية</p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">نسبة التحصيل هذا الشهر</span>
              <span className="font-semibold text-ink">
                {Math.round((s.paidThisMonth / Math.max(s.total, 1)) * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="gradient-gold h-full rounded-full"
                style={{ width: `${(s.paidThisMonth / Math.max(s.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}