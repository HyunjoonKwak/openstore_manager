-- SmartStore Manager Initial Schema
-- Run this in Supabase SQL Editor

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('Naver', 'Coupang', 'Gmarket', '11st', 'Other')),
  store_name TEXT NOT NULL,
  api_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_number TEXT,
  contact_method TEXT DEFAULT 'SMS' CHECK (contact_method IN ('SMS', 'Kakao')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  sku TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  platform_order_id TEXT,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER DEFAULT 1,
  customer_name TEXT,
  customer_address TEXT,
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Ordered', 'Shipped', 'Cancelled')),
  tracking_number TEXT,
  courier_code TEXT,
  order_date TIMESTAMPTZ DEFAULT NOW()
);

-- Detail Pages table (AI Generated content)
CREATE TABLE IF NOT EXISTS public.detail_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_html TEXT,
  user_inputs JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own stores" ON public.stores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own suppliers" ON public.suppliers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage products in own stores" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = products.store_id 
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage orders in own stores" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = orders.store_id 
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own detail pages" ON public.detail_pages
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_detail_pages_user_id ON public.detail_pages(user_id);
