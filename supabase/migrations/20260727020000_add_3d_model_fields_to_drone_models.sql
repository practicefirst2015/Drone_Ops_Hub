-- 3D model support for the drone catalog
ALTER TABLE public.drone_models
  ADD COLUMN IF NOT EXISTS model_3d_url text,
  ADD COLUMN IF NOT EXISTS model_3d_attribution text;

COMMENT ON COLUMN public.drone_models.model_3d_url IS 'URL to a glTF/GLB 3D model of this aircraft (rendered with model-viewer in the app).';
COMMENT ON COLUMN public.drone_models.model_3d_attribution IS 'Required attribution/license credit for the 3D model, displayed alongside the viewer.';
