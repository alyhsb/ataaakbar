import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsappNotifications } from "@/lib/whatsapp-notify.functions";


export type PaymentStatus = "paid" | "unpaid";
export type Currency = "IQD" | "USD";

export const CURRENCY_LABELS: Record<Currency, string> = {
  IQD: "دينار عراقي",
  USD: "دولار أمريكي",
};

export const CURRENCIES: Currency[] = ["IQD", "USD"];

export function asCurrency(v: unknown): Currency {
  return v === "USD" ? "USD" : "IQD";
}
export type NotificationKind = "new_month" | "payment_confirmed" | "reminder";

export type AppNotification = {
  id: string;
  donorId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type MonthlyPayment = {
  id: string;
  donorId: string;
  month: number;
  year: number;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  paidAt?: string | undefined;
  notes?: string | undefined;
  txnCode?: string | undefined;
};

export type MembershipStatus = "pending" | "active" | "rejected";

export type Mawkib = {
  id: string;
  name: string;
  area: string;
  phone: string;
  description: string;
  disabledAt?: string | undefined;
};


export type AmountChangeRequest = {
  id: string;
  donorId: string;
  currentAmount: number;
  requestedAmount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt?: string | undefined;
};

export type AmountHistoryEntry = {
  id: string;
  donorId: string;
  oldAmount: number;
  newAmount: number;
  createdAt: string;
};

export type Donor = {
  id: string;
  userId?: string | undefined;
  mawkibId?: string | undefined;
  membershipStatus: MembershipStatus;
  code?: string | undefined;
  name: string;
  phone: string;
  area: string;
  location: string;
  monthlyAmount: number;
  currency: Currency;
  dueDay: number;
  joinedAt: string;
  notes?: string | undefined;
  username?: string | undefined;
  deletedAt?: string | undefined;
  profileCompleted: boolean;
  lastLoginAt?: string | undefined;
  lastProfileUpdateAt?: string | undefined;
};

export const MONTH_NAMES: string[] = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "مدفوع",
  unpaid: "غير مدفوع",
};

const now = new Date();
export const CURRENT_YEAR = now.getFullYear();
export const CURRENT_MONTH = now.getMonth() + 1;

/* ------------------------------------------------------------------ */
/* Local cache mirrored from the database                              */
/* ------------------------------------------------------------------ */

let donors: Donor[] = [];
let payments: MonthlyPayment[] = [];
let notifications: AppNotification[] = [];
let mawakib: Mawkib[] = [];
let amountRequests: AmountChangeRequest[] = [];
let amountHistory: AmountHistoryEntry[] = [];
let loaded = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getDonors = () => donors;
const getPayments = () => payments;
const getNotifications = () => notifications;
const getLoaded = () => loaded;
const getMawakib = () => mawakib;
const getAmountRequests = () => amountRequests;
const getAmountHistory = () => amountHistory;

type DonorRow = {
  id: string;
  user_id: string | null;
  mawkib_id?: string | null;
  membership_status?: string | null;
  donor_code?: string | null;
  name: string;
  phone: string;
  area: string;
  location?: string | null;
  monthly_amount: number;
  currency?: string | null;
  due_day?: number | null;
  notes: string | null;
  joined_at: string;
  username: string | null;
  deleted_at: string | null;
  profile_completed?: boolean | null;
  last_login_at?: string | null;
  last_profile_update_at?: string | null;
};
type PaymentRowDb = {
  id: string;
  donor_id: string;
  month: number;
  year: number;
  amount: number;
  currency?: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
  txn_code?: string | null;
};
type NotificationRow = {
  id: string;
  donor_id: string;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

const mapDonor = (r: DonorRow): Donor => ({
  id: r.id,
  userId: r.user_id ?? undefined,
  mawkibId: r.mawkib_id ?? undefined,
  membershipStatus:
    r.membership_status === "pending"
      ? "pending"
      : r.membership_status === "rejected"
        ? "rejected"
        : "active",
  code: r.donor_code ?? undefined,
  name: r.name,
  phone: r.phone,
  area: r.area,
  location: r.location ?? "",
  monthlyAmount: r.monthly_amount,
  currency: asCurrency(r.currency),
  dueDay: r.due_day ?? 5,
  notes: r.notes ?? undefined,
  joinedAt: r.joined_at,
  username: r.username ?? undefined,
  deletedAt: r.deleted_at ?? undefined,
  profileCompleted: r.profile_completed ?? true,
  lastLoginAt: r.last_login_at ?? undefined,
  lastProfileUpdateAt: r.last_profile_update_at ?? undefined,
});

const mapPayment = (r: PaymentRowDb): MonthlyPayment => ({
  id: r.id,
  donorId: r.donor_id,
  month: r.month,
  year: r.year,
  amount: r.amount,
  currency: asCurrency(r.currency),
  status: r.status === "paid" ? "paid" : "unpaid",
  paidAt: r.paid_at ?? undefined,
  notes: r.notes ?? undefined,
  txnCode: r.txn_code ?? undefined,
});

const mapNotification = (r: NotificationRow): AppNotification => ({
  id: r.id,
  donorId: r.donor_id,
  kind:
    r.kind === "new_month" ? "new_month" : r.kind === "reminder" ? "reminder" : "payment_confirmed",
  title: r.title,
  body: r.body,
  read: r.read,
  createdAt: r.created_at,
});

/** Loads everything the signed-in user is allowed to see (RLS scoped). */
export async function loadAll() {
  const [d, p, n, m, ar, ah] = await Promise.all([
    supabase.from("donors").select("*").order("created_at", { ascending: false }),
    supabase.from("payments").select("*"),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    supabase.from("mawakib").select("*").order("name"),
    supabase.from("amount_change_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("amount_history").select("*").order("created_at", { ascending: false }),
  ]);
  donors = (d.data ?? []).map((r) => mapDonor(r as DonorRow));
  payments = (p.data ?? []).map((r) => mapPayment(r as PaymentRowDb));
  notifications = (n.data ?? []).map((r) => mapNotification(r as NotificationRow));
  mawakib = (m.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    area: (r.area as string) ?? "",
    phone: (r.phone as string) ?? "",
    description: ((r as { description?: string }).description ?? "") as string,
    disabledAt: ((r as { disabled_at?: string | null }).disabled_at ?? undefined) as
      | string
      | undefined,
  }));

  amountRequests = (ar.data ?? []).map((r) => ({
    id: r.id as string,
    donorId: r.donor_id as string,
    currentAmount: r.current_amount as number,
    requestedAmount: r.requested_amount as number,
    status: r.status as AmountChangeRequest["status"],
    createdAt: r.created_at as string,
    decidedAt: (r.decided_at as string | null) ?? undefined,
  }));
  amountHistory = (ah.data ?? []).map((r) => ({
    id: r.id as string,
    donorId: r.donor_id as string,
    oldAmount: r.old_amount as number,
    newAmount: r.new_amount as number,
    createdAt: r.created_at as string,
  }));
  loaded = true;
  emit();
}

export function resetStore() {
  donors = [];
  payments = [];
  notifications = [];
  mawakib = [];
  amountRequests = [];
  amountHistory = [];
  loaded = false;
  emit();
}

export function useStoreLoaded() {
  return useSyncExternalStore(subscribe, getLoaded, getLoaded);
}

export function useAllDonors() {
  return useSyncExternalStore(subscribe, getDonors, getDonors);
}

export function useDonors() {
  return useAllDonors().filter((d) => !d.deletedAt && d.membershipStatus === "active");
}

export function useMawakib() {
  return useSyncExternalStore(subscribe, getMawakib, getMawakib);
}

export function useAmountRequests() {
  return useSyncExternalStore(subscribe, getAmountRequests, getAmountRequests);
}

export function useAmountHistory(donorId?: string) {
  const all = useSyncExternalStore(subscribe, getAmountHistory, getAmountHistory);
  return donorId ? all.filter((h) => h.donorId === donorId) : all;
}

/** Pending join requests visible to the signed-in manager. */
export function usePendingMemberships() {
  return useAllDonors().filter((d) => !d.deletedAt && d.membershipStatus === "pending");
}

/** Every mawkib membership (active + pending) of one donor account. */
export function useMyMemberships(userId: string | undefined) {
  return useAllDonors().filter((d) => !d.deletedAt && d.userId === userId);
}

export function useDeletedDonors() {
  return useAllDonors().filter((d) => d.deletedAt);
}

export function useDonor(id: string | undefined) {
  return useAllDonors().find((d) => d.id === id);
}

export function useDonorByUser(userId: string | undefined) {
  return useDonors().find((d) => d.userId === userId);
}

export function mawkibName(id: string | undefined) {
  return mawakib.find((m) => m.id === id)?.name ?? "موكب";
}

export function usePayments() {
  return useSyncExternalStore(subscribe, getPayments, getPayments);
}

export function useDonorPayments(donorId: string) {
  return usePayments().filter((p) => p.donorId === donorId);
}

export function useNotifications(donorId?: string) {
  const all = useSyncExternalStore(subscribe, getNotifications, getNotifications);
  return donorId ? all.filter((n) => n.donorId === donorId) : all;
}

export function sortPayments(list: MonthlyPayment[], desc = true) {
  return [...list].sort((a, b) =>
    desc ? b.year - a.year || b.month - a.month : a.year - b.year || a.month - b.month,
  );
}

/* ------------------------------------------------------------------ */
/* Mutations (real CRUD)                                               */
/* ------------------------------------------------------------------ */

/** Compares two phone numbers ignoring formatting characters. */
export function samePhone(a: string, b: string) {
  const norm = (v: string) => v.replace(/\D/g, "");
  return norm(a) !== "" && norm(a) === norm(b);
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Turns any thrown value into a clear Arabic message. */
export function errorMessage(err: unknown, fallback = "تعذّر إتمام العملية") {
  if (isOffline()) return "لا يوجد اتصال بالإنترنت، ولم يتم تنفيذ العملية. تحقّق من الاتصال ثم أعد المحاولة.";
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (/duplicate key|unique constraint|donors_unique_active_phone/i.test(raw))
    return "رقم الهاتف مسجّل لمتبرع آخر بالفعل";
  if (/fetch|network|Failed to fetch|NetworkError/i.test(raw))
    return "تعذّر الاتصال بالخادم، ولم يتم تنفيذ العملية. تحقّق من الاتصال ثم أعد المحاولة.";
  return raw || fallback;
}

function asAppError(err: { message?: string } | null, _kind: "duplicate") {
  return new Error(errorMessage(new Error(err?.message ?? "")));
}

export async function addDonor(input: {
  name: string;
  phone: string;
  area: string;
  location?: string;
  monthlyAmount: number;
  currency?: Currency;
  dueDay?: number;
  notes?: string;
}) {
  if (donors.some((d) => !d.deletedAt && samePhone(d.phone, input.phone))) {
    throw new Error("رقم الهاتف مسجّل لمتبرع آخر بالفعل");
  }
  const { data, error } = await supabase
    .from("donors")
    .insert({
      name: input.name,
      phone: input.phone,
      area: input.area,
      location: input.location ?? "",
      monthly_amount: input.monthlyAmount,
      currency: input.currency ?? "IQD",
      due_day: input.dueDay ?? 5,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw asAppError(error, "duplicate");
  const donor = mapDonor(data as DonorRow);
  donors = [donor, ...donors];
  emit();
  return donor;
}

export async function updateDonor(
  id: string,
  input: {
    name: string;
    phone: string;
    area: string;
    location?: string;
    monthlyAmount: number;
    currency?: Currency;
    dueDay?: number;
    notes?: string;
  },
) {
  if (donors.some((d) => d.id !== id && !d.deletedAt && samePhone(d.phone, input.phone))) {
    throw new Error("رقم الهاتف مسجّل لمتبرع آخر بالفعل");
  }
  const { error } = await supabase
    .from("donors")
    .update({
      name: input.name,
      phone: input.phone,
      area: input.area,
      location: input.location ?? "",
      monthly_amount: input.monthlyAmount,
      ...(input.currency ? { currency: input.currency } : {}),
      due_day: input.dueDay ?? 5,
      notes: input.notes ?? null,
    })
    .eq("id", id);
  if (error) throw asAppError(error, "duplicate");

  await supabase
    .from("payments")
    .update({ amount: input.monthlyAmount, ...(input.currency ? { currency: input.currency } : {}) })
    .eq("donor_id", id)
    .eq("status", "unpaid");

  donors = donors.map((d) =>
    d.id !== id
      ? d
      : {
          ...d,
          ...input,
          location: input.location ?? "",
          dueDay: input.dueDay ?? d.dueDay,
          notes: input.notes,
          lastProfileUpdateAt: new Date().toISOString(),
        },
  );
  payments = payments.map((p) =>
    p.donorId === id && p.status === "unpaid"
      ? { ...p, amount: input.monthlyAmount, currency: input.currency ?? p.currency }
      : p,
  );
  emit();
}

/** Donor-editable fields (name and amount stay admin-only, enforced in the database). */
export async function updateOwnDonorInfo(
  id: string,
  input: {
    name?: string;
    phone?: string;
    area?: string;
    location?: string;
    profileCompleted?: boolean;
  },
) {
  const patch: {
    name?: string;
    phone?: string;
    area?: string;
    location?: string;
    profile_completed?: boolean;
  } = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.area !== undefined) patch.area = input.area;
  if (input.location !== undefined) patch.location = input.location;
  if (input.profileCompleted !== undefined) patch.profile_completed = input.profileCompleted;

  const { error } = await supabase.from("donors").update(patch).eq("id", id);
  if (error) throw error;
  donors = donors.map((d) =>
    d.id !== id
      ? d
      : {
          ...d,
          name: input.name ?? d.name,
          phone: input.phone ?? d.phone,
          area: input.area ?? d.area,
          location: input.location ?? d.location,
          profileCompleted: input.profileCompleted ?? d.profileCompleted,
        },
  );
  emit();
}

/** Soft delete: moves the donor to the recycle bin. */
export async function deleteDonor(id: string) {
  const deletedAt = new Date().toISOString();
  const { error } = await supabase.from("donors").update({ deleted_at: deletedAt }).eq("id", id);
  if (error) throw error;
  donors = donors.map((d) => (d.id !== id ? d : { ...d, deletedAt }));
  emit();
}

export async function restoreDonor(id: string) {
  const { error } = await supabase.from("donors").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
  donors = donors.map((d) => (d.id !== id ? d : { ...d, deletedAt: undefined }));
  emit();
}

/** Permanently removes the donor and every related record. */
export async function purgeDonor(id: string) {
  const { error } = await supabase.from("donors").delete().eq("id", id);
  if (error) throw error;
  donors = donors.filter((d) => d.id !== id);
  payments = payments.filter((p) => p.donorId !== id);
  notifications = notifications.filter((n) => n.donorId !== id);
  emit();
}

export async function setPaymentStatus(paymentId: string, status: PaymentStatus) {
  const target = payments.find((p) => p.id === paymentId);
  if (!target) return;
  const paidAt = status === "paid" ? (target.paidAt ?? todayISO()) : null;

  const { error } = await supabase
    .from("payments")
    .update({ status, paid_at: paidAt })
    .eq("id", paymentId);
  if (error) throw error;

  payments = payments.map((p) =>
    p.id !== paymentId ? p : { ...p, status, paidAt: paidAt ?? undefined },
  );

  if (status === "paid" && target.status !== "paid") {
    await pushNotification({
      donorId: target.donorId,
      kind: "payment_confirmed",
      title: `تم استلام تبرعك بمبلغ ${formatMoney(target.amount, target.currency)}`,
      body: `تم استلام تبرعك بمبلغ ${formatMoney(target.amount, target.currency)} عن ${periodLabel(target.month, target.year)}. شكراً لدعمك.`,
    });
  }
  emit();
}

export async function togglePaymentStatus(paymentId: string) {
  const p = payments.find((x) => x.id === paymentId);
  if (p) await setPaymentStatus(paymentId, p.status === "paid" ? "unpaid" : "paid");
}

export async function updatePayment(
  paymentId: string,
  input: { amount?: number; paidAt?: string | undefined; notes?: string | undefined },
) {
  const patch: { amount?: number; paid_at?: string | null; notes?: string | null } = {};
  if (input.amount !== undefined) patch.amount = input.amount;
  if ("paidAt" in input) patch.paid_at = input.paidAt ?? null;
  if ("notes" in input) patch.notes = input.notes ?? null;

  const { error } = await supabase.from("payments").update(patch).eq("id", paymentId);
  if (error) throw error;
  payments = payments.map((p) => (p.id !== paymentId ? p : { ...p, ...input }));
  emit();
}

export async function addPayment(input: {
  donorId: string;
  month: number;
  year: number;
  amount: number;
  currency?: Currency;
  status: PaymentStatus;
  notes?: string | undefined;
}) {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      donor_id: input.donorId,
      month: input.month,
      year: input.year,
      amount: input.amount,
      currency: input.currency ?? "IQD",
      status: input.status,
      paid_at: input.status === "paid" ? todayISO() : null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const payment = mapPayment(data as PaymentRowDb);
  payments = [...payments, payment];
  if (payment.status === "paid") {
    await pushNotification({
      donorId: payment.donorId,
      kind: "payment_confirmed",
      title: `تم استلام تبرعك بمبلغ ${formatMoney(payment.amount, payment.currency)}`,
      body: `تم استلام تبرعك بمبلغ ${formatMoney(payment.amount, payment.currency)} عن ${periodLabel(payment.month, payment.year)}. شكراً لدعمك.`,
    });
  }
  emit();
  return payment;
}

export async function deletePayment(paymentId: string) {
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) throw error;
  payments = payments.filter((p) => p.id !== paymentId);
  emit();
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

async function pushNotification(input: {
  donorId: string;
  kind: NotificationKind;
  title: string;
  body: string;
}) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      donor_id: input.donorId,
      kind: input.kind,
      title: input.title,
      body: input.body,
    })
    .select()
    .single();
  if (error) return;
  notifications = [mapNotification(data as NotificationRow), ...notifications];
  emit();
}

export async function markNotificationRead(id: string) {
  notifications = notifications.map((n) => (n.id !== id ? n : { ...n, read: true }));
  emit();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(donorId: string) {
  notifications = notifications.map((n) => (n.donorId !== donorId ? n : { ...n, read: true }));
  emit();
  await supabase.from("notifications").update({ read: true }).eq("donor_id", donorId).eq("read", false);
}

/** Opens the next month for every donor and notifies them in-app. */
export async function startNewMonth() {
  const latest = payments.reduce(
    (acc, p) => (p.year > acc.year || (p.year === acc.year && p.month > acc.month) ? p : acc),
    { month: CURRENT_MONTH - 1 || 12, year: CURRENT_MONTH - 1 ? CURRENT_YEAR : CURRENT_YEAR - 1 } as {
      month: number;
      year: number;
    },
  );
  const month = latest.month === 12 ? 1 : latest.month + 1;
  const year = latest.month === 12 ? latest.year + 1 : latest.year;

  const missing = donors.filter(
    (d) =>
      !d.deletedAt &&
      d.membershipStatus === "active" &&
      !payments.some((p) => p.donorId === d.id && p.month === month && p.year === year),
  );
  if (missing.length === 0) return { month, year, count: 0 };

  const { data, error } = await supabase
    .from("payments")
    .insert(
      missing.map((d) => ({
        donor_id: d.id,
        month,
        year,
        amount: d.monthlyAmount,
        currency: d.currency,
        status: "unpaid",
      })),
    )
    .select();
  if (error) throw error;

  payments = [...payments, ...(data ?? []).map((r) => mapPayment(r as PaymentRowDb))];

  const { data: notifRows } = await supabase
    .from("notifications")
    .insert(
      missing.map((d) => ({
        donor_id: d.id,
        kind: "new_month",
        title: `بدأ شهر ${monthLabel(month)} ${year}`,
        body: `اشتراكك لهذا الشهر ${formatMoney(d.monthlyAmount, d.currency)} وهو غير مسدد حالياً.`,
      })),
    )
    .select();
  notifications = [
    ...(notifRows ?? []).map((r) => mapNotification(r as NotificationRow)),
    ...notifications,
  ];
  emit();
  return { month, year, count: missing.length };
}

/** Sends the monthly due reminder to every active donor. */
export async function sendReminderToAll() {
  const active = donors.filter((d) => !d.deletedAt && d.membershipStatus === "active");
  if (active.length === 0) return 0;
  const { data, error } = await supabase
    .from("notifications")
    .insert(
      active.map((d) => ({
        donor_id: d.id,
        kind: "reminder",
        title: "تذكير بالتبرع الشهري",
        body: "حان موعد تبرعك الشهري.",
      })),
    )
    .select();
  if (error) throw error;
  notifications = [
    ...(data ?? []).map((r) => mapNotification(r as NotificationRow)),
    ...notifications,
  ];
  emit();
  return active.length;
}

/* ------------------------------------------------------------------ */
/* Helpers and derived data                                            */
/* ------------------------------------------------------------------ */

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatMoney(n: number, currency: Currency = "IQD") {
  return currency === "USD"
    ? `${n.toLocaleString("ar-IQ")} $`
    : `${n.toLocaleString("ar-IQ")} د.ع`;
}

export function formatIQD(n: number) {
  return formatMoney(n, "IQD");
}

export function monthLabel(month: number) {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export function periodLabel(month: number, year: number) {
  return `${monthLabel(month)} ${year}`;
}

export function donorPayments(donorId: string) {
  return payments.filter((p) => p.donorId === donorId);
}

/** Current-month status for a donor. */
export function donorStatus(d: Donor): PaymentStatus {
  const current = payments.find(
    (p) => p.donorId === d.id && p.month === CURRENT_MONTH && p.year === CURRENT_YEAR,
  );
  return current?.status ?? "unpaid";
}

export function stats() {
  const active = donors.filter((d) => !d.deletedAt && d.membershipStatus === "active");
  const expectedTotal = payments.reduce((s, p) => s + p.amount, 0);
  const collected = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const expectedMonthly = active.reduce((s, d) => s + d.monthlyAmount, 0);
  const paidThisMonth = active.filter((d) => donorStatus(d) === "paid").length;
  const unpaidCount = payments.filter((p) => p.status === "unpaid").length;
  const unpaidDonors = active.filter((d) =>
    payments.some((p) => p.donorId === d.id && p.status === "unpaid"),
  ).length;
  return {
    total: active.length,
    collected,
    expectedTotal,
    remaining: Math.max(expectedTotal - collected, 0),
    expectedMonthly,
    paidThisMonth,
    unpaidCount,
    unpaidDonors,
  };
}

/** Collected vs expected per tracked period, oldest first. */
export function monthlySeries() {
  const map = new Map<
    string,
    { label: string; month: number; year: number; expected: number; collected: number }
  >();
  for (const p of payments) {
    const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
    const entry =
      map.get(key) ?? { label: monthLabel(p.month), month: p.month, year: p.year, expected: 0, collected: 0 };
    entry.expected += p.amount;
    if (p.status === "paid") entry.collected += p.amount;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

/** Donor payment status split for the current month. */
export function statusSplit() {
  const active = donors.filter((d) => !d.deletedAt && d.membershipStatus === "active");
  const paid = active.filter((d) => donorStatus(d) === "paid").length;
  return [
    { name: "مدفوع", value: paid },
    { name: "غير مدفوع", value: active.length - paid },
  ];
}

/** Top donors by total paid amount. */
export function topDonors(limit = 5) {
  return donors
    .filter((d) => !d.deletedAt && d.membershipStatus === "active")
    .map((d) => ({
      name: d.name,
      total: payments
        .filter((p) => p.donorId === d.id && p.status === "paid")
        .reduce((s, p) => s + p.amount, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Due dates, overdue and activity                                     */
/* ------------------------------------------------------------------ */

export function currentPayment(donorId: string) {
  return payments.find(
    (p) => p.donorId === donorId && p.month === CURRENT_MONTH && p.year === CURRENT_YEAR,
  );
}

/** Date of the donor's most recent paid donation, if any. */
export function lastDonationDate(donorId: string): string | undefined {
  const paid = payments
    .filter((p) => p.donorId === donorId && p.status === "paid")
    .map((p) => p.paidAt ?? `${p.year}-${String(p.month).padStart(2, "0")}-01`)
    .sort();
  return paid.length ? paid[paid.length - 1] : undefined;
}

function dueDateFor(dueDay: number, month: number, year: number) {
  const day = Math.min(Math.max(dueDay || 5, 1), 28);
  return new Date(year, month - 1, day);
}

export function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The donor's next unpaid due date (ISO date string). */
export function nextDueDate(d: Donor): string {
  const thisMonth = dueDateFor(d.dueDay, CURRENT_MONTH, CURRENT_YEAR);
  const paidThisMonth = currentPayment(d.id)?.status === "paid";
  if (!paidThisMonth) return formatDate(thisMonth);
  const nextMonth = CURRENT_MONTH === 12 ? 1 : CURRENT_MONTH + 1;
  const nextYear = CURRENT_MONTH === 12 ? CURRENT_YEAR + 1 : CURRENT_YEAR;
  return formatDate(dueDateFor(d.dueDay, nextMonth, nextYear));
}

/** Days past the due date for an unpaid current month, 0 when not overdue. */
export function overdueDays(d: Donor): number {
  if (currentPayment(d.id)?.status === "paid") return 0;
  const due = dueDateFor(d.dueDay, CURRENT_MONTH, CURRENT_YEAR);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

export function isOverdue(d: Donor) {
  return overdueDays(d) > 0;
}

/** Records the donor's sign-in time (best effort). */
export async function recordDonorLogin(userId: string) {
  const at = new Date().toISOString();
  await supabase.from("profiles").update({ last_login_at: at }).eq("id", userId);
  const donor = donors.find((d) => d.userId === userId);
  if (!donor) return;
  const { error } = await supabase.from("donors").update({ last_login_at: at }).eq("id", donor.id);
  if (error) return;
  donors = donors.map((d) => (d.id === donor.id ? { ...d, lastLoginAt: at } : d));
  emit();
}


/** Headline numbers for the current month only. */
export function monthStats() {
  const active = donors.filter((d) => !d.deletedAt && d.membershipStatus === "active");
  const monthPayments = payments.filter(
    (p) => p.month === CURRENT_MONTH && p.year === CURRENT_YEAR,
  );
  const collected = monthPayments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const expected = active.reduce((s, d) => s + d.monthlyAmount, 0);
  const paid = active.filter((d) => donorStatus(d) === "paid").length;
  return {
    activeDonors: active.length,
    paid,
    unpaid: active.length - paid,
    overdue: active.filter((d) => isOverdue(d)).length,
    collected,
    remaining: Math.max(expected - collected, 0),
  };
}


/* ------------------------------------------------------------------ */
/* Multi-mawkib memberships                                            */
/* ------------------------------------------------------------------ */

/** Donor sends a join request ("طلب انضمام") to a mawkib. */
export async function requestJoinMawkib(input: {
  userId: string;
  name: string;
  phone: string;
  mawkibId: string;
  monthlyAmount: number;
  currency?: Currency;
  dueDay?: number;
  area?: string;
  location?: string;
}) {
  if (donors.some((d) => !d.deletedAt && d.userId === input.userId && d.mawkibId === input.mawkibId)) {
    throw new Error("لديك طلب أو اشتراك في هذا الموكب بالفعل");
  }
  const { data, error } = await supabase
    .from("donors")
    .insert({
      user_id: input.userId,
      mawkib_id: input.mawkibId,
      membership_status: "pending",
      name: input.name,
      phone: input.phone,
      area: input.area ?? "",
      location: input.location ?? "",
      monthly_amount: input.monthlyAmount,
      currency: input.currency ?? "IQD",
      due_day: input.dueDay ?? 5,
    })
    .select()
    .single();
  if (error) throw new Error(errorMessage(error));
  donors = [mapDonor(data as DonorRow), ...donors];
  emit();
}

/** Mawkib owner / admin approves or rejects a join request. */
export async function decideMembership(donorId: string, approve: boolean) {
  const status = approve ? "active" : "rejected";
  const { error } = await supabase
    .from("donors")
    .update({ membership_status: status })
    .eq("id", donorId);
  if (error) throw new Error(errorMessage(error));
  donors = donors.map((d) => (d.id === donorId ? { ...d, membershipStatus: status } : d));
  emit();
  const donor = donors.find((d) => d.id === donorId);
  if (donor) {
    await pushNotification({
      donorId,
      kind: "reminder",
      title: approve ? "تمت الموافقة على طلب الانضمام" : "تم رفض طلب الانضمام",
      body: approve
        ? `تمت الموافقة على انضمامك إلى ${mawkibName(donor.mawkibId)} بمبلغ ${formatMoney(donor.monthlyAmount, donor.currency)} شهرياً.`
        : `نعتذر، تم رفض طلب انضمامك إلى ${mawkibName(donor.mawkibId)}.`,
    });
  }
}

/** Donor asks to change the monthly amount of one membership. */
export async function requestAmountChange(donorId: string, requestedAmount: number) {
  const donor = donors.find((d) => d.id === donorId);
  if (!donor) throw new Error("الاشتراك غير موجود");
  if (amountRequests.some((r) => r.donorId === donorId && r.status === "pending")) {
    throw new Error("لديك طلب تغيير مبلغ قيد الانتظار لهذا الموكب");
  }
  const { data, error } = await supabase
    .from("amount_change_requests")
    .insert({
      donor_id: donorId,
      current_amount: donor.monthlyAmount,
      requested_amount: requestedAmount,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw new Error(errorMessage(error));
  amountRequests = [
    {
      id: data.id as string,
      donorId,
      currentAmount: donor.monthlyAmount,
      requestedAmount,
      status: "pending",
      createdAt: data.created_at as string,
    },
    ...amountRequests,
  ];
  emit();
}

/** Mawkib owner / admin approves or rejects an amount change request. */
export async function decideAmountRequest(requestId: string, approve: boolean, userId?: string) {
  const req = amountRequests.find((r) => r.id === requestId);
  if (!req) return;
  const decidedAt = new Date().toISOString();
  const { error } = await supabase
    .from("amount_change_requests")
    .update({
      status: approve ? "approved" : "rejected",
      decided_at: decidedAt,
      decided_by: userId ?? null,
    })
    .eq("id", requestId);
  if (error) throw new Error(errorMessage(error));

  if (approve) {
    const { error: upErr } = await supabase
      .from("donors")
      .update({ monthly_amount: req.requestedAmount })
      .eq("id", req.donorId);
    if (upErr) throw new Error(errorMessage(upErr));
    await supabase.from("payments").update({ amount: req.requestedAmount })
      .eq("donor_id", req.donorId)
      .eq("status", "unpaid");
    await supabase.from("amount_history").insert({
      donor_id: req.donorId,
      old_amount: req.currentAmount,
      new_amount: req.requestedAmount,
      changed_by: userId ?? null,
    });
    donors = donors.map((d) =>
      d.id === req.donorId ? { ...d, monthlyAmount: req.requestedAmount } : d,
    );
    payments = payments.map((p) =>
      p.donorId === req.donorId && p.status === "unpaid"
        ? { ...p, amount: req.requestedAmount }
        : p,
    );
    amountHistory = [
      {
        id: `${requestId}-h`,
        donorId: req.donorId,
        oldAmount: req.currentAmount,
        newAmount: req.requestedAmount,
        createdAt: decidedAt,
      },
      ...amountHistory,
    ];
  }

  amountRequests = amountRequests.map((r) =>
    r.id === requestId ? { ...r, status: approve ? "approved" : "rejected", decidedAt } : r,
  );
  emit();

  await pushNotification({
    donorId: req.donorId,
    kind: "reminder",
    title: approve ? "تمت الموافقة على تغيير مبلغ التبرع" : "تم رفض طلب تغيير مبلغ التبرع",
    body: approve
      ? `أصبح مبلغ تبرعك الشهري ${formatIQD(req.requestedAmount)} بدلاً من ${formatIQD(req.currentAmount)}.`
      : `تم رفض طلبك بتغيير المبلغ إلى ${formatIQD(req.requestedAmount)}، ويبقى المبلغ ${formatIQD(req.currentAmount)}.`,
  });
}

/* ------------------------------------------------------------------ */
/* Mawakib management (main admin)                                     */
/* ------------------------------------------------------------------ */

/** Mawakib open for new join requests. */
export function useActiveMawakib() {
  return useMawakib().filter((m) => !m.disabledAt);
}

export async function createMawkib(input: {
  name: string;
  area?: string;
  phone?: string;
  description?: string;
}) {
  const { data, error } = await supabase
    .from("mawakib")
    .insert({
      name: input.name,
      area: input.area ?? "",
      phone: input.phone ?? "",
      description: input.description ?? "",
    })
    .select()
    .single();
  if (error) throw new Error(errorMessage(error));
  mawakib = [
    ...mawakib,
    {
      id: data.id as string,
      name: data.name as string,
      area: (data.area as string) ?? "",
      phone: (data.phone as string) ?? "",
      description: ((data as { description?: string }).description ?? "") as string,
    },
  ].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  emit();
}

export async function updateMawkib(
  id: string,
  input: { name?: string; area?: string; phone?: string; description?: string },
) {
  const { error } = await supabase.from("mawakib").update(input).eq("id", id);
  if (error) throw new Error(errorMessage(error));
  mawakib = mawakib.map((m) => (m.id === id ? { ...m, ...input } : m));
  emit();
}

/** Disables a mawkib (hidden from new join requests) or restores it. */
export async function setMawkibDisabled(id: string, disabled: boolean) {
  const disabledAt = disabled ? new Date().toISOString() : null;
  const { error } = await supabase.from("mawakib").update({ disabled_at: disabledAt }).eq("id", id);
  if (error) throw new Error(errorMessage(error));
  mawakib = mawakib.map((m) => (m.id === id ? { ...m, disabledAt: disabledAt ?? undefined } : m));
  emit();
}

/** Stats of one mawkib (main admin overview). */
export function mawkibStats(mawkibId: string) {
  const members = donors.filter(
    (d) => d.mawkibId === mawkibId && !d.deletedAt && d.membershipStatus === "active",
  );
  const ids = new Set(members.map((d) => d.id));
  const related = payments.filter((p) => ids.has(p.donorId));
  const collected = related.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  return {
    donors: members.length,
    pending: donors.filter(
      (d) => d.mawkibId === mawkibId && !d.deletedAt && d.membershipStatus === "pending",
    ).length,
    expectedMonthly: members.reduce((s, d) => s + d.monthlyAmount, 0),
    collected,
  };
}

/** Memberships of one donor account, including removed ones (history). */
export function useMembershipHistory(userId: string | undefined) {
  return useAllDonors().filter((d) => d.userId === userId);
}
