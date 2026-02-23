-- 단어장 제목 메타데이터
CREATE TABLE vocab_list_meta (
  child_id TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, date)
);

ALTER TABLE vocab_list_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON vocab_list_meta FOR ALL TO anon USING (true) WITH CHECK (true);
