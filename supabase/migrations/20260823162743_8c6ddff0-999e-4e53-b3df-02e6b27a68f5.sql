-- 1. Mawakib get a public description for donor browsing
ALTER TABLE public.mawakib ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

-- 2. donors row becomes a donor<->mawkib membership
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'active';

DROP INDEX IF EXISTS public.donors_unique_active_phone;
CREATE UNIQUE INDEX IF NOT EXISTS donors_unique_phone_per_mawkib
  ON public.donors (mawkib_id, regexp_replace(phone, '\D', '', 'g'))
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS donors_unique_user_per_mawkib
  ON public.donors (user_id, mawkib_id)
  WHERE deleted_at IS NULL AND user_id IS NOT NULL;

-- donors can create their own pending membership request
DROP POLICY IF EXISTS donors_self_join_insert ON public.donors;
CREATE POLICY donors_self_join_insert ON public.donors
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND mawkib_id IS NOT NULL
    AND membership_status = 'pending'
  );

-- keep membership_status out of donor self-edits
CREATE OR REPLACE FUNCTION public.protect_donor_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.can_manage_mawkib(OLD.mawkib_id) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.mawkib_id IS DISTINCT FROM OLD.mawkib_id
     OR NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount
     OR NEW.membership_status IS DISTINCT FROM OLD.membership_status
     OR NEW.due_day IS DISTINCT FROM OLD.due_day
     OR NEW.donor_code IS DISTINCT FROM OLD.donor_code
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.access_code IS DISTINCT FROM OLD.access_code
     OR NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'لا يمكن تعديل هذه الحقول إلا من قبل إدارة التطبيق';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. any signed-in user may browse mawakib basics
DROP POLICY IF EXISTS mawakib_select ON public.mawakib;
CREATE POLICY mawakib_select ON public.mawakib
  FOR SELECT TO authenticated USING (true);

-- 4. donation amount change requests
CREATE TABLE IF NOT EXISTS public.amount_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  current_amount integer NOT NULL DEFAULT 0,
  requested_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amount_change_requests TO authenticated;
GRANT ALL ON public.amount_change_requests TO service_role;
ALTER TABLE public.amount_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acr_select ON public.amount_change_requests;
CREATE POLICY acr_select ON public.amount_change_requests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.donors d WHERE d.id = donor_id
            AND (d.user_id = auth.uid() OR public.can_manage_mawkib(d.mawkib_id)))
  );
DROP POLICY IF EXISTS acr_insert_own ON public.amount_change_requests;
CREATE POLICY acr_insert_own ON public.amount_change_requests
  FOR INSERT TO authenticated WITH CHECK (
    status = 'pending'
    AND EXISTS (SELECT 1 FROM public.donors d WHERE d.id = donor_id AND d.user_id = auth.uid())
  );
DROP POLICY IF EXISTS acr_manage ON public.amount_change_requests;
CREATE POLICY acr_manage ON public.amount_change_requests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.donors d WHERE d.id = donor_id AND public.can_manage_mawkib(d.mawkib_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.donors d WHERE d.id = donor_id AND public.can_manage_mawkib(d.mawkib_id))
  );
DROP POLICY IF EXISTS acr_delete ON public.amount_change_requests;
CREATE POLICY acr_delete ON public.amount_change_requests
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.donors d WHERE d.id = donor_id AND public.can_manage_mawkib(d.mawkib_id))
  );

-- 5. history of approved amount changes
CREATE TABLE IF NOT EXISTS public.amount_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  old_amount integer NOT NULL,
  new_amount integer NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.amount_history TO authenticated;
GRANT ALL ON public.amount_history TO service_role;
ALTER TABLE public.amount_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS amount_history_select ON public.amount_history;
CREATE POLICY amount_history_select ON public.amount_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.donors d WHERE d.id = donor_id
            AND (d.user_id = auth.uid() OR public.can_manage_mawkib(d.mawkib_id)))
  );
DROP POLICY IF EXISTS amount_history_insert ON public.amount_history;
CREATE POLICY amount_history_insert ON public.amount_history
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.donors d WHERE d.id = donor_id AND public.can_manage_mawkib(d.mawkib_id))
  );