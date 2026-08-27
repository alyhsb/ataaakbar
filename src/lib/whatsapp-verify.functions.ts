import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const phoneSchema = z.string().trim().min(7).max(20);

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

/** Converts a locally written Iraqi number (07XX…) to E.164 for WhatsApp. */
function toE164(phone: string) {
  let d = digits(phone);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("964")) return `+${d}`;
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 && d.startsWith("7")) return `+964${d}`;
  return `+${d}`;
}

async function hashCode(phone: string, code: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${digits(phone)}:${code}`),
  );
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + ((bytes[0] ?? 0) % 900000));
}

const CODE_TTL_MINUTES = 10;
const RESEND_SECONDS = 60;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

/** Sends a 6-digit WhatsApp verification code (WasenderAPI) for a phone number. */
export const sendPhoneVerificationCode = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone: phoneSchema }).parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["WASENDER_API_KEY"];
    if (!apiKey) throw new Error("خدمة التحقق عبر واتساب غير مهيأة، راجع إدارة التطبيق");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = digits(data.phone);
    if (phone.length < 7) throw new Error("رقم هاتف غير صالح");

    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("phone_verifications")
      .select("id, created_at")
      .eq("phone", phone)
      .gte("created_at", hourAgo)
      .order("created_at", { ascending: false });

    const rows = recent ?? [];
    if (rows.length >= MAX_PER_HOUR)
      throw new Error("تم إرسال عدة رموز لهذا الرقم، حاول بعد ساعة");
    const last = rows[0];
    if (last && Date.now() - new Date(last.created_at as string).getTime() < RESEND_SECONDS * 1000)
      throw new Error("انتظر دقيقة قبل طلب رمز جديد");

    const code = randomCode();
    const { error: insertError } = await supabaseAdmin.from("phone_verifications").insert({
      phone,
      code_hash: await hashCode(phone, code),
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
    });
    if (insertError) throw new Error("تعذّر إنشاء رمز التحقق، حاول مجدداً");

    const text = `رمز التحقق الخاص بك في تطبيق عطاء الأكبر هو: ${code}\nالرمز صالح لمدة ${CODE_TTL_MINUTES} دقائق. لا تشاركه مع أي شخص.`;

    let response: Response;
    try {
      response = await fetch("https://wasenderapi.com/api/send-message", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: toE164(data.phone), text }),
      });
    } catch {
      throw new Error("تعذّر الاتصال بخدمة واتساب، حاول مجدداً");
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`WasenderAPI send failed [${response.status}]: ${body}`);
      if (response.status === 401 || response.status === 403)
        throw new Error("خدمة واتساب غير مفعّلة حالياً، راجع إدارة التطبيق");
      if (response.status === 429) throw new Error("الخدمة مزدحمة حالياً، حاول بعد قليل");
      throw new Error("تعذّر إرسال رمز التحقق عبر واتساب، تأكد من رقمك أو حاول لاحقاً");
    }

    return { sent: true, expiresInMinutes: CODE_TTL_MINUTES, resendAfterSeconds: RESEND_SECONDS };
  });

/** Verifies the WhatsApp code; a verified row stays valid for 15 minutes for sign-up. */
export const verifyPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ phone: phoneSchema, code: z.string().trim().min(4).max(10) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = digits(data.phone);

    const { data: row } = await supabaseAdmin
      .from("phone_verifications")
      .select("id, code_hash, attempts, expires_at, verified_at, consumed_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("لا يوجد رمز تحقق لهذا الرقم، اطلب رمزاً جديداً");
    if (new Date(row.expires_at as string).getTime() < Date.now())
      throw new Error("انتهت صلاحية الرمز، اطلب رمزاً جديداً");
    if ((row.attempts as number) >= MAX_ATTEMPTS)
      throw new Error("تجاوزت عدد المحاولات، اطلب رمزاً جديداً");

    const expected = await hashCode(phone, data.code.trim());
    if (expected !== row.code_hash) {
      await supabaseAdmin
        .from("phone_verifications")
        .update({ attempts: (row.attempts as number) + 1 })
        .eq("id", row.id as string);
      throw new Error("رمز التحقق غير صحيح");
    }

    await supabaseAdmin
      .from("phone_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", row.id as string);

    return { verified: true };
  });
