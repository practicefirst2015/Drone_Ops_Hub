
-- Fix tasks.assigned_to: repoint from auth.users to public.profiles
ALTER TABLE public.tasks DROP CONSTRAINT tasks_assigned_to_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Fix project_members.user_id: repoint from auth.users to public.profiles
ALTER TABLE public.project_members DROP CONSTRAINT project_members_user_id_fkey;
ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Add invoice_files.generated_by FK to profiles
ALTER TABLE public.invoice_files
  ADD CONSTRAINT invoice_files_generated_by_fkey
  FOREIGN KEY (generated_by) REFERENCES public.profiles(id)
  ON DELETE SET NULL;
