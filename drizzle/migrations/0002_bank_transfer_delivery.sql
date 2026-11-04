ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Nigeria',
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS town text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_ref text;
COMMENT ON COLUMN public.orders.paystack_ref IS 'DEPRECATED: replaced by order_ref (bank transfer)';