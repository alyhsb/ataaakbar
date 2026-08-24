import { Target, CalendarDays, CheckCircle2 } from "lucide-react";
import { MawkibImage } from "@/components/MawkibImage";
import { formatMoney } from "@/lib/donors-store";
import {
  goalRaised,
  goalProgress,
  type GoalContribution,
  type MawkibGoal,
  type MawkibPost,
} from "@/lib/mawkib-content";

/** Single goal card (donor side, read-only). */
function GoalCard({
  goal: g,
  contributions,
  donorId,
}: {
  goal: MawkibGoal;
  contributions: GoalContribution[];
  donorId: string;
}) {
  const raised = goalRaised(contributions, g.id, g.currency);
  const pct = goalProgress(raised, g.targetAmount);
  const mine = contributions
    .filter((c) => c.goalId === g.id && c.donorId === donorId && c.currency === g.currency)
    .reduce((s, c) => s + c.amount, 0);

  return (
    <article className="surface-card overflow-hidden">
      {g.imageUrl ? (
        <MawkibImage path={g.imageUrl} alt={g.title} className="h-44 w-full object-cover" />
      ) : null}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold text-ink">{g.title}</h3>
          {g.status === "completed" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> اكتمل الهدف
            </span>
          ) : null}
        </div>
        {g.description ? (
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{g.description}</p>
        ) : null}

        <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-secondary px-3 py-2">
            <dt className="text-muted-foreground">الهدف</dt>
            <dd className="font-semibold text-ink">{formatMoney(g.targetAmount, g.currency)}</dd>
          </div>
          <div className="rounded-lg bg-secondary px-3 py-2">
            <dt className="text-muted-foreground">تم جمع</dt>
            <dd className="font-semibold text-primary">{formatMoney(raised, g.currency)}</dd>
          </div>
          <div className="rounded-lg bg-secondary px-3 py-2">
            <dt className="text-muted-foreground">المتبقي</dt>
            <dd className="font-semibold text-ink">
              {formatMoney(Math.max(g.targetAmount - raised, 0), g.currency)}
            </dd>
          </div>
        </dl>

        <div className="mt-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="gradient-emerald h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
            {pct}% من إجمالي المبلغ المجموع للهدف
          </p>
        </div>

        {g.deadline ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> آخر موعد: {g.deadline}
          </p>
        ) : null}

        <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">
          مساهمتي في هذا الهدف: {formatMoney(mine, g.currency)}
        </p>
        {g.status === "active" ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            يمكنك المساهمة بأي مبلغ إضافي لهذا الهدف عبر صاحب الموكب، وهي منفصلة عن تبرعك الشهري.
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** Published, non-archived goals of a mawkib, newest first. */
export function visibleGoals(goals: MawkibGoal[]) {
  return goals
    .filter((g) => g.published && g.status !== "archived")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Goals list section (donor side). */
export function MawkibGoalsSection({
  goals,
  contributions,
  donorId,
  heading = "أهداف مستقبلية",
}: {
  goals: MawkibGoal[];
  contributions: GoalContribution[];
  donorId: string;
  heading?: string;
}) {
  if (goals.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
        <Target className="h-5 w-5 text-gold" />
        {heading}
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} contributions={contributions} donorId={donorId} />
        ))}
      </div>
    </section>
  );
}

/** Published posts feed (donor side). */
export function MawkibPostsSection({ posts }: { posts: MawkibPost[] }) {
  const visiblePosts = posts.filter((p) => p.published);
  if (visiblePosts.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">مساهمات الموكب</h2>
      <div className="space-y-4">
        {visiblePosts.map((p) => (
          <article key={p.id} className="surface-card overflow-hidden p-5">
            <h3 className="font-display text-base font-bold text-ink">{p.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.hijriDate ? `${p.hijriDate} • ` : ""}
              {p.postDate}
            </p>
            {p.content ? (
              <p className="mt-3 whitespace-pre-line text-sm text-ink/90">{p.content}</p>
            ) : null}
            {p.images.length > 0 ? (
              <div className={`mt-4 grid gap-2 ${p.images.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {p.images.map((img) => (
                  <MawkibImage
                    key={img}
                    path={img}
                    alt={p.title}
                    className="h-52 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

/** Read-only view of a mawkib's published goals and posts (donor side). */
export function MawkibPublicContent({
  goals,
  contributions,
  posts,
  donorId,
}: {
  goals: MawkibGoal[];
  contributions: GoalContribution[];
  posts: MawkibPost[];
  donorId: string;
}) {
  return (
    <>
      <MawkibGoalsSection
        goals={visibleGoals(goals)}
        contributions={contributions}
        donorId={donorId}
      />
      <MawkibPostsSection posts={posts} />
    </>
  );
}
