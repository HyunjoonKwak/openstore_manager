-- Add return and exchange status to orders table
-- Migration: 014_add_return_exchange_status.sql

-- Update the status check constraint to include return/exchange statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'New', 
    'Ordered', 
    'Dispatched', 
    'Delivering', 
    'Delivered', 
    'Confirmed', 
    'CancelRequested', 
    'Cancelled',
    'ReturnRequested',
    'Returned',
    'ExchangeRequested',
    'Exchanged'
  ));

-- Add comment for documentation
COMMENT ON COLUMN orders.status IS 'Order status: New, Ordered, Dispatched, Delivering, Delivered, Confirmed, CancelRequested, Cancelled, ReturnRequested, Returned, ExchangeRequested, Exchanged';
