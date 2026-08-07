CREATE TYPE public.app_role AS ENUM ('admin','donor');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  monthly_amount integer NOT NULL DEFAULT 0,
  notes text,
  joined_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donors TO authenticated;
GRANT ALL ON public.donors TO service_role;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
  paid_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (donor_id, month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- roles
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- donors
CREATE POLICY "donors_select" ON public.donors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "donors_admin_insert" ON public.donors FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "donors_admin_update" ON public.donors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "donors_admin_delete" ON public.donors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- payments
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.donors d WHERE d.id = payments.donor_id AND d.user_id = auth.uid()));
CREATE POLICY "payments_admin_insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "payments_admin_update" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "payments_admin_delete" ON public.payments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.donors d WHERE d.id = notifications.donor_id AND d.user_id = auth.uid()));
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.donors d WHERE d.id = notifications.donor_id AND d.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.donors d WHERE d.id = notifications.donor_id AND d.user_id = auth.uid()));
CREATE POLICY "notifications_admin_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "notifications_admin_delete" ON public.notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- signup handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_phone text;
  v_is_admin boolean;
BEGIN
  v_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NULLIF(NEW.raw_user_meta_data->>'name',''), split_part(COALESCE(NEW.email,'متبرع'),'@',1));
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone','');
  v_is_admin := (NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'alialgpore131@gmail.com');

  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email, v_name, v_phone)
  ON CONFLICT (id) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'donor')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.donors (user_id, name, phone, area, monthly_amount, notes)
    VALUES (NEW.id, v_name, v_phone, COALESCE(NEW.raw_user_meta_data->>'area',''), COALESCE((NEW.raw_user_meta_data->>'monthly_amount')::int, 0), NULL)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'alialgpore131@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'donor';
    DELETE FROM public.donors WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_user_confirmed();