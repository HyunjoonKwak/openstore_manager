ALTER TABLE stores ADD COLUMN IF NOT EXISTS notification_webhook_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT false;
