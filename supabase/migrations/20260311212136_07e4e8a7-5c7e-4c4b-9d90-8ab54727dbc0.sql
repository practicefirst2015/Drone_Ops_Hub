ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS data_insights_opt_in boolean NOT NULL DEFAULT false;