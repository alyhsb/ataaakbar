-- 1) one account can join many mawakib
ALTER TABLE public.donors DROP CONSTRAINT IF EXISTS donors_user_id_key;
DROP INDEX IF EXISTS public.donors_user_id_key;

-- 2) global account status / last login
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) mawkib disable / restore
ALTER TABLE public.mawakib ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

-- 4) account recovery requests
CREATE TABLE IF NOT EXISTS public.account_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  phone text NOT NULL,
  requester_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);

GRANT SELECT, UPDATE ON public.account_recovery_requests TO authenticated;
GRANT ALL ON public.account_recovery_requests TO service_role;

ALTER TABLE public.account_recovery_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY arr_select ON public.account_recovery_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'owner') AND EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.phone = account_recovery_requests.phone
        AND d.mawkib_id = public.current_mawkib_id()
    ))
  );

CREATE POLICY arr_update ON public.account_recovery_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'owner') AND EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.phone = account_recovery_requests.phone
        AND d.mawkib_id = public.current_mawkib_id()
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER account_recovery_requests_updated_at
  BEFORE UPDATE ON public.account_recovery_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
