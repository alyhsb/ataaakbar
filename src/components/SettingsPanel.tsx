import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  UserRound,
  Info,
  Palette,
  LogOut,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/lib/auth";
import { useDonorByUser, updateOwnDonorInfo, useStoreLoaded } from "@/lib/donors-store";
import { useThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";
import { APP_NAME } from "@/lib/app-info";

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-ink">
        <Icon className="h-4 w-4 text-gold" />
        {title}
      </h3>
      {children}
    </section>
  );
}

const themes: { key: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "light", label: "فاتح", icon: Sun },
  { key: "dark", label: "داكن", icon: Moon },
  { key: "system", label: "حسب النظام", icon: Monitor },
];

export function SettingsPanel() {
  const { userId, email: authEmail, role } = useAuth();
  useStoreLoaded();
  const donor = useDonorByUser(userId ?? undefined);
  const mode = useThemeMode();

  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPhone(donor?.phone ?? "");
    setArea(donor?.area ?? "");
    setLocation(donor?.location ?? "");
  }, [donor?.phone, donor?.area, donor?.location]);

  useEffect(() => {
    setEmail(authEmail?.endsWith("@ataa.local") ? "" : (authEmail ?? ""));
  }, [authEmail]);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (donor) {
        await updateOwnDonorInfo(donor.id, { phone: phone.trim(), area: area.trim(), location: location.trim() });
      }
      const trimmedEmail = email.trim();
      if (trimmedEmail && trimmedEmail !== authEmail) {
        const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (error) throw error;
        toast.info("أرسلنا رسالة تأكيد إلى بريدك الجديد");
      }
      if (password) {
        if (password.length < 6) throw new Error("كلمة المرور يجب أن تكون ٦ أحرف على الأقل");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
      }
      toast.success("تم حفظ التغييرات");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر حفظ التغييرات");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="الإعدادات"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary"
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="hidden sm:inline">الإعدادات</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" dir="rtl" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-right">
          <SheetTitle className="font-display text-lg text-ink">الإعدادات</SheetTitle>
          <SheetDescription className="text-xs">
            إدارة معلومات حسابك ومظهر التطبيق
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <Section icon={UserRound} title="معلومات الحساب">
            <form className="space-y-3" onSubmit={saveAccount}>
              {donor ? (
                <Field label="الاسم الكامل">
                  <input value={donor.name} readOnly className={`${inputCls} bg-secondary text-muted-foreground`} />
                </Field>
              ) : null}
              {donor && role !== "admin" ? (
                <p className="text-[11px] text-muted-foreground">
                  لا يمكن تعديل الاسم الكامل إلا من قبل مسؤول الموكب.
                </p>
              ) : null}
              {donor ? (
                <>
                  <Field label="رقم الهاتف">
                    <input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="المنطقة">
                    <input value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="العنوان">
                    <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
                  </Field>
                </>
              ) : null}
              <Field label="البريد الإلكتروني">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className={inputCls}
                />
              </Field>
              <Field label="كلمة مرور جديدة">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="اتركها فارغة لعدم التغيير"
                  className={inputCls}
                />
              </Field>
              <button
                type="submit"
                disabled={busy}
                className="gradient-emerald flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                حفظ التغييرات
              </button>
            </form>
          </Section>

          <Section icon={Info} title="معلومات عن التطبيق">
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p className="font-display text-base font-bold text-ink">{APP_NAME}</p>
              <p>
                تطبيق {APP_NAME} هو تطبيق مخصص لتنظيم وإدارة التبرعات وخدمة مواكب الإمام الحسين عليه
                السلام، ويهدف إلى تسهيل متابعة التبرعات الشهرية وتنظيم بيانات المتبرعين.
              </p>
              <p>
                تم إنشاء التطبيق وتطوير فكرته من قبل مجموعة من شباب موكب شباب علي الأكبر، لتقديم خدمة
                تساعد على تنظيم العمل وخدمة زوار أبي عبدالله الحسين (ع).
              </p>
              <p className="text-ink">
                موكب شباب علي الأكبر
                <br />
                بابل – الهاشمية
              </p>
              <p>
                للتواصل:{" "}
                <a href="tel:07722905522" className="font-semibold text-primary" dir="ltr">
                  07722905522
                </a>
              </p>
            </div>
          </Section>

          <Section icon={Palette} title="المظهر">
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setThemeMode(t.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                    mode === t.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </Section>

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
