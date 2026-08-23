CREATE OR REPLACE FUNCTION public.is_mawkib_member(_mawkib uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.donors d
    WHERE d.mawkib_id = _mawkib AND d.user_id = auth.uid()
      AND d.deleted_at IS NULL AND d.membership_status = 'active'
  );
$$;

CREATE TABLE public.mawkib_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mawkib_id uuid NOT NULL REFERENCES public.mawakib(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  target_amount bigint NOT NULL DEFAULT 0,
  image_url text,
  deadline date,
  status text NOT NULL DEFAULT 'active',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mawkib_goals TO authenticated;
GRANT ALL ON public.mawkib_goals TO service_role;
ALTER TABLE public.mawkib_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY goals_select ON public.mawkib_goals FOR SELECT TO authenticated
  USING (public.can_manage_mawkib(mawkib_id) OR (published AND public.is_mawkib_member(mawkib_id)));
CREATE POLICY goals_insert ON public.mawkib_goals FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_mawkib(mawkib_id));
CREATE POLICY goals_update ON public.mawkib_goals FOR UPDATE TO authenticated
  USING (public.can_manage_mawkib(mawkib_id)) WITH CHECK (public.can_manage_mawkib(mawkib_id));
CREATE POLICY goals_delete ON public.mawkib_goals FOR DELETE TO authenticated
  USING (public.can_manage_mawkib(mawkib_id));
CREATE TRIGGER mawkib_goals_updated_at BEFORE UPDATE ON public.mawkib_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.mawkib_goals(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  amount bigint NOT NULL DEFAULT 0,
  contributed_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_contributions TO authenticated;
GRANT ALL ON public.goal_contributions TO service_role;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY gc_select ON public.goal_contributions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mawkib_goals g WHERE g.id = goal_contributions.goal_id
      AND (public.can_manage_mawkib(g.mawkib_id)
        OR EXISTS (SELECT 1 FROM public.donors d WHERE d.id = goal_contributions.donor_id AND d.user_id = auth.uid()))
  ));
CREATE POLICY gc_insert ON public.goal_contributions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.mawkib_goals g WHERE g.id = goal_contributions.goal_id AND public.can_manage_mawkib(g.mawkib_id)));
CREATE POLICY gc_update ON public.goal_contributions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mawkib_goals g WHERE g.id = goal_contributions.goal_id AND public.can_manage_mawkib(g.mawkib_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mawkib_goals g WHERE g.id = goal_contributions.goal_id AND public.can_manage_mawkib(g.mawkib_id)));
CREATE POLICY gc_delete ON public.goal_contributions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mawkib_goals g WHERE g.id = goal_contributions.goal_id AND public.can_manage_mawkib(g.mawkib_id)));

CREATE TABLE public.mawkib_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mawkib_id uuid NOT NULL REFERENCES public.mawakib(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  post_date date NOT NULL DEFAULT CURRENT_DATE,
  hijri_date text,
  images text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mawkib_posts TO authenticated;
GRANT ALL ON public.mawkib_posts TO service_role;
ALTER TABLE public.mawkib_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_select ON public.mawkib_posts FOR SELECT TO authenticated
  USING (public.can_manage_mawkib(mawkib_id) OR (published AND public.is_mawkib_member(mawkib_id)));
CREATE POLICY posts_insert ON public.mawkib_posts FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_mawkib(mawkib_id));
CREATE POLICY posts_update ON public.mawkib_posts FOR UPDATE TO authenticated
  USING (public.can_manage_mawkib(mawkib_id)) WITH CHECK (public.can_manage_mawkib(mawkib_id));
CREATE POLICY posts_delete ON public.mawkib_posts FOR DELETE TO authenticated
  USING (public.can_manage_mawkib(mawkib_id));
CREATE TRIGGER mawkib_posts_updated_at BEFORE UPDATE ON public.mawkib_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_goals_mawkib ON public.mawkib_goals(mawkib_id);
CREATE INDEX idx_gc_goal ON public.goal_contributions(goal_id);
CREATE INDEX idx_posts_mawkib ON public.mawkib_posts(mawkib_id);