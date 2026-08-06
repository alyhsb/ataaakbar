import { useSyncExternalStore } from "react";

export type PaymentStatus = "paid" | "unpaid";

export type MonthlyPayment = {
  id: string;
  donorId: string;
  month: number; // 1-12
  year: number;
  amount: number;
  status: PaymentStatus;
  paidAt?: string | undefined; // YYYY-MM-DD
  notes?: string | undefined;
};

export type Donor = {
  id: string;
  name: string;
  phone: string;
  area: string;
  monthlyAmount: number;
  joinedAt: string;
  notes?: string | undefined;
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

export const CURRENT_YEAR = 2026;
export const CURRENT_MONTH = 8;

/** Months tracked by default for every donor (most recent last). */
const PERIODS: { month: number; year: number }[] = [3, 4, 5, 6, 7, 8].map((m) => ({
  month: m,
  year: CURRENT_YEAR,
}));

let donors: Donor[] = [
  {
    id: "d1",
    name: "حيدر عبد الأمير",
    phone: "0770 123 4567",
    area: "الكاظمية",
    monthlyAmount: 50000,
    joinedAt: "2025-11-02",
    notes: "متبرع مؤسس للموكب",
  },
  {
    id: "d2",
    name: "زينب الموسوي",
    phone: "0781 998 2210",
    area: "الجادرية",
    monthlyAmount: 75000,
    joinedAt: "2025-12-14",
  },
  {
    id: "d3",
    name: "علي كاظم الحسيني",
    phone: "0750 445 1120",
    area: "الكرادة",
    monthlyAmount: 25000,
    joinedAt: "2026-01-08",
  },
  {
    id: "d4",
    name: "مصطفى الجبوري",
    phone: "0771 300 7788",
    area: "الأعظمية",
    monthlyAmount: 100000,
    joinedAt: "2025-09-21",
    notes: "يتكفل بمصاريف الطبخ",
  },
  {
    id: "d5",
    name: "فاطمة عبد الرزاق",
    phone: "0783 221 5560",
    area: "زيونة",
    monthlyAmount: 40000,
    joinedAt: "2026-02-11",
  },
  {
    id: "d6",
    name: "أحمد الشمري",
    phone: "0772 010 9033",
    area: "الشعب",
    monthlyAmount: 30000,
    joinedAt: "2026-03-03",
  },
];

function seed(donorId: string, amount: number, flags: boolean[]): MonthlyPayment[] {
  return PERIODS.map((p, i) => {
    const paid = flags[i] ?? false;
    return {
      id: `${donorId}-${p.year}-${p.month}`,
      donorId,
      month: p.month,
      year: p.year,
      amount,
      status: paid ? ("paid" as const) : ("unpaid" as const),
      paidAt: paid ? `${p.year}-${String(p.month).padStart(2, "0")}-05` : undefined,
      notes: undefined,
    };
  });
}

let payments: MonthlyPayment[] = [
  ...seed("d1", 50000, [true, true, true, true, true, false]),
  ...seed("d2", 75000, [true, true, false, true, true, true]),
  ...seed("d3", 25000, [true, true, true, false, false, false]),
  ...seed("d4", 100000, [true, true, true, true, true, true]),
  ...seed("d5", 40000, [false, true, true, true, false, false]),
  ...seed("d6", 30000, [true, true, true, true, false, false]),
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getDonors = () => donors;
const getPayments = () => payments;

export function useDonors() {
  return useSyncExternalStore(subscribe, getDonors, getDonors);
}

export function useDonor(id: string) {
  return useDonors().find((d) => d.id === id);
}

export function usePayments() {
  return useSyncExternalStore(subscribe, getPayments, getPayments);
}

export function useDonorPayments(donorId: string) {
  return usePayments().filter((p) => p.donorId === donorId);
}

export function sortPayments(list: MonthlyPayment[], desc = true) {
  return [...list].sort((a, b) =>
    desc ? b.year - a.year || b.month - a.month : a.year - b.year || a.month - b.month,
  );
}

export function addDonor(input: {
  name: string;
  phone: string;
  area: string;
  monthlyAmount: number;
  notes?: string;
}) {
  const donor: Donor = {
    id: `d${Date.now()}`,
    ...input,
    joinedAt: new Date().toISOString().slice(0, 10),
  };
  donors = [donor, ...donors];
  payments = [...payments, ...seed(donor.id, donor.monthlyAmount, [])];
  emit();
  return donor;
}

export function updateDonor(
  id: string,
  input: { name: string; phone: string; area: string; monthlyAmount: number; notes?: string },
) {
  donors = donors.map((d) => (d.id !== id ? d : { ...d, ...input }));
  payments = payments.map((p) =>
    p.donorId === id && p.status === "unpaid" ? { ...p, amount: input.monthlyAmount } : p,
  );
  emit();
}

export function deleteDonor(id: string) {
  donors = donors.filter((d) => d.id !== id);
  payments = payments.filter((p) => p.donorId !== id);
  emit();
}

export function setPaymentStatus(paymentId: string, status: PaymentStatus) {
  payments = payments.map((p) =>
    p.id !== paymentId
      ? p
      : {
          ...p,
          status,
          paidAt: status === "paid" ? (p.paidAt ?? todayISO()) : undefined,
        },
  );
  emit();
}

export function togglePaymentStatus(paymentId: string) {
  const p = payments.find((x) => x.id === paymentId);
  if (p) setPaymentStatus(paymentId, p.status === "paid" ? "unpaid" : "paid");
}

export function updatePayment(
  paymentId: string,
  input: { amount?: number; paidAt?: string | undefined; notes?: string | undefined },
) {
  payments = payments.map((p) => (p.id !== paymentId ? p : { ...p, ...input }));
  emit();
}

export function addPayment(input: {
  donorId: string;
  month: number;
  year: number;
  amount: number;
  status: PaymentStatus;
  notes?: string | undefined;
}) {
  const payment: MonthlyPayment = {
    id: `${input.donorId}-${input.year}-${input.month}-${Date.now()}`,
    donorId: input.donorId,
    month: input.month,
    year: input.year,
    amount: input.amount,
    status: input.status,
    paidAt: input.status === "paid" ? todayISO() : undefined,
    notes: input.notes,
  };
  payments = [...payments, payment];
  emit();
  return payment;
}

export function deletePayment(paymentId: string) {
  payments = payments.filter((p) => p.id !== paymentId);
  emit();
}

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
  const collected = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const expectedMonthly = donors.reduce((s, d) => s + d.monthlyAmount, 0);
  const paidThisMonth = donors.filter((d) => donorStatus(d) === "paid").length;
  const unpaidCount = payments.filter((p) => p.status === "unpaid").length;
  return { total: donors.length, collected, expectedMonthly, paidThisMonth, unpaidCount };
}
