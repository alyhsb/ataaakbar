import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/donors-store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type GoalStatus = "active" | "completed" | "archived";

export type MawkibGoal = {
  id: string;
  mawkibId: string;
  title: string;
  description: string;
  targetAmount: number;
  imageUrl?: string | undefined;
  deadline?: string | undefined;
  status: GoalStatus;
  published: boolean;
  createdAt: string;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  donorId: string;
  amount: number;
  contributedOn: string;
  notes?: string | undefined;
};

export type MawkibPost = {
  id: string;
  mawkibId: string;
  title: string;
  content: string;
  postDate: string;
  hijriDate?: string | undefined;
  images: string[];
  published: boolean;
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "نشط",
  completed: "اكتمل الهدف",
  archived: "مؤرشف",
};

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const mapGoal = (r: Row): MawkibGoal => ({
  id: r["id"] as string,
  mawkibId: r["mawkib_id"] as string,
  title: r["title"] as string,
  description: (r["description"] as string) ?? "",
  targetAmount: Number(r["target_amount"] ?? 0),
  imageUrl: (r["image_url"] as string | null) ?? undefined,
  deadline: (r["deadline"] as string | null) ?? undefined,
  status: ((r["status"] as string) ?? "active") as GoalStatus,
  published: Boolean(r["published"]),
  createdAt: r["created_at"] as string,
});

const mapContribution = (r: Row): GoalContribution => ({
  id: r["id"] as string,
  goalId: r["goal_id"] as string,
  donorId: r["donor_id"] as string,
  amount: Number(r["amount"] ?? 0),
  contributedOn: r["contributed_on"] as string,
  notes: (r["notes"] as string | null) ?? undefined,
});

const mapPost = (r: Row): MawkibPost => ({
  id: r["id"] as string,
  mawkibId: r["mawkib_id"] as string,
  title: r["title"] as string,
  content: (r["content"] as string) ?? "",
  postDate: r["post_date"] as string,
  hijriDate: (r["hijri_date"] as string | null) ?? undefined,
  images: ((r["images"] as string[] | null) ?? []) as string[],
  published: Boolean(r["published"]),
});

/* ------------------------------------------------------------------ */
/* Loading hook (RLS decides what is visible)                          */
/* ------------------------------------------------------------------ */

export type MawkibContent = {
  goals: MawkibGoal[];
  contributions: GoalContribution[];
  posts: MawkibPost[];
  loading: boolean;
  reload: () => void;
};

export function useMawkibContent(mawkibId: string | undefined): MawkibContent {
  const [goals, setGoals] = useState<MawkibGoal[]>([]);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [posts, setPosts] = useState<MawkibPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!mawkibId) {
      setGoals([]);
      setContributions([]);
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      const [g, p] = await Promise.all([
        supabase
          .from("mawkib_goals")
          .select("*")
          .eq("mawkib_id", mawkibId)
          .order("created_at", { ascending: false }),
        supabase
          .from("mawkib_posts")
          .select("*")
          .eq("mawkib_id", mawkibId)
          .order("post_date", { ascending: false }),
      ]);
      const goalRows = (g.data ?? []).map((r) => mapGoal(r as Row));
      let contribRows: GoalContribution[] = [];
      if (goalRows.length > 0) {
        const c = await supabase
          .from("goal_contributions")
          .select("*")
          .in(
            "goal_id",
            goalRows.map((x) => x.id),
          )
          .order("contributed_on", { ascending: false });
        contribRows = (c.data ?? []).map((r) => mapContribution(r as Row));
      }
      if (cancelled) return;
      setGoals(goalRows);
      setContributions(contribRows);
      setPosts((p.data ?? []).map((r) => mapPost(r as Row)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mawkibId, tick]);

  return { goals, contributions, posts, loading, reload };
}

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

export function goalRaised(contributions: GoalContribution[], goalId: string) {
  return contributions.filter((c) => c.goalId === goalId).reduce((s, c) => s + c.amount, 0);
}

export function goalProgress(raised: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((raised / target) * 100));
}

/* ------------------------------------------------------------------ */
/* Images (private bucket + signed URLs)                               */
/* ------------------------------------------------------------------ */

const BUCKET = "mawkib-media";
const urlCache = new Map<string, string>();

export async function uploadMawkibImage(mawkibId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${mawkibId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw new Error(errorMessage(error, "تعذّر رفع الصورة"));
  return path;
}

export async function signedUrl(path: string) {
  const cached = urlCache.get(path);
  if (cached) return cached;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  const url = data?.signedUrl ?? "";
  if (url) urlCache.set(path, url);
  return url;
}

export function useSignedUrl(path: string | undefined) {
  const [url, setUrl] = useState<string>(() => (path ? (urlCache.get(path) ?? "") : ""));
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl("");
      return;
    }
    void signedUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

/* ------------------------------------------------------------------ */
/* Mutations — owner / admin only (enforced by RLS)                    */
/* ------------------------------------------------------------------ */

export async function saveGoal(input: {
  id?: string | undefined;
  mawkibId: string;
  title: string;
  description: string;
  targetAmount: number;
  imageUrl?: string | undefined;
  deadline?: string | undefined;
  status: GoalStatus;
  published: boolean;
}) {
  const row = {
    mawkib_id: input.mawkibId,
    title: input.title,
    description: input.description,
    target_amount: input.targetAmount,
    image_url: input.imageUrl ?? null,
    deadline: input.deadline && input.deadline !== "" ? input.deadline : null,
    status: input.status,
    published: input.published,
  };
  const { error } = input.id
    ? await supabase.from("mawkib_goals").update(row).eq("id", input.id)
    : await supabase.from("mawkib_goals").insert(row);
  if (error) throw new Error(errorMessage(error, "تعذّر حفظ الهدف"));
}

export async function setGoalPublished(id: string, published: boolean) {
  const { error } = await supabase.from("mawkib_goals").update({ published }).eq("id", id);
  if (error) throw new Error(errorMessage(error));
}

export async function setGoalStatus(id: string, status: GoalStatus) {
  const { error } = await supabase.from("mawkib_goals").update({ status }).eq("id", id);
  if (error) throw new Error(errorMessage(error));
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("mawkib_goals").delete().eq("id", id);
  if (error) throw new Error(errorMessage(error));
}

/** Records an optional goal contribution — kept apart from monthly payments. */
export async function addGoalContribution(input: {
  goalId: string;
  donorId: string;
  amount: number;
  contributedOn: string;
  notes?: string | undefined;
}) {
  const { error } = await supabase.from("goal_contributions").insert({
    goal_id: input.goalId,
    donor_id: input.donorId,
    amount: input.amount,
    contributed_on: input.contributedOn,
    notes: input.notes ?? null,
  });
  if (error) throw new Error(errorMessage(error, "تعذّر تسجيل المساهمة"));
}

export async function deleteGoalContribution(id: string) {
  const { error } = await supabase.from("goal_contributions").delete().eq("id", id);
  if (error) throw new Error(errorMessage(error));
}

/** Marks a goal completed once its target has been reached. */
export async function autoCompleteGoal(goal: MawkibGoal, raised: number) {
  if (goal.status === "active" && goal.targetAmount > 0 && raised >= goal.targetAmount) {
    await setGoalStatus(goal.id, "completed");
    return true;
  }
  return false;
}

export async function savePost(input: {
  id?: string | undefined;
  mawkibId: string;
  title: string;
  content: string;
  postDate: string;
  hijriDate?: string | undefined;
  images: string[];
  published: boolean;
}) {
  const row = {
    mawkib_id: input.mawkibId,
    title: input.title,
    content: input.content,
    post_date: input.postDate,
    hijri_date: input.hijriDate && input.hijriDate !== "" ? input.hijriDate : null,
    images: input.images,
    published: input.published,
  };
  const { error } = input.id
    ? await supabase.from("mawkib_posts").update(row).eq("id", input.id)
    : await supabase.from("mawkib_posts").insert(row);
  if (error) throw new Error(errorMessage(error, "تعذّر حفظ المنشور"));
}

export async function setPostPublished(id: string, published: boolean) {
  const { error } = await supabase.from("mawkib_posts").update({ published }).eq("id", id);
  if (error) throw new Error(errorMessage(error));
}

export async function deletePost(id: string) {
  const { error } = await supabase.from("mawkib_posts").delete().eq("id", id);
  if (error) throw new Error(errorMessage(error));
}
