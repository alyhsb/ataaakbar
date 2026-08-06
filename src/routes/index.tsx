import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, HeartHandshake } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عطاء — تسجيل الدخول لإدارة تبرعات الموكب" },
      {
        name: "description",
        content:
          "منصة عطاء لإدارة التبرعات الشهرية للموكب الحسيني: تسجيل المتبرعين ومتابعة الدفعات الشهرية بسهولة.",
      },
      { property: "og:title", content: "عطاء — إدارة التبرعات الشهرية للموكب الحسيني" },
      {
        property: "og:description",
        content: "سجّل الدخول لإدارة المتبرعين ومتابعة الدفعات الشهرية للموكب.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"admin" | "donor">("admin");

  return (
    <div dir="rtl" className="grid min-h-screen lg:grid-cols-2">
      <div className="gradient-emerald relative hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="gradient-gold flex h-11 w-11 items-center justify-center rounded-xl font-display text-xl font-bold text-gold-foreground">
            ع
          </span>
          <span className="font-display text-2xl font-bold text-primary-foreground">عطاء</span>
        </div>
        <div>
          <h2 className="max-w-md font-display text-4xl leading-tight font-bold text-primary-foreground">
            نظام إدارة التبرعات الشهرية <span className="text-gradient-gold">للموكب الحسيني</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/75">
            سجّل المتبرعين، تابع الاشتراكات الشهرية، واعرف حالة كل دفعة في مكان واحد منظم وواضح.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          «وما تقدّموا لأنفسكم من خيرٍ تجدوه عند الله»
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="gradient-gold flex h-10 w-10 items-center justify-center rounded-xl font-display text-lg font-bold text-gold-foreground">
              ع
            </span>
            <span className="font-display text-xl font-bold text-ink">عطاء</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-muted-foreground">أدخل بياناتك للمتابعة إلى النظام</p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
            {(
              [
                { key: "admin", label: "مسؤول الموكب", icon: ShieldCheck },
                { key: "donor", label: "متبرع", icon: HeartHandshake },
              ] as const
            ).map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  role === r.key
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <r.icon className="h-4 w-4" />
                {r.label}
              </button>
            ))}
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: role === "admin" ? "/admin" : "/donor" });
            }}
          >
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-ink">
                رقم الهاتف
              </label>
              <input
                id="phone"
                defaultValue="0770 123 4567"
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                defaultValue="123456"
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              className="gradient-emerald w-full rounded-lg py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95"
            >
              دخول
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            بياناتك محفوظة ولا تُشارك مع أي جهة خارجية
          </p>
        </div>
      </div>
    </div>
  );
}
