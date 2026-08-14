CREATE TABLE IF NOT EXISTS delivery_trackings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  carrier_id VARCHAR(50) NOT NULL,
  carrier_name VARCHAR(100) NOT NULL,
  tracking_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  latest_event_status VARCHAR(50),
  latest_event_time TIMESTAMPTZ,
  latest_event_description TEXT,
  sender_name VARCHAR(100),
  sender_address TEXT,
  recipient_name VARCHAR(100),
  recipient_address TEXT,
  product_name VARCHAR(200),
  memo TEXT,
  events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(store_id, carrier_id, tracking_number)
);

CREATE INDEX IF NOT EXISTS idx_delivery_trackings_store_id ON delivery_trackings(store_id);
CREATE INDEX IF NOT EXISTS idx_delivery_trackings_status ON delivery_trackings(status);
CREATE INDEX IF NOT EXISTS idx_delivery_trackings_tracking_number ON delivery_trackings(tracking_number);
CREATE INDEX IF NOT EXISTS idx_delivery_trackings_created_at ON delivery_trackings(created_at DESC);

COMMENT ON TABLE delivery_trackings IS '배송 추적 정보 저장 테이블';
COMMENT ON COLUMN delivery_trackings.status IS 'IN_PROGRESS: 진행중, DELIVERED: 배송완료';
COMMENT ON COLUMN delivery_trackings.events IS '배송 이벤트 히스토리 JSON 배열';
