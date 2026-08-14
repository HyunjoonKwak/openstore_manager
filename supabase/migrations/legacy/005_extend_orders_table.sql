ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_option TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receiver_tel TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS naver_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_memo TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_naver_order_id ON public.orders(naver_order_id);
