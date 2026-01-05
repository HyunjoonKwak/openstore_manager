-- Add status and additional fields to products table
-- Run this in Supabase SQL Editor

-- Product status type
DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('SALE', 'SUSPENSION', 'WAIT', 'UNADMISSION', 'REJECTION', 'PROHIBITION', 'DELETE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SALE',
ADD COLUMN IF NOT EXISTS platform_product_id TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique index on platform_product_id for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_platform_product_id 
ON public.products(store_id, platform_product_id) 
WHERE platform_product_id IS NOT NULL;

-- Create unique index on sku for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique 
ON public.products(store_id, sku) 
WHERE sku IS NOT NULL;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- Add search columns to detail_pages for better searchability
ALTER TABLE public.detail_pages
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Create index for detail page search
CREATE INDEX IF NOT EXISTS idx_detail_pages_product_name ON public.detail_pages(product_name);
CREATE INDEX IF NOT EXISTS idx_detail_pages_title ON public.detail_pages(title);
