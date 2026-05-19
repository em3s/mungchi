-- mungchi Supabase 스키마 — 영어 단어장만
-- Supabase SQL Editor에서 실행
-- user_id 컬럼은 호환성을 위해 유지하되, 코드에서는 "default" 고정값 사용

-- 1. dictionary: 영어 사전 (English → Korean)
CREATE TABLE dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_dict_word ON dictionary(word);
CREATE INDEX idx_dict_prefix ON dictionary(word text_pattern_ops);

-- 2. vocab_list_meta: 단어장 (이름 기반)
CREATE TABLE vocab_list_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vlm_user ON vocab_list_meta(user_id);

-- 3. vocab_entries: 단어장 내 단어
CREATE TABLE vocab_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  list_id UUID NOT NULL,
  dictionary_id UUID REFERENCES dictionary(id),
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  spelling BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ve_list ON vocab_entries(list_id);
CREATE UNIQUE INDEX idx_ve_unique_list ON vocab_entries(list_id, word);

-- 4. vocab_quizzes: 퀴즈 결과
CREATE TABLE vocab_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  list_id UUID NOT NULL,
  quiz_type TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  candy_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vq_list ON vocab_quizzes(list_id);

-- 5. vocab_config: 보상 설정
CREATE TABLE vocab_config (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (anon 전체 허용)
ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON dictionary FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vocab_list_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON vocab_list_meta FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vocab_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON vocab_entries FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vocab_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON vocab_quizzes FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vocab_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON vocab_config FOR ALL TO anon USING (true) WITH CHECK (true);

-- 초기 보상 설정 (현재 코드에서는 min_words만 사용)
INSERT INTO vocab_config (key, value) VALUES
  ('min_words', 3);
