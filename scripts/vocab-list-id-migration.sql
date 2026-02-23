-- 단어장: 날짜 기반 → 이름 기반 마이그레이션 (기존 데이터 삭제)
-- Supabase SQL Editor에서 실행

-- 1. 기존 데이터 전부 삭제
TRUNCATE vocab_quizzes;
TRUNCATE vocab_entries;
TRUNCATE vocab_list_meta;

-- 2. vocab_list_meta 스키마 변경 (date → id+name)
ALTER TABLE vocab_list_meta DROP CONSTRAINT vocab_list_meta_pkey;
ALTER TABLE vocab_list_meta ADD COLUMN id UUID DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE vocab_list_meta ADD PRIMARY KEY (id);
ALTER TABLE vocab_list_meta RENAME COLUMN title TO name;
ALTER TABLE vocab_list_meta DROP COLUMN date;
CREATE INDEX idx_vlm_user ON vocab_list_meta(user_id);

-- 3. vocab_entries: date → list_id
DROP INDEX IF EXISTS idx_ve_child_date;
DROP INDEX IF EXISTS idx_ve_unique;
ALTER TABLE vocab_entries DROP COLUMN date;
ALTER TABLE vocab_entries ADD COLUMN list_id UUID NOT NULL;
CREATE INDEX idx_ve_list ON vocab_entries(list_id);
CREATE UNIQUE INDEX idx_ve_unique_list ON vocab_entries(list_id, word);

-- 4. vocab_quizzes: date → list_id
DROP INDEX IF EXISTS idx_vq_child_date;
ALTER TABLE vocab_quizzes DROP COLUMN date;
ALTER TABLE vocab_quizzes ADD COLUMN list_id UUID NOT NULL;
CREATE INDEX idx_vq_list ON vocab_quizzes(list_id);
