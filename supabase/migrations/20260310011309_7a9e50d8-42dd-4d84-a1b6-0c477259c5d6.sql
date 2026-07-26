
-- Add location fields to projects for map pins and flight areas
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS flight_radius_m NUMERIC DEFAULT 500;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS flight_altitude_m NUMERIC DEFAULT 120;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS location_name TEXT;
