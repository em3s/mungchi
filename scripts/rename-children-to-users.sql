-- child_id → user_id 컬럼 rename
-- Supabase SQL Editor에서 실행
-- 참고: children/users 테이블, badge_records 테이블은 존재하지 않음

ALTER TABLE tasks RENAME COLUMN child_id TO user_id;
ALTER TABLE coin_balances RENAME COLUMN child_id TO user_id;
ALTER TABLE coin_transactions RENAME COLUMN child_id TO user_id;
ALTER TABLE feature_flags RENAME COLUMN child_id TO user_id;
ALTER TABLE vocab_entries RENAME COLUMN child_id TO user_id;
ALTER TABLE vocab_quizzes RENAME COLUMN child_id TO user_id;
ALTER TABLE vocab_list_meta RENAME COLUMN child_id TO user_id;
