import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, ShieldCheck, Heart, Ban, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth";
import {
  listAppUsers,
  setAccountStatus,
  deleteAppUser,
  type AppUser,
} from "@/lib/users.functions";
import { errorMessage } from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "المستخدمون — عطاء الأكبر" },
      {
        name: "description",
        content:
          "قائمة كل حسابات التطبيق: المتبرعون وأصحاب المواكب، مع حالة الحساب وعدد المواكب المرتبطة.",
      },
      { property: "og:title", content: "المستخدمون — عطاء الأكبر" },
      { property: "og:description", content: "إدارة كل حسابات التطبيق من مكان واحد." },
    ],
  }),
  component: UsersPage,
});

type Filter = "all" | "donor" | "owner" | "active" | "inactive";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "donor", label: "المتبرعون" },
  { key: "owner", label: "أصحاب المواكب" },
  { key: "active", label: "نشِط" },
  { key: "inactive", label: "معطّل" },
];

function fmtDate(v: string | null) {
  return v ? new Date(v).toLocaleDateString("ar-IQ") : "—";
}

function UsersPage() {
  const { role } = useAuth();
  const fetchUsers = useServerFn(listAppUsers);
  const changeStatus = useServerFn(setAccountStatus);
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  async function reload() {
    try {
      setError(null);
      setUsers(await fetchUsers({}));
    } catch (err) {
      setError(errorMessage(err, "تعذّر تحميل قائمة المستخدمين"));
    }
  }

  useEffect(() => {
    if (role === "admin") void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const list = useMemo(() => {
    const q = query.trim();
    return (users ?? []).filter((u) => {
      if (filter === "donor" && u.role !== "donor") return false;
      if (filter === "owner" && u.role !== "owner") return false;
      if (filter === "active" && u.status !== "active") return false;
      if (filter === "inactive" && u.status !== "inactive") return false;
      if (!q) return true;
      return u.name.includes(q) || u.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
    });
  }, [users, query, filter]);

  if (role !== "admin") {
    return (
      <AppShell title="المستخدمون">
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          هذه الصفحة مخصّصة لإدارة التطبيق فقط.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="المستخدمون"
      subtitle="كل حسابات التطبيق — مستقلة عن عضويات المواكب"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف"
            className="w-full rounded-lg border border-input bg-card py-2.5 pr-9 pl-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="surface-card p-6 text-center text-sm text-destructive">{error}</div>
      ) : users === null ? (
        <div className="surface-card flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
        </div>
      ) : list.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          لا توجد حسابات مطابقة.
        </div>
      ) : (
        <ul className="surface-card divide-y divide-border">
          {list.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {u.role === "donor" ? (
                    <Heart className="h-4 w-4 text-primary" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-gold" />
                  )}
                  {u.name}
                  {u.status === "inactive" ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                      معطّل
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {u.phone}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {u.role === "donor"
                    ? `${u.mawakibCount} موكب مرتبط`
                    : u.role === "owner"
                      ? "صاحب موكب"
                      : "إدارة التطبيق"}{" "}
                  • أُنشئ {fmtDate(u.createdAt)} • آخر دخول {fmtDate(u.lastLoginAt)}
                </p>
              </div>
              {u.role === "admin" ? null : (
                <ConfirmDialog
                  title={u.status === "active" ? "تعطيل الحساب" : "إعادة تفعيل الحساب"}
                  description={
                    u.status === "active"
                      ? `سيتم منع ${u.name} من تسجيل الدخول، مع بقاء بياناته وعضوياته كما هي.`
                      : `سيتمكّن ${u.name} من تسجيل الدخول مجدداً.`
                  }
                  confirmLabel="تأكيد"
                  onConfirm={async () => {
                    try {
                      await changeStatus({
                        data: { userId: u.id, active: u.status !== "active" },
                      });
                      toast.success("تم تحديث حالة الحساب");
                      await reload();
                    } catch (err) {
                      toast.error(errorMessage(err, "تعذّر تحديث الحساب"));
                    }
                  }}
                  trigger={(open) => (
                    <button
                      onClick={open}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-ink"
                    >
                      {u.status === "active" ? (
                        <>
                          <Ban className="h-3.5 w-3.5" /> تعطيل
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" /> تفعيل
                        </>
                      )}
                    </button>
                  )}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
