CREATE TABLE public.donor_activation_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  donor_id uuid REFERENCES public.donors(id) ON DELETE SET NULL,
  phone text NOT NULL,
  code_hash text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamp with time zone
);

GRANT ALL ON public.donor_activation_codes TO service_role;

ALTER TABLE public.donor_activation_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX donor_activation_codes_phone_idx ON public.donor_activation_codes (phone) WHERE used_at IS NULL;
CREATE INDEX donor_activation_codes_user_idx ON public.donor_activation_codes (user_id);