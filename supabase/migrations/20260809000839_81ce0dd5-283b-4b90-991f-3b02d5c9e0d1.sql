REVOKE EXECUTE ON FUNCTION public.protect_donor_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_confirmed() FROM PUBLIC, anon, authenticated;