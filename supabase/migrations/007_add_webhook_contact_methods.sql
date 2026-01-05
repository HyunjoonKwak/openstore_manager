ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS webhook_url TEXT;

ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_contact_method_check;
ALTER TABLE suppliers ADD CONSTRAINT suppliers_contact_method_check 
  CHECK (contact_method IN ('SMS', 'Kakao', 'Telegram', 'Discord'));
