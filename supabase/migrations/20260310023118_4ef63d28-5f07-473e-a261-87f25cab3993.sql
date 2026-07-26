
-- Add discount fields to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- Add storage policy for invoice PDFs in the existing project-documents bucket
-- (PDFs will be stored under invoices/ prefix in project-documents bucket)
