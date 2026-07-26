
-- Add FK from project_notes.user_id to profiles.id
ALTER TABLE public.project_notes
  ADD CONSTRAINT project_notes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add FK from certifications.user_id to profiles.id
ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
