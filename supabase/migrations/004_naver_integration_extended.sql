-- Extended Naver SmartStore Integration Schema
-- Adds settlements, product detail content, and sync history

-- Settlements table for tracking payment settlements
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  settlement_date DATE NOT NULL,
  order_count INTEGER DEFAULT 0,
  sales_amount BIGINT DEFAULT 0,
  commission_amount BIGINT DEFAULT 0,
  delivery_fee_amount BIGINT DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  settlement_amount BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
  naver_settlement_no TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for settlement date per store
ALTER TABLE public.settlements 
ADD CONSTRAINT settlements_store_date_unique UNIQUE (store_id, settlement_date);

-- Add product detail content columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS detail_content TEXT,
ADD COLUMN IF NOT EXISTS detail_attributes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS naver_channel_product_no BIGINT,
ADD COLUMN IF NOT EXISTS naver_origin_product_no BIGINT,
ADD COLUMN IF NOT EXISTS last_detail_sync_at TIMESTAMPTZ;

-- Sync history table for tracking all sync operations
CREATE TABLE IF NOT EXISTS public.sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('orders', 'products', 'stock', 'settlement', 'detail_page')),
  direction TEXT NOT NULL CHECK (direction IN ('pull', 'push')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Stock sync logs for tracking inventory changes
CREATE TABLE IF NOT EXISTS public.stock_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('local', 'naver', 'manual')),
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('pull', 'push')),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settlements
CREATE POLICY "Users can manage settlements in own stores" ON public.settlements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = settlements.store_id 
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policies for sync_history
CREATE POLICY "Users can manage sync_history in own stores" ON public.sync_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = sync_history.store_id 
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policies for stock_sync_logs
CREATE POLICY "Users can manage stock_sync_logs for own products" ON public.stock_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products 
      JOIN public.stores ON stores.id = products.store_id
      WHERE products.id = stock_sync_logs.product_id 
      AND stores.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlements_store_id ON public.settlements(store_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.settlements(settlement_date DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_store_id ON public.sync_history(store_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON public.sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_sync_logs_product_id ON public.stock_sync_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_products_naver_origin_no ON public.products(naver_origin_product_no);

-- Add platform_order_id unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_platform_order_id_unique'
  ) THEN
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_platform_order_id_unique UNIQUE (platform_order_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Update orders table to add naver-specific fields
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS naver_product_order_id TEXT,
ADD COLUMN IF NOT EXISTS unit_price INTEGER,
ADD COLUMN IF NOT EXISTS total_payment_amount INTEGER,
ADD COLUMN IF NOT EXISTS naver_order_status TEXT,
ADD COLUMN IF NOT EXISTS orderer_tel TEXT;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for settlements updated_at
DROP TRIGGER IF EXISTS update_settlements_updated_at ON public.settlements;
CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
