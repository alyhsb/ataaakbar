import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, CheckCircle2, Archive } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MawkibImage } from "@/components/MawkibImage";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  useMawakib,
  useAllDonors,
  formatIQD,
  errorMessage,
  todayISO,
} from "@/lib/donors-store";
import {
  useMawkibContent,
  uploadMawkibImage,
  saveGoal,
  setGoalPublished,
  setGoalStatus,
  deleteGoal,
  addGoalContribution,
  deleteGoalContribution,
  autoCompleteGoal,
  savePost,
  setPostPublished,
  deletePost,
  goalRaised,
  goalProgress,
  GOAL_STATUS_LABELS,
  type GoalStatus,
  type MawkibGoal,
  type MawkibPost,
} from "@/lib/mawkib-content";

export const Route = createFileRoute("/_authenticated/content")({
  head: () => ({
    meta: [
      { title: "أهداف ومنشورات الموكب — عطاء الأكبر" },
      {
        name: "description",
        content:
          "إدارة الأهداف المستقبلية للموكب ومساهمات المتبرعين فيها، ونشر أخبار وفعاليات الموكب مع الصور.",
      },
      { property: "og:title", content: "أهداف ومنشورات الموكب — عطاء الأكبر" },
      { property: "og:description", content: "إدارة أهداف الموكب ومنشوراته." },
    ],
  }),
  component: ContentPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const btnPrimary =
  "gradient-emerald flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-70";
const btnGhost =
  "flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-ink";

type GoalDraft = {
  id?: string;
  title: string;
  description: string;
  targetAmount: number | "";
  deadline: string;
  status: GoalStatus;
  published: boolean;
  imageUrl?: string | undefined;
};

type PostDraft = {
  id?: string;
  title: string;
  content: string;
  postDate: string;
  hijriDate: string;
  images: string[];
  published: boolean;
};

const emptyGoal: GoalDraft = {
  title: "",
  description: "",
  targetAmount: "",
  deadline: "",
  status: "active",
  published: false,
};

function ContentPage() {
  const { role, userId } = useAuth();
  const mawakib = useMawakib();
  const [ownMawkib, setOwnMawkib] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!userId) return;
    void supabase
      .from("profiles")
      .select("mawkib_id")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setOwnMawkib((data?.mawkib_id as string | null) ?? null));
  }, [userId]);

  useEffect(() => {
    if (selected) return;
    if (role === "admin") setSelected(mawakib[0]?.id ?? "");
    else if (ownMawkib) setSelected(ownMawkib);
  }, [role, mawakib, ownMawkib, selected]);

  const mawkibId = role === "admin" ? selected : (ownMawkib ?? "");
  const content = useMawkibContent(mawkibId || undefined);
  const members = useAllDonors().filter(
    (d) => d.mawkibId === mawkibId && !d.deletedAt && d.membershipStatus === "active",
  );

  const [goalDraft, setGoalDraft] = useState<GoalDraft | null>(null);
  const [postDraft, setPostDraft] = useState<PostDraft | null>(null);
  const [busy, setBusy] = useState(false);

  if (role !== "admin" && role !== "owner") {
    return (
      <AppShell title="أهداف ومنشورات الموكب">
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          هذه الصفحة مخصّصة لأصحاب المواكب وإدارة التطبيق.
        </div>
      </AppShell>
    );
  }

  async function submitGoal() {
    if (!goalDraft || busy || !mawkibId) return;
    if (goalDraft.title.trim().length < 3) {
      toast.error("عنوان الهدف قصير جداً");
      return;
    }
    setBusy(true);
    try {
      await saveGoal({
        id: goalDraft.id,
        mawkibId,
        title: goalDraft.title.trim(),
        description: goalDraft.description,
        targetAmount: Number(goalDraft.targetAmount || 0),
        imageUrl: goalDraft.imageUrl,
        deadline: goalDraft.deadline,
        status: goalDraft.status,
        published: goalDraft.published,
      });
      toast.success("تم حفظ الهدف");
      setGoalDraft(null);
      content.reload();
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر حفظ الهدف"));
    } finally {
      setBusy(false);
    }
  }

  async function submitPost() {
    if (!postDraft || busy || !mawkibId) return;
    if (postDraft.title.trim().length < 3) {
      toast.error("عنوان المنشور قصير جداً");
      return;
    }
    setBusy(true);
    try {
      await savePost({
        id: postDraft.id,
        mawkibId,
        title: postDraft.title.trim(),
        content: postDraft.content,
        postDate: postDraft.postDate,
        hijriDate: postDraft.hijriDate,
        images: postDraft.images,
        published: postDraft.published,
      });
      toast.success("تم حفظ المنشور");
      setPostDraft(null);
      content.reload();
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر حفظ المنشور"));
    } finally {
      setBusy(false);
    }
  }

  async function pickImages(files: FileList | null, multiple: boolean) {
    if (!files || files.length === 0 || !mawkibId) return;
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files)) paths.push(await uploadMawkibImage(mawkibId, f));
      if (multiple) {
        setPostDraft((d) => (d ? { ...d, images: [...d.images, ...paths] } : d));
      } else {
        setGoalDraft((d) => (d ? { ...d, imageUrl: paths[0] } : d));
      }
      toast.success("تم رفع الصور");
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر رفع الصورة"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="أهداف ومنشورات الموكب"
      subtitle="الأهداف المستقبلية ومساهمات الموكب — تظهر للمتبرعين بعد النشر فقط"
      action={
        role === "admin" ? (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm"
          >
            {mawakib.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      {!mawkibId ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          لا يوجد موكب مرتبط بحسابك بعد.
        </div>
      ) : (
        <>
          {/* ---------------- Goals ---------------- */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-ink">أهداف مستقبلية</h2>
              <button
                type="button"
                onClick={() => setGoalDraft({ ...emptyGoal })}
                className="gradient-emerald flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> هدف جديد
              </button>
            </div>

            {goalDraft ? (
              <div className="surface-card mb-5 space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-ink">عنوان الهدف</span>
                    <input
                      value={goalDraft.title}
                      onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">المبلغ المستهدف</span>
                    <input
                      type="number"
                      min={0}
                      value={goalDraft.targetAmount}
                      onChange={(e) =>
                        setGoalDraft({
                          ...goalDraft,
                          targetAmount: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">
                      آخر موعد (اختياري)
                    </span>
                    <input
                      type="date"
                      value={goalDraft.deadline}
                      onChange={(e) => setGoalDraft({ ...goalDraft, deadline: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-ink">الوصف</span>
                    <textarea
                      rows={3}
                      value={goalDraft.description}
                      onChange={(e) => setGoalDraft({ ...goalDraft, description: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">الحالة</span>
                    <select
                      value={goalDraft.status}
                      onChange={(e) =>
                        setGoalDraft({ ...goalDraft, status: e.target.value as GoalStatus })
                      }
                      className={inputCls}
                    >
                      <option value="active">نشط</option>
                      <option value="completed">اكتمل الهدف</option>
                      <option value="archived">مؤرشف</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">صورة الهدف</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void pickImages(e.target.files, false)}
                      className={inputCls}
                    />
                  </label>
                  {goalDraft.imageUrl ? (
                    <MawkibImage
                      path={goalDraft.imageUrl}
                      alt="صورة الهدف"
                      className="h-32 w-full rounded-lg object-cover sm:col-span-2"
                    />
                  ) : null}
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={goalDraft.published}
                      onChange={(e) => setGoalDraft({ ...goalDraft, published: e.target.checked })}
                    />
                    نشر الهدف للمتبرعين
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={submitGoal} disabled={busy} className={btnPrimary}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalDraft(null)}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : null}

            {content.loading ? (
              <div className="surface-card flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
              </div>
            ) : content.goals.length === 0 ? (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                لا توجد أهداف بعد. لن يرى المتبرعون هذا القسم حتى تنشر هدفاً.
              </div>
            ) : (
              <div className="space-y-4">
                {content.goals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    raised={goalRaised(content.contributions, g.id)}
                    contributions={content.contributions.filter((c) => c.goalId === g.id)}
                    members={members.map((m) => ({ id: m.id, name: m.name }))}
                    onEdit={() =>
                      setGoalDraft({
                        id: g.id,
                        title: g.title,
                        description: g.description,
                        targetAmount: g.targetAmount,
                        deadline: g.deadline ?? "",
                        status: g.status,
                        published: g.published,
                        imageUrl: g.imageUrl,
                      })
                    }
                    onChanged={content.reload}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ---------------- Posts ---------------- */}
          <section className="mt-10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-ink">مساهمات الموكب</h2>
              <button
                type="button"
                onClick={() =>
                  setPostDraft({
                    title: "",
                    content: "",
                    postDate: todayISO(),
                    hijriDate: "",
                    images: [],
                    published: false,
                  })
                }
                className="gradient-emerald flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> منشور جديد
              </button>
            </div>

            {postDraft ? (
              <div className="surface-card mb-5 space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-ink">عنوان المنشور</span>
                    <input
                      value={postDraft.title}
                      onChange={(e) => setPostDraft({ ...postDraft, title: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-ink">المحتوى</span>
                    <textarea
                      rows={4}
                      value={postDraft.content}
                      onChange={(e) => setPostDraft({ ...postDraft, content: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">التاريخ</span>
                    <input
                      type="date"
                      value={postDraft.postDate}
                      onChange={(e) => setPostDraft({ ...postDraft, postDate: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">
                      التاريخ الهجري (اختياري)
                    </span>
                    <input
                      placeholder="مثال: 1444 هـ"
                      value={postDraft.hijriDate}
                      onChange={(e) => setPostDraft({ ...postDraft, hijriDate: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-ink">الصور</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => void pickImages(e.target.files, true)}
                      className={inputCls}
                    />
                  </label>
                  {postDraft.images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                      {postDraft.images.map((img) => (
                        <div key={img} className="relative">
                          <MawkibImage
                            path={img}
                            alt="صورة"
                            className="h-24 w-full rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPostDraft({
                                ...postDraft,
                                images: postDraft.images.filter((x) => x !== img),
                              })
                            }
                            className="absolute left-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={postDraft.published}
                      onChange={(e) => setPostDraft({ ...postDraft, published: e.target.checked })}
                    />
                    نشر المنشور للمتبرعين
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={submitPost} disabled={busy} className={btnPrimary}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostDraft(null)}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : null}

            {content.posts.length === 0 ? (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                لا توجد منشورات بعد.
              </div>
            ) : (
              <div className="space-y-4">
                {content.posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onEdit={() =>
                      setPostDraft({
                        id: p.id,
                        title: p.title,
                        content: p.content,
                        postDate: p.postDate,
                        hijriDate: p.hijriDate ?? "",
                        images: p.images,
                        published: p.published,
                      })
                    }
                    onChanged={content.reload}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function GoalCard({
  goal,
  raised,
  contributions,
  members,
  onEdit,
  onChanged,
}: {
  goal: MawkibGoal;
  raised: number;
  contributions: { id: string; donorId: string; amount: number; contributedOn: string; notes?: string | undefined }[];
  members: { id: string; name: string }[];
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [donorId, setDonorId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const pct = goalProgress(raised, goal.targetAmount);

  async function record() {
    if (busy || !donorId || amount === "") return;
    setBusy(true);
    try {
      await addGoalContribution({
        goalId: goal.id,
        donorId,
        amount: Number(amount),
        contributedOn: date,
        notes: notes || undefined,
      });
      const done = await autoCompleteGoal(goal, raised + Number(amount));
      toast.success(done ? "تم تسجيل المساهمة، واكتمل الهدف" : "تم تسجيل المساهمة");
      setAmount("");
      setNotes("");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر تسجيل المساهمة"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-bold text-ink">{goal.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {GOAL_STATUS_LABELS[goal.status]} • {goal.published ? "منشور" : "غير منشور"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className={btnGhost}>
            <Pencil className="h-3.5 w-3.5" /> تعديل
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={async () => {
              try {
                await setGoalPublished(goal.id, !goal.published);
                onChanged();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          >
            {goal.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {goal.published ? "إخفاء" : "نشر"}
          </button>
          {goal.status !== "completed" ? (
            <button
              type="button"
              className={btnGhost}
              onClick={async () => {
                try {
                  await setGoalStatus(goal.id, "completed");
                  onChanged();
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> اكتمل
            </button>
          ) : null}
          {goal.status !== "archived" ? (
            <button
              type="button"
              className={btnGhost}
              onClick={async () => {
                try {
                  await setGoalStatus(goal.id, "archived");
                  onChanged();
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            >
              <Archive className="h-3.5 w-3.5" /> أرشفة
            </button>
          ) : null}
          <ConfirmDialog
            title="حذف الهدف"
            description={`سيتم حذف «${goal.title}» وكل مساهماته.`}
            confirmLabel="حذف"
            onConfirm={async () => {
              try {
                await deleteGoal(goal.id);
                toast.success("تم حذف الهدف");
                onChanged();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
            trigger={(openDialog) => (
              <button type="button" onClick={openDialog} className={btnGhost}>
                <Trash2 className="h-3.5 w-3.5" /> حذف
              </button>
            )}
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg bg-secondary px-3 py-2">
          <dt className="text-muted-foreground">الهدف</dt>
          <dd className="font-semibold text-ink">{formatIQD(goal.targetAmount)}</dd>
        </div>
        <div className="rounded-lg bg-secondary px-3 py-2">
          <dt className="text-muted-foreground">تم جمع</dt>
          <dd className="font-semibold text-primary">{formatIQD(raised)}</dd>
        </div>
        <div className="rounded-lg bg-secondary px-3 py-2">
          <dt className="text-muted-foreground">المتبقي</dt>
          <dd className="font-semibold text-ink">
            {formatIQD(Math.max(goal.targetAmount - raised, 0))}
          </dd>
        </div>
        <div className="rounded-lg bg-secondary px-3 py-2">
          <dt className="text-muted-foreground">النسبة</dt>
          <dd className="font-semibold text-ink">{pct}%</dd>
        </div>
      </dl>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="gradient-emerald h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 text-xs font-semibold text-primary"
      >
        {open ? "إخفاء المساهمات" : `المساهمات (${contributions.length})`}
      </button>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <select
              value={donorId}
              onChange={(e) => setDonorId(e.target.value)}
              className={inputCls}
            >
              <option value="">اختر المتبرع</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              placeholder="المبلغ"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              className={inputCls}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
            <input
              placeholder="ملاحظات"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
            />
          </div>
          <ConfirmDialog
            title="تسجيل مساهمة للهدف"
            description="سيتم تسجيل هذه المساهمة منفصلة عن التبرع الشهري."
            confirmLabel="تسجيل"
            onConfirm={record}
            trigger={(openDialog) => (
              <button
                type="button"
                onClick={openDialog}
                disabled={busy || !donorId || amount === ""}
                className={btnPrimary}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} تسجيل المساهمة
              </button>
            )}
          />

          {contributions.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد مساهمات بعد.</p>
          ) : (
            <ul className="divide-y divide-border">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-ink">
                    {members.find((m) => m.id === c.donorId)?.name ?? "متبرع"}
                    <span className="mr-2 text-xs text-muted-foreground">{c.contributedOn}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold text-primary">{formatIQD(c.amount)}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteGoalContribution(c.id);
                          onChanged();
                        } catch (err) {
                          toast.error(errorMessage(err));
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PostCard({
  post,
  onEdit,
  onChanged,
}: {
  post: MawkibPost;
  onEdit: () => void;
  onChanged: () => void;
}) {
  return (
    <article className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-bold text-ink">{post.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {post.hijriDate ? `${post.hijriDate} • ` : ""}
            {post.postDate} • {post.published ? "منشور" : "مسودة"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className={btnGhost}>
            <Pencil className="h-3.5 w-3.5" /> تعديل
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={async () => {
              try {
                await setPostPublished(post.id, !post.published);
                onChanged();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          >
            {post.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {post.published ? "إخفاء" : "نشر"}
          </button>
          <ConfirmDialog
            title="حذف المنشور"
            description={`سيتم حذف «${post.title}» نهائياً.`}
            confirmLabel="حذف"
            onConfirm={async () => {
              try {
                await deletePost(post.id);
                toast.success("تم حذف المنشور");
                onChanged();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
            trigger={(openDialog) => (
              <button type="button" onClick={openDialog} className={btnGhost}>
                <Trash2 className="h-3.5 w-3.5" /> حذف
              </button>
            )}
          />
        </div>
      </div>
      {post.content ? (
        <p className="mt-3 whitespace-pre-line text-sm text-ink/90">{post.content}</p>
      ) : null}
      {post.images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {post.images.map((img) => (
            <MawkibImage
              key={img}
              path={img}
              alt={post.title}
              className="h-28 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
