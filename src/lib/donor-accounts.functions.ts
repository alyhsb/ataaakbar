import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACCOUNT_EMAIL_DOMAIN = "ataa.local";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function randomPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

/** Creates a login account for an existing donor and returns the credentials. */
export const createDonorAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ donorId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: donor, error: donorError } = await supabaseAdmin
      .from("donors")
      .select("id, name, phone, username, user_id")
      .eq("id", data.donorId)
      .maybeSingle();
    if (donorError) throw donorError;
    if (!donor) throw new Error("المتبرع غير موجود");
    if (donor.user_id) throw new Error("هذا المتبرع لديه حساب بالفعل");

    const base = normalizePhone(donor.phone) || `donor${Date.now().toString().slice(-6)}`;
    let username = base;
    for (let i = 1; i < 20; i++) {
      const { data: taken } = await supabaseAdmin
        .from("donors")
        .select("id")
        .ilike("username", username)
        .maybeSingle();
      if (!taken) break;
      username = `${base}${i}`;
    }

    const password = randomPassword();
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: `${username}@${ACCOUNT_EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      user_metadata: { full_name: donor.name, phone: donor.phone, donor_id: donor.id },
    });
    if (createError) throw new Error(createError.message);

    const { error: updateError } = await supabaseAdmin
      .from("donors")
      .update({ username })
      .eq("id", donor.id);
    if (updateError) throw updateError;

    return { username, password };
  });

/** Resets an existing donor account password and returns the new one. */
export const resetDonorPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ donorId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: donor } = await supabaseAdmin
      .from("donors")
      .select("id, username, user_id")
      .eq("id", data.donorId)
      .maybeSingle();
    if (!donor?.user_id) throw new Error("لا يوجد حساب لهذا المتبرع");

    const password = randomPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(donor.user_id, { password });
    if (error) throw new Error(error.message);
    return { username: donor.username ?? "", password };
  });