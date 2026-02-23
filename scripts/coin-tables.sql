-- 별사탕 화폐 시스템 테이블

-- 잔액 (빠른 조회용)
CREATE TABLE coin_balances (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 거래 내역
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  ref_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coin_tx_child ON coin_transactions(user_id, created_at DESC);

-- 보상 카탈로그
CREATE TABLE coin_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  cost INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE coin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_coin_balances" ON coin_balances FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_coin_transactions" ON coin_transactions FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE coin_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_coin_rewards" ON coin_rewards FOR ALL TO anon USING (true) WITH CHECK (true);

-- 초기 데이터
INSERT INTO coin_balances (user_id, balance) VALUES ('sihyun', 0), ('misong', 0);
