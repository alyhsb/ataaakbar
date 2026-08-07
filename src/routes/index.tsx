import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

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
  const { ready, userId, role } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && userId && role) {
      navigate({ to: role === "admin" ? "/admin" : "/donor", replace: true });
    }
  }, [ready, userId, role, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name, phone },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setPending(true);
          toast.success("تم إنشاء الحساب، تحقق من بريدك لتفعيله");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إتمام العملية");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("تعذّر تسجيل الدخول عبر Google");
    }
  }

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

          <h1 className="font-display text-2xl font-bold text-ink">
            {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب متبرع"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "أدخل بياناتك للمتابعة إلى النظام" : "سجّل بياناتك للانضمام إلى الموكب"}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
            {(
              [
                { key: "signin", label: "دخول" },
                { key: "signup", label: "حساب جديد" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setMode(t.key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === t.key
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {pending ? (
            <div className="mt-6 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
              أرسلنا رابط التفعيل إلى بريدك الإلكتروني. بعد التفعيل يمكنك تسجيل الدخول.
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            {mode === "signup" ? (
              <>
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
                    الاسم الكامل
                  </label>
                  <input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-ink">
                    رقم الهاتف
                  </label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </>
            ) : null}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="gradient-emerald flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-70"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "signin" ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            أو
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={onGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-card py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-secondary"
          >
            المتابعة باستخدام Google
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            بياناتك محفوظة بأمان وتُستخدم فقط لإدارة تبرعات الموكب.
          </p>
        </div>
      </div>
    </div>
  );
}
