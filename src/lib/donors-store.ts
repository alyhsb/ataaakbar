import { useSyncExternalStore } from "react";

export type PaymentStatus = "paid" | "pending" | "late";

export type MonthlyPayment = {
  month: string; // e.g. "2026-07"
  amount: number;
  status: PaymentStatus;
  date?: string | undefined;
};

export type Donor = {
  id: string;
  name: string;
  phone: string;
  area: string;
  monthlyAmount: number;
  joinedAt: string;
  notes?: string | undefined;
  payments: MonthlyPayment[];
};

const MONTHS = ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];

export const MONTH_LABELS: Record<string, string> = {
  "2026-01": "كانون الثاني",
  "2026-02": "شباط",
  "2026-03": "آذار",
  "2026-04": "نيسان",
  "2026-05": "أيار",
  "2026-06": "حزيران",
  "2026-07": "تموز",
  "2026-08": "آب",
  "2026-09": "أيلول",
  "2026-10": "تشرين الأول",
  "2026-11": "تشرين الثاني",
  "2026-12": "كانون الأول",
};

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "مدفوع",
  pending: "قيد الانتظار",
  late: "متأخر",
};

function history(amount: number, statuses: PaymentStatus[]): MonthlyPayment[] {
  return MONTHS.map((month, i) => ({
    month,
    amount,
    status: statuses[i] ?? "pending",
    date: statuses[i] === "paid" ? `${month}-05` : undefined,
  }));
}

let donors: Donor[] = [
  {
    id: "d1",
    name: "حيدر عبد الأمير",
    phone: "0770 123 4567",
    area: "الكاظمية",
    monthlyAmount: 50000,
    joinedAt: "2025-11-02",
    notes: "متبرع مؤسس للموكب",
    payments: history(50000, ["paid", "paid", "paid", "paid", "paid", "pending"]),
  },
  {
    id: "d2",
    name: "زينب الموسوي",
    phone: "0781 998 2210",
    area: "الجادرية",
    monthlyAmount: 75000,
    joinedAt: "2025-12-14",
    payments: history(75000, ["paid", "paid", "late", "paid", "paid", "paid"]),
  },
  {
    id: "d3",
    name: "علي كاظم الحسيني",
    phone: "0750 445 1120",
    area: "الكرادة",
    monthlyAmount: 25000,
    joinedAt: "2026-01-08",
    payments: history(25000, ["paid", "paid", "paid", "late", "late", "late"]),
  },
  {
    id: "d4",
    name: "مصطفى الجبوري",
    phone: "0771 300 7788",
    area: "الأعظمية",
    monthlyAmount: 100000,
    joinedAt: "2025-09-21",
    notes: "يتكفل بمصاريف الطبخ",
    payments: history(100000, ["paid", "paid", "paid", "paid", "paid", "paid"]),
  },
  {
    id: "d5",
    name: "فاطمة عبد الرزاق",
    phone: "0783 221 5560",
    area: "زيونة",
    monthlyAmount: 40000,
    joinedAt: "2026-02-11",
    payments: history(40000, ["pending", "paid", "paid", "paid", "pending", "pending"]),
  },
  {
    id: "d6",
    name: "أحمد الشمري",
    phone: "0772 010 9033",
    area: "الشعب",
    monthlyAmount: 30000,
    joinedAt: "2026-03-03",
    payments: history(30000, ["paid", "paid", "paid", "paid", "late", "pending"]),
  },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => donors;

export function useDonors() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useDonor(id: string) {
  return useDonors().find((d) => d.id === id);
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
    payments: MONTHS.map((month) => ({
      month,
      amount: input.monthlyAmount,
      status: "pending" as PaymentStatus,
    })),
  };
  donors = [donor, ...donors];
  emit();
  return donor;
}

export function setPaymentStatus(donorId: string, month: string, status: PaymentStatus) {
  donors = donors.map((d) =>
    d.id !== donorId
      ? d
      : {
          ...d,
          payments: d.payments.map((p) =>
            p.month === month
              ? ({
                  ...p,
                  status,
                  date: status === "paid" ? `${month}-05` : undefined,
                } satisfies MonthlyPayment)
              : p,
          ),
        },
  );
  emit();
}

export function updateDonor(
  id: string,
  input: { name: string; phone: string; area: string; monthlyAmount: number; notes?: string },
) {
  donors = donors.map((d) =>
    d.id !== id
      ? d
      : {
          ...d,
          ...input,
          payments: d.payments.map((p) =>
            p.status === "paid" ? p : { ...p, amount: input.monthlyAmount },
          ),
        },
  );
  emit();
}

export function deleteDonor(id: string) {
  donors = donors.filter((d) => d.id !== id);
  emit();
}


export const CURRENT_MONTH: string = MONTHS[MONTHS.length - 1] ?? "2026-08";
export const ALL_MONTHS = MONTHS;

export function formatIQD(n: number) {
  return `${n.toLocaleString("ar-IQ")} د.ع`;
}

export function monthLabel(month: string) {
  return MONTH_LABELS[month] ?? month;
}

export function donorStatus(d: Donor): PaymentStatus {
  const current = d.payments.find((p) => p.month === CURRENT_MONTH);
  if (d.payments.some((p) => p.status === "late")) return "late";
  return current?.status ?? "pending";
}

export function stats() {
  const list = donors;
  const collected = list.reduce(
    (sum, d) => sum + d.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    0,
  );
  const expectedMonthly = list.reduce((s, d) => s + d.monthlyAmount, 0);
  const paidThisMonth = list.filter(
    (d) => d.payments.find((p) => p.month === CURRENT_MONTH)?.status === "paid",
  ).length;
  const lateCount = list.filter((d) => donorStatus(d) === "late").length;
  return { total: list.length, collected, expectedMonthly, paidThisMonth, lateCount };
}