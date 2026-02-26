-- 원자적 보상 교환 RPC (잔액 확인 + 차감을 단일 트랜잭션으로)
-- Supabase Dashboard → SQL Editor에서 실행
--
-- 기존 add_coin_transaction은 잔액 검증 없이 거래만 삽입.
-- exchange_reward는 잔액 확인 후 부족하면 -1 반환, 충분하면 거래 실행.

CREATE OR REPLACE FUNCTION exchange_reward(
  p_user_id TEXT,
  p_cost INT,
  p_reason TEXT DEFAULT NULL,
  p_ref_id TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
  v_current_balance INT;
BEGIN
  -- 1. 현재 잔액 조회 (FOR UPDATE로 행 잠금 → 동시 요청 직렬화)
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM coin_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 잔액 레코드 없음 또는 부족
  IF v_current_balance IS NULL OR v_current_balance < p_cost THEN
    RETURN -1;
  END IF;

  -- 2. 원자적 거래 실행 (기존 RPC 재사용)
  RETURN add_coin_transaction(p_user_id, -p_cost, 'exchange', p_reason, p_ref_id);
END;
$$ LANGUAGE plpgsql;
