CREATE OR REPLACE FUNCTION public.protect_donor_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR (NEW.name IS DISTINCT FROM OLD.name AND OLD.profile_completed) THEN
    RAISE EXCEPTION 'لا يمكن تعديل هذه الحقول إلا من قبل المسؤول';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_donor_fields() FROM PUBLIC, anon, authenticated;