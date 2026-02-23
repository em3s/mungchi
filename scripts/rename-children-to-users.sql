-- children → users 테이블 rename + child_id → user_id 컬럼 rename
-- Supabase SQL Editor에서 실행

-- 1. 테이블 rename
ALTER TABLE children RENAME TO users;

-- 2. 컬럼 rename: tasks
ALTER TABLE tasks RENAME COLUMN child_id TO user_id;

-- 3. 컬럼 rename: badge_records
ALTER TABLE badge_records RENAME COLUMN child_id TO user_id;

-- 4. 컬럼 rename: coin_balances
ALTER TABLE coin_balances RENAME COLUMN child_id TO user_id;

-- 5. 컬럼 rename: coin_transactions
ALTER TABLE coin_transactions RENAME COLUMN child_id TO user_id;

-- 6. 컬럼 rename: feature_flags
ALTER TABLE feature_flags RENAME COLUMN child_id TO user_id;

-- 7. 컬럼 rename: vocab_entries
ALTER TABLE vocab_entries RENAME COLUMN child_id TO user_id;

-- 8. 컬럼 rename: vocab_quizzes
ALTER TABLE vocab_quizzes RENAME COLUMN child_id TO user_id;

-- 9. 컬럼 rename: vocab_list_meta
ALTER TABLE vocab_list_meta RENAME COLUMN child_id TO user_id;
