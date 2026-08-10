-- Donor codes -------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.donor_code_seq START 1;

ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS donor_code text,
  ADD COLUMN IF NOT EXISTS due_day integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_profile_update_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_donor_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.donor_code IS NULL OR NEW.donor_code = '' THEN
    NEW.donor_code := 'DON-' || lpad(nextval('public.donor_code_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS donors_set_code ON public.donors;
CREATE TRIGGER donors_set_code BEFORE INSERT ON public.donors
FOR EACH ROW EXECUTE FUNCTION public.set_donor_code();

-- Backfill existing donors in creation order
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.donors WHERE donor_code IS NULL ORDER BY created_at LOOP
    UPDATE public.donors
      SET donor_code = 'DON-' || lpad(nextval('public.donor_code_seq')::text, 3, '0')
      WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS donors_donor_code_key ON public.donors (donor_code);

-- Track profile updates
CREATE OR REPLACE FUNCTION public.touch_donor_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.area IS DISTINCT FROM OLD.area
     OR NEW.location IS DISTINCT FROM OLD.location
     OR NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount
     OR NEW.due_day IS DISTINCT FROM OLD.due_day THEN
    NEW.last_profile_update_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS donors_touch_profile ON public.donors;
CREATE TRIGGER donors_touch_profile BEFORE UPDATE ON public.donors
FOR EACH ROW EXECUTE FUNCTION public.touch_donor_profile();

-- Due day is admin-only
CREATE OR REPLACE FUNCTION public.protect_donor_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount
     OR NEW.due_day IS DISTINCT FROM OLD.due_day
     OR NEW.donor_code IS DISTINCT FROM OLD.donor_code
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR (NEW.name IS DISTINCT FROM OLD.name AND OLD.profile_completed) THEN
    RAISE EXCEPTION 'لا يمكن تعديل هذه الحقول إلا من قبل المسؤول';
  END IF;
  RETURN NEW;
END;
$$;

-- Validate due day range with a trigger
CREATE OR REPLACE FUNCTION public.validate_due_day()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.due_day < 1 OR NEW.due_day > 28 THEN
    RAISE EXCEPTION 'يوم الاستحقاق يجب أن يكون بين ١ و ٢٨';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS donors_validate_due_day ON public.donors;
CREATE TRIGGER donors_validate_due_day BEFORE INSERT OR UPDATE ON public.donors
FOR EACH ROW EXECUTE FUNCTION public.validate_due_day();

-- No duplicate phone numbers among non-deleted donors
CREATE UNIQUE INDEX IF NOT EXISTS donors_unique_active_phone
  ON public.donors (regexp_replace(phone, '\D', '', 'g'))
  WHERE deleted_at IS NULL AND phone <> '';

-- Payment transaction codes ------------------------------------------
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS txn_code text;

CREATE TABLE IF NOT EXISTS public.payment_counters (
  year integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.payment_counters TO service_role;
ALTER TABLE public.payment_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_payment_txn_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_next integer;
BEGIN
  IF NEW.txn_code IS NULL OR NEW.txn_code = '' THEN
    INSERT INTO public.payment_counters (year, last_value)
      VALUES (NEW.year, 1)
    ON CONFLICT (year) DO UPDATE SET last_value = public.payment_counters.last_value + 1
    RETURNING last_value INTO v_next;
    NEW.txn_code := 'PAY-' || NEW.year::text || '-' || lpad(v_next::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_set_txn_code ON public.payments;
CREATE TRIGGER payments_set_txn_code BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_payment_txn_code();

DO $$
DECLARE r record; v_next integer;
BEGIN
  FOR r IN SELECT id, year FROM public.payments WHERE txn_code IS NULL ORDER BY created_at LOOP
    INSERT INTO public.payment_counters (year, last_value) VALUES (r.year, 1)
    ON CONFLICT (year) DO UPDATE SET last_value = public.payment_counters.last_value + 1
    RETURNING last_value INTO v_next;
    UPDATE public.payments
      SET txn_code = 'PAY-' || r.year::text || '-' || lpad(v_next::text, 4, '0')
      WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_txn_code_key ON public.payments (txn_code);