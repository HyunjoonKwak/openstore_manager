-- Add CancelRequested status to orders table
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('New', 'Ordered', 'Dispatched', 'Delivering', 'Delivered', 'Confirmed', 'CancelRequested', 'Cancelled'));
