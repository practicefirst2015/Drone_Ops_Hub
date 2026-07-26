-- Track invoice email sends so send-invoice-email can (a) transition a draft to
-- 'issued' on first send and (b) debounce accidental duplicate sends.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.invoices.last_sent_at IS 'When the invoice email was last dispatched (set by send-invoice-email).';
COMMENT ON COLUMN public.invoices.sent_count IS 'Number of times the invoice email has been dispatched.';
