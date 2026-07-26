
ALTER TABLE public.drones
  ADD COLUMN IF NOT EXISTS maintenance_interval_hours numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS maintenance_interval_missions integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_maintenance_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_maintenance_flight_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_maintenance_missions integer DEFAULT 0;
