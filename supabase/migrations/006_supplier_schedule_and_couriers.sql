-- 공급업체 테이블 확장: 메시지 템플릿, 전송 스케줄
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS message_template TEXT,
ADD COLUMN IF NOT EXISTS send_schedule_time TIME, -- 매일 전송 시간 (예: 09:00)
ADD COLUMN IF NOT EXISTS send_schedule_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT false; -- 자동 전송 활성화

-- 주문 테이블에 공급업체 연결 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS supplier_sent_at TIMESTAMP WITH TIME ZONE, -- 공급업체에 전송된 시간
ADD COLUMN IF NOT EXISTS supplier_order_status TEXT DEFAULT 'pending'; -- pending, sent, confirmed

-- 택배업체 테이블
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 택배업체명 (예: CJ대한통운, 한진택배)
  code TEXT NOT NULL, -- API 코드 (예: CJGLS, HANJIN)
  api_type TEXT, -- API 타입 (예: goodsflow, sweettracker, direct)
  api_config JSONB DEFAULT '{}', -- API 설정 (API Key 등)
  is_default BOOLEAN DEFAULT false, -- 기본 택배업체 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 공급업체-택배업체 연결
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES couriers(id),
ADD COLUMN IF NOT EXISTS default_courier_account TEXT; -- 계약번호 등

-- 공급업체 전송 기록 테이블
CREATE TABLE IF NOT EXISTS supplier_order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  order_ids UUID[] NOT NULL, -- 전송된 주문 ID 목록
  message_content TEXT, -- 실제 전송된 메시지
  send_method TEXT NOT NULL, -- SMS, Kakao
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_sent_at ON orders(supplier_sent_at);
CREATE INDEX IF NOT EXISTS idx_couriers_user_id ON couriers(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_logs_supplier_id ON supplier_order_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_logs_sent_at ON supplier_order_logs(sent_at);

-- RLS 정책
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own couriers" ON couriers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own couriers" ON couriers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own couriers" ON couriers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own couriers" ON couriers
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own supplier logs" ON supplier_order_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM suppliers s 
      WHERE s.id = supplier_order_logs.supplier_id 
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own supplier logs" ON supplier_order_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s 
      WHERE s.id = supplier_order_logs.supplier_id 
      AND s.user_id = auth.uid()
    )
  );
