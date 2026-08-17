-- Mawakib (processions)
CREATE TABLE IF NOT EXISTS public.mawakib (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mawakib TO authenticated;
GRANT ALL ON public.mawakib TO service_role;
ALTER TABLE public.mawakib ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mawkib_id uuid REFERENCES public.mawakib(id) ON DELETE SET NULL;
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS mawkib_id uuid REFERENCES public.mawakib(id) ON DELETE SET NULL;
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS access_code text;

INSERT INTO public.mawakib (id, name, area)
SELECT '00000000-0000-4000-8000-000000000001', 'موكب شباب علي الأكبر', 'بابل - الهاشمية'
WHERE NOT EXISTS (SELECT 1 FROM public.mawakib);

UPDATE public.donors SET mawkib_id = (SELECT id FROM public.mawakib ORDER BY created_at LIMIT 1) WHERE mawkib_id IS NULL;

-- Helper functions
CREATE OR REPLACE FUNCTION public.current_mawkib_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT mawkib_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_manage_mawkib(_mawkib uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'owner') AND _mawkib IS NOT NULL AND _mawkib = public.current_mawkib_id());
$$;

-- Mawakib policies
DROP POLICY IF EXISTS mawakib_select ON public.mawakib;
CREATE POLICY mawakib_select ON public.mawakib FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR id = public.current_mawkib_id());
DROP POLICY IF EXISTS mawakib_admin_all ON public.mawakib;
CREATE POLICY mawakib_admin_all ON public.mawakib FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Donors policies
DROP POLICY IF EXISTS donors_select ON public.donors;
DROP POLICY IF EXISTS donors_admin_insert ON public.donors;
DROP POLICY IF EXISTS donors_admin_update ON public.donors;
DROP POLICY IF EXISTS donors_admin_delete ON public.donors;
DROP POLICY IF EXISTS donors_update_own ON public.donors;
CREATE POLICY donors_select ON public.donors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_mawkib(mawkib_id));
CREATE POLICY donors_manage_insert ON public.donors FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_mawkib(mawkib_id));
CREATE POLICY donors_manage_update ON public.donors FOR UPDATE TO authenticated
  USING (public.can_manage_mawkib(mawkib_id)) WITH CHECK (public.can_manage_mawkib(mawkib_id));
CREATE POLICY donors_manage_delete ON public.donors FOR DELETE TO authenticated
  USING (public.can_manage_mawkib(mawkib_id));
CREATE POLICY donors_update_own ON public.donors FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Payments policies
DROP POLICY IF EXISTS payments_select ON public.payments;
DROP POLICY IF EXISTS payments_admin_insert ON public.payments;
DROP POLICY IF EXISTS payments_admin_update ON public.payments;
DROP POLICY IF EXISTS payments_admin_delete ON public.payments;
CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = payments.donor_id AND (d.user_id = auth.uid() OR public.can_manage_mawkib(d.mawkib_id))));
CREATE POLICY payments_manage_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = payments.donor_id AND public.can_manage_mawkib(d.mawkib_id)));
CREATE POLICY payments_manage_update ON public.payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = payments.donor_id AND public.can_manage_mawkib(d.mawkib_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = payments.donor_id AND public.can_manage_mawkib(d.mawkib_id)));
CREATE POLICY payments_manage_delete ON public.payments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = payments.donor_id AND public.can_manage_mawkib(d.mawkib_id)));

-- Notifications policies
DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_update ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_delete ON public.notifications;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = notifications.donor_id AND (d.user_id = auth.uid() OR public.can_manage_mawkib(d.mawkib_id))));
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = notifications.donor_id AND (d.user_id = auth.uid() OR public.can_manage_mawkib(d.mawkib_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = notifications.donor_id AND (d.user_id = auth.uid() OR public.can_manage_mawkib(d.mawkib_id))));
CREATE POLICY notifications_manage_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = notifications.donor_id AND public.can_manage_mawkib(d.mawkib_id)));
CREATE POLICY notifications_manage_delete ON public.notifications FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.donors d WHERE d.id = notifications.donor_id AND public.can_manage_mawkib(d.mawkib_id)));

-- Donors may not change their own identity fields
CREATE OR REPLACE FUNCTION public.protect_donor_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_manage_mawkib(OLD.mawkib_id) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.mawkib_id IS DISTINCT FROM OLD.mawkib_id
     OR NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount
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
$$;

-- No self signup: accounts are created by admins/owners only
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_phone text;
  v_type text;
  v_donor_id uuid;
  v_mawkib uuid;
BEGIN
  v_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(COALESCE(NEW.email,'مستخدم'),'@',1));
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone','');
  v_type := COALESCE(NULLIF(NEW.raw_user_meta_data->>'account_type',''), 'donor');
  v_donor_id := NULLIF(NEW.raw_user_meta_data->>'donor_id','')::uuid;
  v_mawkib := NULLIF(NEW.raw_user_meta_data->>'mawkib_id','')::uuid;

  INSERT INTO public.profiles (id, email, full_name, phone, mawkib_id)
  VALUES (NEW.id, NEW.email, v_name, v_phone, v_mawkib)
  ON CONFLICT (id) DO UPDATE SET mawkib_id = COALESCE(EXCLUDED.mawkib_id, public.profiles.mawkib_id);

  IF lower(COALESCE(NEW.email,'')) = 'alialgpore131@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  IF v_type = 'owner' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner') ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'donor') ON CONFLICT (user_id, role) DO NOTHING;
  IF v_donor_id IS NOT NULL THEN
    UPDATE public.donors SET user_id = NEW.id WHERE id = v_donor_id AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;