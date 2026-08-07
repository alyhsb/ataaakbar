import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Wallet, CheckCircle2, AlertTriangle, TrendingUp, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, StatusPill } from "@/components/AppShell";
import {
  useDonors,
  usePayments,
  stats,
  monthlySeries,
  statusSplit,
  topDonors,
  formatIQD,
  donorStatus,
  CURRENT_MONTH,
  monthLabel,
  startNewMonth,
  periodLabel,
} from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم المسؤول — عطاء" },
      {
        name: "description",
        content:
          "نظرة عامة على تبرعات الموكب: عدد المتبرعين، المتوقع شهرياً، المحصّل، المتبقي، والمتبرعون غير المسددين.",
      },
      { property: "og:title", content: "لوحة تحكم المسؤول — عطاء" },
      { property: "og:description", content: "إحصائيات ورسوم بيانية لتبرعات الموكب الحسيني." },
    ],
  }),
  component: AdminDashboard,
});

const COLORS = ["var(--color-primary)", "var(--color-destructive)"];

function AdminDashboard() {
  const donors = useDonors();
  usePayments();
  const s = stats();
  const series = monthlySeries();
  const split = statusSplit();
  const top = topDonors();
  const recent = [...donors].slice(0, 5);
  const rate = Math.round((s.collected / Math.max(s.expectedTotal, 1)) * 100);

  const cards = [
    { label: "إجمالي المتبرعين", value: String(s.total), icon: Users, tone: "text-primary" },
    {
      label: "التبرعات المتوقعة شهرياً",
      value: formatIQD(s.expectedMonthly),
      icon: TrendingUp,
      tone: "text-primary",
    },
    { label: "إجمالي المحصّل", value: formatIQD(s.collected), icon: Wallet, tone: "text-primary" },
    {
      label: "المبلغ المتبقي",
      value: formatIQD(s.remaining),
      icon: AlertTriangle,
      tone: "text-destructive",
    },
    {
      label: "متبرعون غير مسددين",
      value: `${s.unpaidDonors} / ${s.total}`,
      icon: CheckCircle2,
      tone: "text-destructive",
    },
  ];

  return (
    <AppShell
      title="لوحة التحكم"
      subtitle="نظرة شاملة على تبرعات الموكب الحسيني"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const r = startNewMonth();
              if (r.count === 0) {
                toast.info("تم فتح هذا الشهر مسبقاً");
              } else {
                toast.success(`تم بدء ${periodLabel(r.month, r.year)} وإشعار ${r.count} متبرع`);
              }
            }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-[var(--shadow-soft)]"
          >
            بدء شهر جديد
          </button>
          <Link
            to="/donors/new"
            className="gradient-gold rounded-lg px-4 py-2 text-sm font-semibold text-gold-foreground shadow-[var(--shadow-soft)]"
          >
            + إضافة متبرع
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.tone}`} />
            </div>
            <p className="mt-3 font-display text-xl font-bold text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-ink">
              التحصيل مقابل المتوقع شهرياً
            </h2>
            <span className="text-xs text-muted-foreground">نسبة التحصيل الكلية {rate}%</span>
          </div>
          <div className="mt-4 h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  width={40}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [formatIQD(Number(v)), name]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                    direction: "rtl",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="expected"
                  name="المتوقع"
                  stroke="var(--color-gold)"
                  fill="url(#gExpected)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="المحصّل"
                  stroke="var(--color-primary)"
                  fill="url(#gCollected)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-base font-bold text-ink">
            حالة الدفع لشهر {monthLabel(CURRENT_MONTH)}
          </h2>
          <div className="mt-2 h-52" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={split}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                >
                  {split.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                    direction: "rtl",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2 text-sm">
            {split.map((e, i) => (
              <li key={e.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {e.name}
                </span>
                <span className="font-semibold text-ink">{e.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="font-display text-base font-bold text-ink">أعلى المتبرعين تسديداً</h2>
          <div className="mt-4 h-60" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => formatIQD(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                    direction: "rtl",
                  }}
                />
                <Bar dataKey="total" name="المحصّل" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-bold text-ink">أحدث المتبرعين</h2>
            <Link to="/donors" className="flex items-center gap-1 text-xs font-medium text-primary">
              عرض الكل <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link to="/donors/$donorId" params={{ donorId: d.id }} className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{formatIQD(d.monthlyAmount)}</p>
                </Link>
                <StatusPill status={donorStatus(d)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
