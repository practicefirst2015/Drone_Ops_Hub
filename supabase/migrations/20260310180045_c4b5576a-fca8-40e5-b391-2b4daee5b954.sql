
-- Table to track generated invoice files (HTML/PDF snapshots)
CREATE TABLE public.invoice_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  -- Snapshot of invoice totals at time of generation
  snapshot_subtotal NUMERIC NOT NULL DEFAULT 0,
  snapshot_tax_amount NUMERIC NOT NULL DEFAULT 0,
  snapshot_discount_amount NUMERIC NOT NULL DEFAULT 0,
  snapshot_total NUMERIC NOT NULL DEFAULT 0,
  snapshot_status TEXT NOT NULL DEFAULT 'draft',
  snapshot_line_item_count INTEGER NOT NULL DEFAULT 0,
  generated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.invoice_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org invoice files"
  ON public.invoice_files FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Managers+ can insert invoice files"
  ON public.invoice_files FOR INSERT
  WITH CHECK (get_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'manager'));

CREATE POLICY "Admins+ can delete invoice files"
  ON public.invoice_files FOR DELETE
  USING (get_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));
