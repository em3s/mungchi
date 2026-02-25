-- 원자적 초코 거래 + 잔액 업데이트 RPC
-- Supabase Dashboard → SQL Editor에서 실행

CREATE OR REPLACE FUNCTION add_coin_transaction(
  p_user_id TEXT,
  p_amount INT,
  p_type TEXT,
  p_reason TEXT DEFAULT NULL,
  p_ref_id TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
  v_balance INT;
BEGIN
  -- 1. 거래 삽입
  INSERT INTO coin_transactions (user_id, amount, type, reason, ref_id)
  VALUES (p_user_id, p_amount, p_type, p_reason, p_ref_id);

  -- 2. SUM으로 정확한 잔액 계산
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM coin_transactions WHERE user_id = p_user_id;

  -- 음수 방지
  IF v_balance < 0 THEN v_balance := 0; END IF;

  -- 3. 잔액 upsert
  INSERT INTO coin_balances (user_id, balance, updated_at)
  VALUES (p_user_id, v_balance, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET balance = v_balance, updated_at = NOW();

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;
