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

type RpcClient = {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" | "owner" | "donor" },
  ) => PromiseLike<{ data: unknown }>;
};

async function requireAdmin(context: { supabase: unknown; userId: string }) {
  const client = context.supabase as RpcClient;
  const { data } = await client.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("هذه الصفحة مخصّصة لإدارة التطبيق فقط");
}

async function callerRoles(context: { supabase: unknown; userId: string }) {
  const client = context.supabase as RpcClient;
  const [{ data: admin }, { data: owner }] = await Promise.all([
    client.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    client.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
  ]);
  return { isAdmin: admin === true, isOwner: owner === true };
}

export type AppUser = {
  id: string;
  name: string;
  phone: string;
  role: "admin" | "owner" | "donor";
  status: "active" | "inactive" | "pending";
  createdAt: string;
  lastLoginAt: string | null;
  mawakibCount: number;
};


/** Main admin only: every application account (donors + mawkib owners). */
export const listAppUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppUser[]> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: authUsers }, { data: profiles }, { data: roles }, { data: donorRows }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        supabaseAdmin.from("profiles").select("id, full_name, phone, status, last_login_at"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("donors").select("user_id, name, phone, deleted_at, membership_status"),
      ]);

    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const uid = r.user_id as string;
      rolesByUser.set(uid, [...(rolesByUser.get(uid) ?? []), r.role as string]);
    }
    const donorInfo = new Map<string, { count: number; name?: string; phone?: string }>();
    for (const d of donorRows ?? []) {
      const uid = d.user_id as string | null;
      if (!uid) continue;
      const entry = donorInfo.get(uid) ?? { count: 0 };
      if (!d.deleted_at && d.membership_status !== "rejected") entry.count += 1;
      entry.name = entry.name ?? (d.name as string);
      entry.phone = entry.phone ?? (d.phone as string);
      donorInfo.set(uid, entry);
    }

    return (authUsers?.users ?? []).map((u) => {
      const profile = profileById.get(u.id);
      const info = donorInfo.get(u.id);
      const userRoles = rolesByUser.get(u.id) ?? [];
      const role = userRoles.includes("admin")
        ? "admin"
        : userRoles.includes("owner")
          ? "owner"
          : "donor";
      const meta = (u.user_metadata ?? {}) as { full_name?: string; phone?: string };
      const banned = Boolean(
        (u as unknown as { banned_until?: string | null }).banned_until &&
          new Date((u as unknown as { banned_until: string }).banned_until).getTime() > Date.now(),
      );
      return {
        id: u.id,
        name:
          (profile?.full_name as string | null) ?? meta.full_name ?? info?.name ?? "مستخدم",
        phone:
          (profile?.phone as string | null) ??
          meta.phone ??
          info?.phone ??
          (u.email ?? "").split("@")[0] ??
          "",
        role: role as AppUser["role"],
        status:
          banned || profile?.status === "inactive"
            ? "inactive"
            : profile?.status === "pending"
              ? "pending"
              : "active",

        createdAt: u.created_at,
        lastLoginAt:
          (profile?.last_login_at as string | null) ?? (u.last_sign_in_at as string | null) ?? null,
        mawakibCount: info?.count ?? 0,
      };
    });
  });

/** Main admin only: suspends or reactivates an application account. */
export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("لا يمكنك تعطيل حسابك الخاص");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const stillPending =
      ((target?.user?.user_metadata ?? {}) as { activation_pending?: boolean })
        .activation_pending === true;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("profiles")
      .update({ status: data.active ? (stillPending ? "pending" : "active") : "inactive" })
      .eq("id", data.userId);
    return { ok: true };
  });


/* ------------------------------------------------------------------ */
/* Account recovery (forgot access code)                               */
/* ------------------------------------------------------------------ */

const phoneSchema = z.string().trim().min(7).max(20);

/** Public: donor asks the management to unlock a new access code for an existing account. */
export const requestAccountRecovery = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ phone: phoneSchema, name: z.string().trim().max(100).optional() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = loginEmail(data.phone);
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = (users?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
    if (!user) throw new Error("لا يوجد حساب مرتبط بهذا الرقم. أنشئ حساباً جديداً.");

    const { data: existing } = await supabaseAdmin
      .from("account_recovery_requests")
      .select("id, status")
      .eq("phone", data.phone)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing) {
      return { ok: true, status: existing.status as string };
    }

    const { error } = await supabaseAdmin.from("account_recovery_requests").insert({
      user_id: user.id,
      phone: data.phone,
      requester_name:
        data.name ?? ((user.user_metadata ?? {}) as { full_name?: string }).full_name ?? "",
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true, status: "pending" };
  });

/** Public: tells the donor whether the management approved their recovery request. */
export const checkAccountRecovery = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone: phoneSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("account_recovery_requests")
      .select("status")
      .eq("phone", data.phone)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { status: (row?.status as string | undefined) ?? "none" };
  });

/** Public: after approval, the donor sets a brand new access code for the SAME account. */
export const completeAccountRecovery = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ phone: phoneSchema, accessCode: z.string().min(6).max(72) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("account_recovery_requests")
      .select("id, user_id, status")
      .eq("phone", data.phone)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row?.user_id) throw new Error("لم تتم الموافقة على طلب الاستعادة بعد");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.user_id as string, {
      password: data.accessCode,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("account_recovery_requests")
      .update({ status: "used", decided_at: new Date().toISOString() })
      .eq("id", row.id as string);
    return { ok: true };
  });

/** Admin / mawkib owner: approves or rejects a recovery request. */
export const decideAccountRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ requestId: z.string().uuid(), approve: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin, isOwner } = await callerRoles(context);
    if (!isAdmin && !isOwner) throw new Error("غير مصرح لك بهذه العملية");
    const { error } = await context.supabase
      .from("account_recovery_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin / mawkib owner: pending & approved recovery requests they may act on. */
export const listRecoveryRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdmin, isOwner } = await callerRoles(context);
    if (!isAdmin && !isOwner) throw new Error("غير مصرح لك بهذه العملية");
    const { data, error } = await context.supabase
      .from("account_recovery_requests")
      .select("id, phone, requester_name, status, created_at")
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as {
      id: string;
      phone: string;
      requester_name: string;
      status: string;
      created_at: string;
    }[];
  });

/* ------------------------------------------------------------------ */
/* Pre-registered donor records (added by an owner, no app account yet) */
/* ------------------------------------------------------------------ */

async function findAuthUserByPhone(phone: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = loginEmail(phone);
  const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return (users?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
}

async function accountState(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();
  return (data?.status as string | undefined) ?? "active";
}

/** Public: tells the sign-up form whether this phone is already a donor record / account. */
export const lookupDonorPhone = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone: phoneSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await findAuthUserByPhone(data.phone);
    const { data: donor } = await supabaseAdmin
      .from("donors")
      .select("name, user_id")
      .eq("phone", data.phone)
      .is("deleted_at", null)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const status = user ? await accountState(user.id) : null;
    return {
      hasAccount: Boolean(user),
      needsActivation: status === "pending",
      preRegistered: Boolean(donor) && !user,
      name: (donor?.name as string | undefined) ?? null,
    };
  });

async function hashActivationCode(code: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code.toUpperCase()));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Public: one-time activation for an account pre-created by a mawkib owner.
 * The donor proves ownership with the code the owner handed them, then sets their
 * own private access code. The code is consumed and can never be reused.
 */
export const activateDonorAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        phone: phoneSchema,
        activationCode: z.string().trim().min(4).max(32),
        accessCode: z.string().min(6).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await findAuthUserByPhone(data.phone);
    if (!user) throw new Error("لا يوجد حساب مُنشأ لهذا الرقم. أنشئ حساباً جديداً.");

    const status = await accountState(user.id);
    if (status !== "pending")
      throw new Error("هذا الحساب مُفعّل بالفعل — سجّل الدخول برمزك الخاص.");

    const { data: row } = await supabaseAdmin
      .from("donor_activation_codes")
      .select("id, code_hash, expires_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) throw new Error("لا يوجد رمز تفعيل صالح. اطلب رمزاً جديداً من إدارة الموكب.");
    if (new Date(row.expires_at as string).getTime() < Date.now())
      throw new Error("انتهت صلاحية رمز التفعيل. اطلب رمزاً جديداً من إدارة الموكب.");
    if ((await hashActivationCode(data.activationCode)) !== (row.code_hash as string))
      throw new Error("رمز التفعيل غير صحيح.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.accessCode,
      user_metadata: { ...(user.user_metadata ?? {}), activation_pending: false },
    });

    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("donor_activation_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id as string);
    await supabaseAdmin.from("profiles").update({ status: "active" }).eq("id", user.id);
    await supabaseAdmin
      .from("donors")
      .update({ profile_completed: true })
      .eq("user_id", user.id);

    return { ok: true };
  });

/**
 * Public donor sign-up. Links the new application account to any pre-registered
 * donor record with the same phone instead of creating a duplicate donor.
 */
export const registerDonorAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        phone: phoneSchema,
        accessCode: z.string().min(6).max(72),
        name: z.string().trim().min(3).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // WhatsApp phone verification (skipped only when the service is not configured).
    const verificationRequired = Boolean(process.env["WASENDER_API_KEY"]);
    let verificationId: string | null = null;
    if (verificationRequired) {
      const { data: verification } = await supabaseAdmin
        .from("phone_verifications")
        .select("id, verified_at")
        .eq("phone", digits(data.phone))
        .is("consumed_at", null)
        .not("verified_at", "is", null)
        .gte("verified_at", new Date(Date.now() - 15 * 60_000).toISOString())
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!verification) throw new Error("الرجاء تأكيد رقم هاتفك برمز واتساب أولاً");
      verificationId = verification.id as string;
    }


    const existingUser = await findAuthUserByPhone(data.phone);
    if (existingUser) {
      const status = await accountState(existingUser.id);
      if (status === "pending")
        throw new Error(
          "يوجد حساب مُنشأ لهذا الرقم من قبل إدارة الموكب وغير مُفعّل. اطلب رمز التفعيل من إدارة الموكب لتفعيله.",
        );
      throw new Error("هذا الرقم مرتبط بحساب موجود مسبقاً.");
    }


    // Donor records created earlier by a mawkib owner / admin for this phone.
    const { data: preRegistered } = await supabaseAdmin
      .from("donors")
      .select("id, name")
      .eq("phone", data.phone)
      .is("deleted_at", null)
      .is("user_id", null)
      .order("created_at");

    const linked = preRegistered ?? [];
    const name = data.name?.trim() || (linked[0]?.name as string | undefined);
    if (!name) throw new Error("الرجاء إدخال الاسم الكامل");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail(data.phone),
      password: data.accessCode,
      email_confirm: true,
      user_metadata: { full_name: name, phone: data.phone, account_type: "donor" },
    });
    if (error || !created?.user) {
      if (error && /registered|exists/i.test(error.message))
        throw new Error("هذا الرقم مرتبط بحساب موجود مسبقاً.");
      throw new Error(error?.message ?? "تعذّر إنشاء الحساب");
    }

    if (linked.length > 0) {
      await supabaseAdmin
        .from("donors")
        .update({ user_id: created.user.id, profile_completed: true })
        .in(
          "id",
          linked.map((d) => d.id as string),
        )
        .is("user_id", null);
    }

    if (verificationId) {
      await supabaseAdmin
        .from("phone_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", verificationId);
    }

    return { ok: true, linkedMemberships: linked.length };

  });

/**
 * Main admin only: deletes the application account.
 * Financial history stays: donor membership rows are kept (archived) and only
 * detached from the deleted account, so the phone number becomes reusable and
 * the old data is never merged automatically into a future account.
 */
export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("لا يمكنك حذف حسابك الخاص");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdminTarget } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (isAdminTarget) throw new Error("لا يمكن حذف حساب إدارة التطبيق");

    const nowIso = new Date().toISOString();
    // Keep payments/goal contributions intact; archive the memberships and
    // detach them from the account being deleted.
    await supabaseAdmin
      .from("donors")
      .update({ user_id: null, deleted_at: nowIso })
      .eq("user_id", data.userId)
      .is("deleted_at", null);
    await supabaseAdmin.from("donors").update({ user_id: null }).eq("user_id", data.userId);
    await supabaseAdmin
      .from("account_recovery_requests")
      .delete()
      .eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
