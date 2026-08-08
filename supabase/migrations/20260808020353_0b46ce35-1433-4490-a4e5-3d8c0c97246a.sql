ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS donors_username_key ON public.donors (lower(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_phone text;
  v_is_admin boolean;
  v_donor_id uuid;
BEGIN
  v_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NULLIF(NEW.raw_user_meta_data->>'name',''), split_part(COALESCE(NEW.email,'متبرع'),'@',1));
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone','');
  v_is_admin := (NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'alialgpore131@gmail.com');
  v_donor_id := NULLIF(NEW.raw_user_meta_data->>'donor_id','')::uuid;

  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email, v_name, v_phone)
  ON CONFLICT (id) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'donor')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_donor_id IS NOT NULL THEN
    UPDATE public.donors SET user_id = NEW.id WHERE id = v_donor_id AND user_id IS NULL;
  ELSE
    INSERT INTO public.donors (user_id, name, phone, area, monthly_amount, notes)
    VALUES (NEW.id, v_name, v_phone, COALESCE(NEW.raw_user_meta_data->>'area',''), COALESCE((NEW.raw_user_meta_data->>'monthly_amount')::int, 0), NULL)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;