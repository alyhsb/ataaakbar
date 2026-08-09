import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDonorByUser, updateOwnDonorInfo, useStoreLoaded } from "@/lib/donors-store";
import { APP_NAME } from "@/lib/app-info";

export const Route = createFileRoute("/_authenticated/complete-profile")({
  head: () => ({
    meta: [
      { title: "إكمال بيانات الحساب — عطاء الأكبر" },
      {
        name: "description",
        content: "أكمل بياناتك الشخصية للانضمام إلى موكب شباب علي الأكبر ومتابعة تبرعاتك الشهرية.",
      },
      { property: "og:title", content: "إكمال بيانات الحساب — عطاء الأكبر" },
      { property: "og:description", content: "استكمال معلومات المتبرع بعد تسجيل الدخول لأول مرة." },
    ],
  }),
  component: CompleteProfilePage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function CompleteProfilePage() {
  const { userId, email: authEmail, role } = useAuth();
  const loaded = useStoreLoaded();
  const donor = useDonorByUser(userId ?? undefined);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(authEmail?.endsWith("@ataa.local") ? "" : (authEmail ?? ""));
  }, [authEmail]);

  useEffect(() => {
    if (role === "admin") navigate({ to: "/admin", replace: true });
    else if (loaded && donor?.profileCompleted) navigate({ to: "/donor", replace: true });
  }, [role, loaded, donor?.profileCompleted, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!donor || busy) return;
    if (name.trim().length < 3) {
      toast.error("يرجى إدخال الاسم الكامل");
      return;
    }
    if (!/^[\d\s+-]{7,20}$/.test(phone.trim())) {
      toast.error("رقم هاتف غير صالح");
      return;
    }
    setBusy(true);
    try {
      if (password) {
        if (password.length < 6) throw new Error("كلمة المرور يجب أن تكون ٦ أحرف على الأقل");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      await updateOwnDonorInfo(donor.id, {
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        location: location.trim(),
        profileCompleted: true,
      });
      toast.success("تم حفظ بياناتك");
      navigate({ to: "/donor", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر حفظ البيانات");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <span className="gradient-gold flex h-11 w-11 items-center justify-center rounded-xl font-display text-xl font-bold text-gold-foreground">
            ع
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">إكمال بيانات الحساب</h1>
            <p className="text-xs text-muted-foreground">
              أكمل معلوماتك للمتابعة إلى {APP_NAME}
            </p>
          </div>
        </div>

        <form className="surface-card space-y-4 p-6" onSubmit={onSubmit} noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">الاسم الكامل</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">رقم الهاتف</span>
            <input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} className={inputCls} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">البريد الإلكتروني</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} type="email" />
            {authEmail && !authEmail.endsWith("@ataa.local") ? (
              <span className="mt-1 block text-[11px] text-muted-foreground">
                بريدك المُوثَّق عبر Google: {authEmail}
              </span>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">المنطقة</span>
            <input value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">العنوان</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">كلمة المرور (اختياري)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="لتتمكن من الدخول بكلمة مرور لاحقاً"
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !donor}
            className="gradient-emerald flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            حفظ ومتابعة
          </button>
        </form>
      </div>
    </div>
  );
}
