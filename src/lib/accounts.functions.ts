import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACCOUNT_EMAIL_DOMAIN = "ataa.local";

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

function loginEmail(phone: string) {
  return `${digits(phone)}@${ACCOUNT_EMAIL_DOMAIN}`;
}

const donorInput = z.object({
  name: z.string().trim().min(3).max(100),
  phone: z.string().trim().min(7).max(20),
  accessCode: z.string().trim().min(6).max(72),
  area: z.string().trim().max(60).optional(),
  location: z.string().trim().max(120).optional(),
  monthlyAmount: z.number().int().min(0),
  dueDay: z.number().int().min(1).max(28).optional(),
  notes: z.string().trim().max(500).optional(),
  mawkibId: z.string().uuid().optional(),
});

type Caller = { isAdmin: boolean; isOwner: boolean; mawkibId: string | null };

type RpcClient = {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" | "owner" | "donor" },
  ) => PromiseLike<{ data: unknown }>;
};

async function resolveCaller(context: {
  supabase: unknown;
  userId: string;
}): Promise<Caller> {
  const client = context.supabase as RpcClient;
  const [{ data: admin }, { data: owner }] = await Promise.all([
    client.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    client.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
  ]);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("mawkib_id")
    .eq("id", context.userId)
    .maybeSingle();
  return {
    isAdmin: admin === true,
    isOwner: owner === true,
    mawkibId: (profile?.mawkib_id as string | null) ?? null,
  };
}

/** Creates a donor record together with its phone + access code login. */
export const createDonorWithAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => donorInput.parse(input))
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context);
    if (!caller.isAdmin && !caller.isOwner) throw new Error("غير مصرح لك بإنشاء الحسابات");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let mawkibId = caller.isAdmin ? (data.mawkibId ?? caller.mawkibId) : caller.mawkibId;
    if (!mawkibId && caller.isAdmin) {
      const { data: first } = await supabaseAdmin
        .from("mawakib")
        .select("id")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      mawkibId = (first?.id as string | undefined) ?? null;
    }
    if (!mawkibId) throw new Error("لا يوجد موكب مرتبط بحسابك");

    const phoneDigits = digits(data.phone);
    if (phoneDigits.length < 7) throw new Error("رقم هاتف غير صالح");

    const { data: existing } = await supabaseAdmin
      .from("donors")
      .select("id")
      .is("deleted_at", null)
      .eq("phone", data.phone)
      .maybeSingle();
    if (existing) throw new Error("رقم الهاتف مسجّل لمتبرع آخر بالفعل");

    const { data: donor, error: donorError } = await supabaseAdmin
      .from("donors")
      .insert({
        name: data.name,
        phone: data.phone,
        access_code: data.accessCode,
        area: data.area ?? "",
        location: data.location ?? "",
        monthly_amount: data.monthlyAmount,
        due_day: data.dueDay ?? 5,
        notes: data.notes ?? null,
        mawkib_id: mawkibId,
        profile_completed: true,
      })
      .select("id")
      .single();
    if (donorError) {
      if (/duplicate|unique/i.test(donorError.message))
        throw new Error("رقم الهاتف مسجّل لمتبرع آخر بالفعل");
      throw new Error(donorError.message);
    }

    const { error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail(data.phone),
      password: data.accessCode,
      email_confirm: true,
      user_metadata: {
        full_name: data.name,
        phone: data.phone,
        donor_id: donor.id,
        mawkib_id: mawkibId,
        account_type: "donor",
      },
    });
    if (userError) {
      await supabaseAdmin.from("donors").delete().eq("id", donor.id);
      if (/already been registered|exists/i.test(userError.message))
        throw new Error("رقم الهاتف مسجّل لحساب آخر بالفعل");
      throw new Error(userError.message);
    }

    return { donorId: donor.id as string };
  });

/** Admin / mawkib owner: changes a donor's name, phone or access code. */
export const updateDonorCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        donorId: z.string().uuid(),
        name: z.string().trim().min(3).max(100).optional(),
        phone: z.string().trim().min(7).max(20).optional(),
        accessCode: z.string().trim().min(6).max(72).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context);
    if (!caller.isAdmin && !caller.isOwner) throw new Error("غير مصرح لك بتعديل بيانات الدخول");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: donor } = await supabaseAdmin
      .from("donors")
      .select("id, name, phone, access_code, user_id, mawkib_id")
      .eq("id", data.donorId)
      .maybeSingle();
    if (!donor) throw new Error("المتبرع غير موجود");
    if (!caller.isAdmin && donor.mawkib_id !== caller.mawkibId)
      throw new Error("هذا المتبرع لا يتبع موكبك");

    const phone = data.phone ?? (donor.phone as string);
    const accessCode = data.accessCode ?? (donor.access_code as string | null) ?? "";

    const patch: Record<string, string> = {};
    if (data.name) patch['name'] = data.name;
    if (data.phone) patch['phone'] = data.phone;
    if (data.accessCode) patch['access_code'] = data.accessCode;
    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin.from("donors").update(patch).eq("id", donor.id);
      if (error) {
        if (/duplicate|unique/i.test(error.message))
          throw new Error("رقم الهاتف مسجّل لمتبرع آخر بالفعل");
        throw new Error(error.message);
      }
    }

    if (donor.user_id) {
      const authPatch: { email?: string; password?: string; email_confirm?: boolean } = {};
      if (data.phone) {
        authPatch.email = loginEmail(phone);
        authPatch.email_confirm = true;
      }
      if (data.accessCode) authPatch.password = data.accessCode;
      if (Object.keys(authPatch).length > 0) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          donor.user_id as string,
          authPatch,
        );
        if (error) throw new Error(error.message);
      }
    } else if (accessCode.length >= 6) {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: loginEmail(phone),
        password: accessCode,
        email_confirm: true,
        user_metadata: {
          full_name: data.name ?? donor.name,
          phone,
          donor_id: donor.id,
          mawkib_id: donor.mawkib_id,
          account_type: "donor",
        },
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

/** Main admin only: creates a mawkib and its owner login. */
export const createMawkibOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        mawkibName: z.string().trim().min(3).max(100),
        mawkibArea: z.string().trim().max(80).optional(),
        ownerName: z.string().trim().min(3).max(100),
        phone: z.string().trim().min(7).max(20),
        accessCode: z.string().trim().min(6).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context);
    if (!caller.isAdmin) throw new Error("غير مصرح لك بإنشاء حسابات أصحاب المواكب");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: mawkib, error: mawkibError } = await supabaseAdmin
      .from("mawakib")
      .insert({ name: data.mawkibName, area: data.mawkibArea ?? "", phone: data.phone })
      .select("id")
      .single();
    if (mawkibError) throw new Error(mawkibError.message);

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail(data.phone),
      password: data.accessCode,
      email_confirm: true,
      user_metadata: {
        full_name: data.ownerName,
        phone: data.phone,
        mawkib_id: mawkib.id,
        account_type: "owner",
      },
    });
    if (error) {
      await supabaseAdmin.from("mawakib").delete().eq("id", mawkib.id);
      if (/already been registered|exists/i.test(error.message))
        throw new Error("رقم الهاتف مسجّل لحساب آخر بالفعل");
      throw new Error(error.message);
    }

    return { mawkibId: mawkib.id as string };
  });