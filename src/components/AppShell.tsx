import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserPlus, LogOut, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth, signOut } from "@/lib/auth";

const adminNav = [
  { to: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/donors", label: "قائمة المتبرعين", icon: Users },
  { to: "/donors/new", label: "إضافة متبرع", icon: UserPlus },
] as const;

const donorNav = [{ to: "/donor", label: "بوابة المتبرع", icon: Heart }] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useAuth();
  const nav = role === "admin" ? adminNav : donorNav;

  return (
    <div dir="rtl" className="min-h-screen bg-background lg:flex">
      <aside className="gradient-emerald sticky top-0 z-20 flex items-center gap-2 overflow-x-auto px-4 py-3 lg:h-screen lg:w-64 lg:flex-col lg:items-stretch lg:gap-1 lg:overflow-visible lg:px-4 lg:py-6">
        <Link to={role === "admin" ? "/admin" : "/donor"} className="hidden items-center gap-3 px-2 pb-8 lg:flex">
          <span className="gradient-gold flex h-10 w-10 items-center justify-center rounded-xl font-display text-lg font-bold text-gold-foreground">
            ع
          </span>
          <span>
            <span className="block font-display text-xl font-bold text-primary-foreground">عطاء</span>
            <span className="block text-[11px] text-primary-foreground/70">إدارة تبرعات الموكب</span>
          </span>
        </Link>

        {nav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-gold text-gold-foreground"
                  : "text-primary-foreground/80 hover:bg-primary-foreground/10"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-auto hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 lg:flex"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action}
        </header>
        {children}
      </main>
    </div>
  );
}

export function StatusPill({ status }: { status: "paid" | "unpaid" }) {
  const styles = {
    paid: "bg-primary/10 text-primary",
    unpaid: "bg-destructive/10 text-destructive",
  } as const;
  const labels = { paid: "مدفوع", unpaid: "غير مدفوع" } as const;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}