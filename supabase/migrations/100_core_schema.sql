-- ============================================================
-- 100_core_schema.sql — market-neutral core (redesign 2026-08)
--
-- Truth model: master_products is the source of truth.
-- market_listings carry per-market overrides (NULL = inherit).
-- listing_snapshots store what the market actually returned,
-- never merged into local values.
--
-- Apply in Supabase Dashboard SQL Editor.
-- Legacy tables are RENAMED (not dropped) so their data stays
-- available in-DB until Phase 8 cleanup. Kept as-is: users,
-- suppliers, couriers, supplier_order_logs, detail_pages,
-- analysis_logs, saved_assets, benchmark_*, ai_usage_logs.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Preserve conflicting legacy tables
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stores', 'products', 'orders', 'settlements',
    'sync_schedules', 'sync_logs', 'sync_history',
    'stock_sync_logs', 'delivery_trackings'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'legacy_' || t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, 'legacy_' || t);
    END IF;
  END LOOP;
END $$;

-- Shared updated_at trigger function (idempotent redefine)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. market_accounts — a connected sales channel account
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('naver', 'coupang')),
  name TEXT NOT NULL,
  -- App-level encrypted credentials + per-platform settings
  api_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_webhook_url TEXT,
  notification_enabled BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. master_products — source of truth, owned by the user
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  detail_content TEXT,
  base_price INTEGER NOT NULL CHECK (base_price >= 0),
  cost_price INTEGER CHECK (cost_price >= 0),
  -- Stock for single-SKU products; option products derive from product_options
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sku TEXT,
  brand TEXT,
  category_text TEXT,
  image_url TEXT,
  extra_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_master_products_user_sku
  ON public.master_products(user_id, sku) WHERE sku IS NOT NULL;

-- ------------------------------------------------------------
-- 3. product_options — option/SKU level stock
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  -- e.g. {"색상": "블랙", "용량": "500ml"}
  option_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_name TEXT NOT NULL,
  sku TEXT,
  price_delta INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. market_listings — deployment of a master product to a market
--    Override columns: NULL = inherit from master.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  market_account_id UUID NOT NULL REFERENCES public.market_accounts(id) ON DELETE CASCADE,
  -- Primary remote identifier (e.g. Naver channelProductNo)
  remote_ref TEXT,
  -- Extra platform identifiers, e.g. {"originProductNo": "123"}
  remote_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'paused', 'rejected', 'deleted')),
  -- Market-side sale status as last known locally (SALE/SUSPENSION/...)
  remote_status TEXT,
  name_override TEXT,
  price_override INTEGER CHECK (price_override >= 0),
  -- Platform leaf category id (e.g. Naver leafCategoryId)
  category_override TEXT,
  detail_content_override TEXT,
  options_override JSONB,
  -- Platform-specific extras that have no master equivalent
  platform_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_published_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (master_product_id, market_account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_listings_remote_ref
  ON public.market_listings(market_account_id, remote_ref) WHERE remote_ref IS NOT NULL;

-- ------------------------------------------------------------
-- 5. listing_snapshots — what the market actually said (append-only)
--    Never merged into local values; used for the diff view.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.market_listings(id) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  remote_status TEXT,
  name TEXT,
  price INTEGER,
  stock_quantity INTEGER,
  category TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_listing_snapshots_listing
  ON public.listing_snapshots(listing_id, fetched_at DESC);

-- ------------------------------------------------------------
-- 6. orders / order_items — header + per-product-order lines
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  market_account_id UUID NOT NULL REFERENCES public.market_accounts(id) ON DELETE CASCADE,
  -- Market order id (e.g. Naver orderId). Unique per account, not globally.
  market_order_ref TEXT NOT NULL,
  ordered_at TIMESTAMPTZ NOT NULL,
  orderer_name TEXT,
  orderer_tel TEXT,
  receiver_name TEXT,
  receiver_tel TEXT,
  receiver_address TEXT,
  zip_code TEXT,
  delivery_memo TEXT,
  total_payment_amount INTEGER,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market_account_id, market_order_ref)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  -- Market line id (e.g. Naver productOrderId)
  market_item_ref TEXT NOT NULL,
  listing_id UUID REFERENCES public.market_listings(id) ON DELETE SET NULL,
  master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
  product_option_id UUID REFERENCES public.product_options(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  option_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER,
  total_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN (
    'New', 'Ordered', 'Dispatched', 'Delivering', 'Delivered', 'Confirmed',
    'CancelRequested', 'Cancelled',
    'ReturnRequested', 'Returned',
    'ExchangeRequested', 'Exchanged'
  )),
  -- Raw market-side status string for the diff view / debugging
  market_status_raw TEXT,
  shipment_id UUID,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_sent_at TIMESTAMPTZ,
  supplier_order_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (supplier_order_status IN ('pending', 'sent', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, market_item_ref)
);

-- ------------------------------------------------------------
-- 7. shipments — one row per tracking number; items point at it
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  market_account_id UUID REFERENCES public.market_accounts(id) ON DELETE SET NULL,
  courier_code TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('READY', 'IN_PROGRESS', 'DELIVERED', 'FAILED')),
  latest_event_description TEXT,
  latest_event_time TIMESTAMPTZ,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, courier_code, tracking_number)
);

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_shipment_id_fkey;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_shipment_id_fkey
  FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 8. settlements — per market account per day
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_account_id UUID NOT NULL REFERENCES public.market_accounts(id) ON DELETE CASCADE,
  settlement_date DATE NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 0,
  sales_amount BIGINT NOT NULL DEFAULT 0,
  commission_amount BIGINT NOT NULL DEFAULT 0,
  delivery_fee_amount BIGINT NOT NULL DEFAULT 0,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  settlement_amount BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
  remote_ref TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market_account_id, settlement_date)
);

-- ------------------------------------------------------------
-- 9. stock_ledger — append-only stock movement history
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  product_option_id UUID REFERENCES public.product_options(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'initial', 'order', 'cancel', 'manual', 'sync_pull', 'sync_push', 'adjust'
  )),
  -- Free-form pointer: order_item id, listing id, etc.
  ref_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_product
  ON public.stock_ledger(master_product_id, created_at DESC);

-- ------------------------------------------------------------
-- 10. sync_schedules / sync_runs — automation
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  market_account_id UUID NOT NULL REFERENCES public.market_accounts(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('orders', 'products', 'both')),
  interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes >= 1),
  sync_at_minute INTEGER CHECK (sync_at_minute BETWEEN 0 AND 59),
  sync_time TIME,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.sync_schedules(id) ON DELETE SET NULL,
  market_account_id UUID REFERENCES public.market_accounts(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('pull', 'push')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_account
  ON public.sync_runs(market_account_id, started_at DESC);

-- ------------------------------------------------------------
-- 11. Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.market_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

-- Direct user_id ownership
DROP POLICY IF EXISTS "own market_accounts" ON public.market_accounts;
CREATE POLICY "own market_accounts" ON public.market_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own master_products" ON public.master_products;
CREATE POLICY "own master_products" ON public.master_products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own orders" ON public.orders;
CREATE POLICY "own orders" ON public.orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own shipments" ON public.shipments;
CREATE POLICY "own shipments" ON public.shipments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own sync_schedules" ON public.sync_schedules;
CREATE POLICY "own sync_schedules" ON public.sync_schedules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ownership through parent tables
DROP POLICY IF EXISTS "own product_options" ON public.product_options;
CREATE POLICY "own product_options" ON public.product_options
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.master_products mp
    WHERE mp.id = product_options.master_product_id AND mp.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.master_products mp
    WHERE mp.id = product_options.master_product_id AND mp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "own market_listings" ON public.market_listings;
CREATE POLICY "own market_listings" ON public.market_listings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.master_products mp
    WHERE mp.id = market_listings.master_product_id AND mp.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.master_products mp
    WHERE mp.id = market_listings.master_product_id AND mp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "own listing_snapshots" ON public.listing_snapshots;
CREATE POLICY "own listing_snapshots" ON public.listing_snapshots
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_listings ml
    JOIN public.master_products mp ON mp.id = ml.master_product_id
    WHERE ml.id = listing_snapshots.listing_id AND mp.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.market_listings ml
    JOIN public.master_products mp ON mp.id = ml.master_product_id
    WHERE ml.id = listing_snapshots.listing_id AND mp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "own order_items" ON public.order_items;
CREATE POLICY "own order_items" ON public.order_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "own settlements" ON public.settlements;
CREATE POLICY "own settlements" ON public.settlements
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_accounts ma
    WHERE ma.id = settlements.market_account_id AND ma.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.market_accounts ma
    WHERE ma.id = settlements.market_account_id AND ma.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "own stock_ledger" ON public.stock_ledger;
CREATE POLICY "own stock_ledger" ON public.stock_ledger
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.master_products mp
    WHERE mp.id = stock_ledger.master_product_id AND mp.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.master_products mp
    WHERE mp.id = stock_ledger.master_product_id AND mp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "own sync_runs" ON public.sync_runs;
CREATE POLICY "own sync_runs" ON public.sync_runs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_accounts ma
    WHERE ma.id = sync_runs.market_account_id AND ma.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.market_accounts ma
    WHERE ma.id = sync_runs.market_account_id AND ma.user_id = auth.uid()
  ));

-- ------------------------------------------------------------
-- 12. Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_market_accounts_user ON public.market_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_master_products_user ON public.master_products(user_id, status);
CREATE INDEX IF NOT EXISTS idx_master_products_supplier ON public.master_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_options_product ON public.product_options(master_product_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_account ON public.market_listings(market_account_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON public.orders(user_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_account ON public.orders(market_account_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);
CREATE INDEX IF NOT EXISTS idx_order_items_shipment ON public.order_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier ON public.order_items(supplier_id, supplier_order_status);
CREATE INDEX IF NOT EXISTS idx_shipments_user ON public.shipments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_settlements_account_date ON public.settlements(market_account_id, settlement_date DESC);

-- ------------------------------------------------------------
-- 13. updated_at triggers
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'market_accounts', 'master_products', 'product_options',
    'market_listings', 'orders', 'order_items', 'shipments',
    'settlements', 'sync_schedules'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;
