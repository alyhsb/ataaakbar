ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IQD';
ALTER TABLE public.payments ADD CONSTRAINT payments_currency_chk CHECK (currency IN ('IQD','USD'));
ALTER TABLE public.goal_contributions ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IQD';
ALTER TABLE public.goal_contributions ADD CONSTRAINT goal_contributions_currency_chk CHECK (currency IN ('IQD','USD'));
ALTER TABLE public.mawkib_goals ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IQD';
ALTER TABLE public.mawkib_goals ADD CONSTRAINT mawkib_goals_currency_chk CHECK (currency IN ('IQD','USD'));
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IQD';
ALTER TABLE public.donors ADD CONSTRAINT donors_currency_chk CHECK (currency IN ('IQD','USD'));