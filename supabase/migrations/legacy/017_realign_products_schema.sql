-- Realign the live (restored) DB with the schema the code expects.
-- The restored production DB lost the defaults defined in 001/002 and
-- never had the description column referenced by product actions.
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE products ALTER COLUMN stock_quantity SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN status SET DEFAULT 'SALE';

-- Backfill rows created while the defaults were missing so they appear
-- in the default 판매중 filter and stock stats again.
UPDATE products SET stock_quantity = 0 WHERE stock_quantity IS NULL;
UPDATE products SET status = 'SALE' WHERE status IS NULL;
