import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentStatus = "paid" | "unpaid";
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
  status: PaymentStatus;
  paidAt?: string | undefined;
  notes?: string | undefined;
};

export type Donor = {
  id: string;
  userId?: string | undefined;
  name: string;
  phone: string;
  area: string;
  monthlyAmount: number;
  joinedAt: string;
  notes?: string | undefined;
  username?: string | undefined;
  deletedAt?: string | undefined;
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

type DonorRow = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  area: string;
  monthly_amount: number;
  notes: string | null;
  joined_at: string;
  username: string | null;
  deleted_at: string | null;
};
type PaymentRowDb = {
  id: string;
  donor_id: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
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
  name: r.name,
  phone: r.phone,
  area: r.area,
  monthlyAmount: r.monthly_amount,
  notes: r.notes ?? undefined,
  joinedAt: r.joined_at,
  username: r.username ?? undefined,
  deletedAt: r.deleted_at ?? undefined,
});

const mapPayment = (r: PaymentRowDb): MonthlyPayment => ({
  id: r.id,
  donorId: r.donor_id,
  month: r.month,
  year: r.year,
  amount: r.amount,
  status: r.status === "paid" ? "paid" : "unpaid",
  paidAt: r.paid_at ?? undefined,
  notes: r.notes ?? undefined,
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
  const [d, p, n] = await Promise.all([
    supabase.from("donors").select("*").order("created_at", { ascending: false }),
    supabase.from("payments").select("*"),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }),
  ]);
  donors = (d.data ?? []).map((r) => mapDonor(r as DonorRow));
  payments = (p.data ?? []).map((r) => mapPayment(r as PaymentRowDb));
  notifications = (n.data ?? []).map((r) => mapNotification(r as NotificationRow));
  loaded = true;
  emit();
}

export function resetStore() {
  donors = [];
  payments = [];
  notifications = [];
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
  return useAllDonors().filter((d) => !d.deletedAt);
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

export async function addDonor(input: {
  name: string;
  phone: string;
  area: string;
  monthlyAmount: number;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("donors")
    .insert({
      name: input.name,
      phone: input.phone,
      area: input.area,
      monthly_amount: input.monthlyAmount,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const donor = mapDonor(data as DonorRow);
  donors = [donor, ...donors];
  emit();
  return donor;
}

export async function updateDonor(
  id: string,
  input: { name: string; phone: string; area: string; monthlyAmount: number; notes?: string },
) {
  const { error } = await supabase
    .from("donors")
    .update({
      name: input.name,
      phone: input.phone,
      area: input.area,
      monthly_amount: input.monthlyAmount,
      notes: input.notes ?? null,
    })
    .eq("id", id);
  if (error) throw error;

  await supabase
    .from("payments")
    .update({ amount: input.monthlyAmount })
    .eq("donor_id", id)
    .eq("status", "unpaid");

  donors = donors.map((d) => (d.id !== id ? d : { ...d, ...input, notes: input.notes }));
  payments = payments.map((p) =>
    p.donorId === id && p.status === "unpaid" ? { ...p, amount: input.monthlyAmount } : p,
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
      title: `تم استلام تبرعك بمبلغ ${formatIQD(target.amount)}`,
      body: `تم استلام تبرعك بمبلغ ${formatIQD(target.amount)} عن ${periodLabel(target.month, target.year)}. شكراً لدعمك.`,
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
      title: `تم استلام تبرعك بمبلغ ${formatIQD(payment.amount)}`,
      body: `تم استلام تبرعك بمبلغ ${formatIQD(payment.amount)} عن ${periodLabel(payment.month, payment.year)}. شكراً لدعمك.`,
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
        body: `اشتراكك لهذا الشهر ${formatIQD(d.monthlyAmount)} وهو غير مسدد حالياً.`,
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
  const active = donors.filter((d) => !d.deletedAt);
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

export function formatIQD(n: number) {
  return `${n.toLocaleString("ar-IQ")} د.ع`;
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
  const active = donors.filter((d) => !d.deletedAt);
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
  const active = donors.filter((d) => !d.deletedAt);
  const paid = active.filter((d) => donorStatus(d) === "paid").length;
  return [
    { name: "مدفوع", value: paid },
    { name: "غير مدفوع", value: active.length - paid },
  ];
}

/** Top donors by total paid amount. */
export function topDonors(limit = 5) {
  return donors
    .filter((d) => !d.deletedAt)
    .map((d) => ({
      name: d.name,
      total: payments
        .filter((p) => p.donorId === d.id && p.status === "paid")
        .reduce((s, p) => s + p.amount, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
