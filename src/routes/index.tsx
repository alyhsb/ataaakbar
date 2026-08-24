import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/app-info";
import {
  requestAccountRecovery,
  checkAccountRecovery,
  completeAccountRecovery,
  registerDonorAccount,
  activateDonorAccount,
  lookupDonorPhone,
} from "@/lib/users.functions";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عطاء الأكبر — تسجيل الدخول لإدارة تبرعات الموكب" },
      {
        name: "description",
        content:
          "منصة عطاء الأكبر لإدارة التبرعات الشهرية للموكب الحسيني: تسجيل الدخول برقم الهاتف ورمز الدخول.",
      },
      { property: "og:title", content: "عطاء الأكبر — إدارة التبرعات الشهرية للموكب الحسيني" },
      {
        property: "og:description",
        content: "سجّل الدخول برقم الهاتف ورمز الدخول لمتابعة تبرعات الموكب.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WelcomePage,
});

type Choice = "donor" | "owner";

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function toLoginEmail(phone: string) {
  return `${phone.replace(/\D/g, "")}@ataa.local`;
}

function WelcomePage() {
  const navigate = useNavigate();
  const { ready, userId, role } = useAuth();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [phone, setPhone] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "activate" | "recover">("login");
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<"idle" | "pending" | "approved">("idle");
  const [preRegistered, setPreRegistered] = useState<{ name: string | null } | null>(null);
  const [activationCode, setActivationCode] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);

  async function checkPhone() {
    if (choice !== "donor" || (mode !== "register" && mode !== "login")) return;
    if (phone.replace(/\D/g, "").length < 7) {
      setPreRegistered(null);
      setNeedsActivation(false);
      return;
    }
    try {
      const res = await lookupDonorPhone({ data: { phone } });
      setNeedsActivation(res.needsActivation);
      if (res.preRegistered) {
        setPreRegistered({ name: res.name });
        if (res.name && !fullName.trim()) setFullName(res.name);
      } else {
        setPreRegistered(null);
      }
    } catch {
      setPreRegistered(null);
      setNeedsActivation(false);
    }
  }


  useEffect(() => {
    if (ready && userId && role) {
      navigate({ to: role === "donor" ? "/donor" : "/admin", replace: true });
    }
  }, [ready, userId, role, navigate]);

  async function openRecovery() {
    setMode("recover");
    setDuplicate(false);
    setAccessCode("");
    if (phone.replace(/\D/g, "").length >= 7) {
      try {
        const res = await checkAccountRecovery({ data: { phone } });
        setRecoveryStatus(
          res.status === "approved" ? "approved" : res.status === "pending" ? "pending" : "idle",
        );
      } catch {
        setRecoveryStatus("idle");
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 7) throw new Error("رقم هاتف غير صالح");

      if (mode === "recover") {
        if (recoveryStatus === "approved") {
          if (accessCode.length < 6) throw new Error("رمز الدخول يجب ألا يقل عن 6 خانات");
          await completeAccountRecovery({ data: { phone, accessCode } });
          toast.success("تم تحديث رمز الدخول، سجّل الدخول برمزك الجديد");
          setMode("login");
          setRecoveryStatus("idle");
          setAccessCode("");
          return;
        }
        const res = await requestAccountRecovery({
          data: { phone, name: fullName.trim() || undefined },
        });
        setRecoveryStatus(res.status === "approved" ? "approved" : "pending");
        toast.success(
          res.status === "approved"
            ? "تمت الموافقة على طلبك، ضع رمز دخول جديد الآن"
            : "تم إرسال طلب الاستعادة إلى الإدارة، راجعهم للتحقق من هويتك",
        );
        return;
      }

      if (choice === "donor" && mode === "activate") {
        if (activationCode.trim().length < 4) throw new Error("أدخل رمز التفعيل الذي زوّدك به الموكب");
        if (accessCode.length < 6) throw new Error("رمز الدخول يجب ألا يقل عن 6 خانات");
        await activateDonorAccount({
          data: { phone, activationCode: activationCode.trim(), accessCode },
        });
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: toLoginEmail(phone),
          password: accessCode,
        });
        setActivationCode("");
        setNeedsActivation(false);
        if (signInError) {
          setMode("login");
          throw new Error("تم تفعيل الحساب، سجّل الدخول برقمك ورمزك الجديد");
        }
        toast.success("تم تفعيل حسابك بنجاح، ورمز التفعيل أصبح غير صالح للاستخدام مرة أخرى");
        return;
      }

      if (choice === "donor" && mode === "register") {
        if (fullName.trim().length < 3) throw new Error("الرجاء إدخال الاسم الكامل");
        if (accessCode.length < 6) throw new Error("رمز الدخول يجب ألا يقل عن 6 خانات");
        let linkedMemberships = 0;
        try {
          const res = await registerDonorAccount({
            data: { phone, accessCode, name: fullName.trim() },
          });
          linkedMemberships = res.linkedMemberships;
        } catch (err) {
          const message = err instanceof Error ? err.message : "تعذّر إنشاء الحساب";
          if (/غير مُفعّل/.test(message)) {
            setNeedsActivation(true);
            setMode("activate");
            setAccessCode("");
          } else if (/موجود مسبقاً/.test(message)) setDuplicate(true);
          throw new Error(message);
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: toLoginEmail(phone),
          password: accessCode,
        });
        if (signInError) throw new Error("تم إنشاء الحساب، سجّل الدخول برقمك ورمزك");
        toast.success(
          linkedMemberships > 0
            ? "تم تنشيط حسابك وربطه بسجلك السابق في الموكب"
            : "تم إنشاء حسابك، اختر موكباً للانضمام إليه",
        );
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: toLoginEmail(phone),
        password: accessCode,
      });
      if (error) {
        if (choice === "donor") {
          try {
            const res = await lookupDonorPhone({ data: { phone } });
            if (res.needsActivation) {
              setNeedsActivation(true);
              setMode("activate");
              setAccessCode("");
              throw new Error(
                "حسابك مُنشأ من قبل إدارة الموكب وغير مُفعّل. أدخل رمز التفعيل لإنشاء رمز دخولك الخاص.",
              );
            }
          } catch (lookupErr) {
            if (lookupErr instanceof Error && /غير مُفعّل/.test(lookupErr.message)) throw lookupErr;
          }
        }
        throw new Error("رقم الهاتف أو رمز الدخول غير صحيح");
      }

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="gradient-gold flex h-16 w-16 items-center justify-center rounded-2xl font-display text-3xl font-bold text-gold-foreground">
            ع
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold text-ink">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نظام إدارة التبرعات الشهرية للمواكب الحسينية
          </p>
        </div>

        {choice === null ? (
          <div className="space-y-3">
            <p className="mb-4 text-center text-sm font-medium text-ink">اختر نوع الحساب للمتابعة</p>
            <button
              type="button"
              onClick={() => setChoice("donor")}
              className="gradient-emerald flex w-full items-center justify-between rounded-2xl px-5 py-6 text-primary-foreground shadow-[var(--shadow-soft)]"
            >
              <span className="flex items-center gap-3">
                <Heart className="h-6 w-6" />
                <span className="font-display text-xl font-bold">المتبرع</span>
              </span>
              <ArrowRight className="h-5 w-5 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => setChoice("owner")}
              className="surface-card flex w-full items-center justify-between rounded-2xl border border-gold/40 px-5 py-6 text-ink"
            >
              <span className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-gold" />
                <span className="font-display text-xl font-bold">صاحب الموكب</span>
              </span>
              <ArrowRight className="h-5 w-5 rotate-180 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setChoice(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              ← رجوع لاختيار نوع الحساب
            </button>

            {choice === "donor" ? (
              <div className="surface-card space-y-2 p-5 text-sm leading-relaxed text-muted-foreground">
                <p className="font-display text-base font-bold text-ink">أهلاً بك في عطاء الأكبر</p>
                <p>
                  أنشئ حسابك برقم هاتفك ورمز دخول خاص بك، ثم اختر الموكب أو المواكب التي ترغب
                  بالتبرع لها وأرسل طلب انضمام.
                </p>
              </div>
            ) : (
              <div className="surface-card space-y-2 p-5 text-sm leading-relaxed text-muted-foreground">
                <p className="font-display text-base font-bold text-ink">
                  أهلاً بك في تطبيق عطاء الأكبر
                </p>
                <p>
                  تطبيق عطاء الأكبر هو نظام مخصص لإدارة وتنظيم التبرعات الخاصة بالمواكب والهيئات
                  الحسينية، ويساعد على تنظيم بيانات المتبرعين ومتابعة التبرعات الشهرية بطريقة سهلة
                  ومنظمة.
                </p>
                <p>
                  إذا كنت صاحب هيئة أو موكب حسيني وترغب باستخدام التطبيق لإدارة تبرعات موكبك، يمكنك
                  التواصل معنا للحصول على حساب خاص بموكبك.
                </p>
                <p className="text-ink">
                  للتواصل والاستفسار:{" "}
                  <a href="tel:07722905522" className="font-semibold text-primary" dir="ltr">
                    07722905522
                  </a>
                </p>
              </div>
            )}

            <form className="surface-card space-y-4 p-5" onSubmit={onSubmit}>
              <h2 className="font-display text-lg font-bold text-ink">
                {mode === "recover"
                  ? "استعادة الحساب"
                  : choice === "owner"
                    ? "تسجيل الدخول لصاحب الموكب"
                    : mode === "login"
                      ? "تسجيل الدخول للمتبرع"
                      : "إنشاء حساب متبرع جديد"}
              </h2>
              {choice === "donor" && mode !== "recover" ? (
                <div className="flex rounded-lg bg-secondary p-1">
                  {(["login", "register"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m);
                        setDuplicate(false);
                      }}
                      className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        mode === m ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      {m === "login" ? "تسجيل الدخول" : "حساب جديد"}
                    </button>
                  ))}
                </div>
              ) : null}

              {duplicate ? (
                <div className="space-y-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-ink">
                  <p className="font-semibold">هذا الرقم مرتبط بحساب موجود مسبقاً.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setDuplicate(false);
                      }}
                      className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      type="button"
                      onClick={() => void openRecovery()}
                      className="flex-1 rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-primary"
                    >
                      استعادة الحساب
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "recover" ? (
                <p className="rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
                  {recoveryStatus === "approved"
                    ? "تمت الموافقة على طلبك — ضع رمز دخول جديد لحسابك نفسه، وستبقى كل مواكبك وسجل تبرعاتك كما هي."
                    : recoveryStatus === "pending"
                      ? "طلبك قيد المراجعة لدى الإدارة. تواصل معهم للتحقق من هويتك ثم عد إلى هذه الصفحة."
                      : "أدخل رقم هاتفك لإرسال طلب استعادة إلى الإدارة. بعد التحقق من هويتك ستضع رمز دخول جديد لنفس الحساب دون فقدان أي بيانات."}
                </p>
              ) : null}

              {(choice === "donor" && mode === "register") ||
              (mode === "recover" && recoveryStatus === "idle") ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">الاسم الكامل</span>
                  <input
                    required={mode === "register"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="الاسم الثلاثي"
                    className={inputCls}
                  />
                </label>
              ) : null}
              {preRegistered && choice === "donor" && mode === "register" ? (
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs leading-relaxed text-ink">
                  رقمك مسجّل مسبقاً كمتبرع من قبل إدارة الموكب
                  {preRegistered.name ? ` باسم «${preRegistered.name}»` : ""}. ضع رمز دخول خاص بك
                  الآن وسيتم ربط حسابك بسجلك الحالي (الموكب، مبلغ التبرع، وسجل الدفعات) دون إنشاء
                  سجل مكرّر.
                </div>
              ) : null}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">رقم الهاتف</span>
                <input
                  required
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => void checkPhone()}
                  placeholder="07XX XXX XXXX"
                  className={inputCls}
                />
              </label>
              {mode !== "recover" || recoveryStatus === "approved" ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    {mode === "recover" ? "رمز الدخول الجديد" : "رمز الدخول"}
                  </span>
                  <input
                    required
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="رمز خاص بك لا يقل عن ٦ خانات"
                    className={inputCls}
                  />
                </label>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="gradient-emerald flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === "recover"
                  ? recoveryStatus === "approved"
                    ? "حفظ الرمز الجديد"
                    : recoveryStatus === "pending"
                      ? "تحديث حالة الطلب"
                      : "إرسال طلب الاستعادة"
                  : choice === "donor" && mode === "register"
                    ? "إنشاء الحساب"
                    : "تسجيل الدخول"}
              </button>
              {mode === "recover" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setRecoveryStatus("idle");
                  }}
                  className="w-full text-center text-[11px] font-semibold text-muted-foreground hover:text-primary"
                >
                  ← رجوع لتسجيل الدخول
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void openRecovery()}
                  className="w-full text-center text-[11px] font-semibold text-muted-foreground hover:text-primary"
                >
                  نسيت رمز الدخول؟ استعادة الحساب
                </button>
              )}
              <p className="text-center text-[11px] text-muted-foreground">
                {choice === "donor"
                  ? "حساب واحد يكفي لكل المواكب — بعد الدخول اختر المواكب التي تود التبرع لها."
                  : "حسابات أصحاب المواكب تُنشأ من قبل إدارة التطبيق فقط."}
              </p>
            </form>

          </div>
        )}
      </div>
    </div>
  );
}
