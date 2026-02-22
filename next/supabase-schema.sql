-- mungchi Supabase 스키마
-- Supabase SQL Editor에서 실행

-- 아이 정보
CREATE TABLE children (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  emoji TEXT NOT NULL,
  pin TEXT NOT NULL DEFAULT '999999',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO children (id, name, theme, emoji) VALUES
  ('sihyun', '시현', 'starry', '⭐'),
  ('misong', '미송', 'choco', '🍫');

-- 할일
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT NOT NULL REFERENCES children(id),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_child_date ON tasks(child_id, date);

-- 뱃지 기록
CREATE TABLE badge_records (
  id TEXT PRIMARY KEY,
  badge_id TEXT NOT NULL,
  child_id TEXT NOT NULL REFERENCES children(id),
  earned_at TIMESTAMPTZ NOT NULL,
  earned_date DATE NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_badge_records_child ON badge_records(child_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 할일 템플릿
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tasks JSONB NOT NULL,  -- [{ title, forChildren }]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 기본 템플릿 데이터
INSERT INTO task_templates (name, tasks) VALUES (
  '🪥 양치 3종',
  $$[
    {"title": "🪥 아침 양치하기", "forChildren": ["sihyun", "misong"]},
    {"title": "🪥 점심 양치하기", "forChildren": ["sihyun", "misong"]},
    {"title": "🪥 저녁 양치하기", "forChildren": ["sihyun", "misong"]}
  ]$$::jsonb
);

INSERT INTO task_templates (name, tasks) VALUES (
  '📚 공부 세트',
  $$[
    {"title": "국어", "forChildren": ["sihyun", "misong"]},
    {"title": "수학", "forChildren": ["sihyun", "misong"]},
    {"title": "영어", "forChildren": ["sihyun", "misong"]}
  ]$$::jsonb
);

INSERT INTO task_templates (name, tasks) VALUES (
  '🏠 평일 기본',
  $$[
    {"title": "🪥 아침 양치하기", "forChildren": ["sihyun", "misong"]},
    {"title": "🪥 점심 양치하기", "forChildren": ["sihyun", "misong"]},
    {"title": "🪥 저녁 양치하기", "forChildren": ["sihyun", "misong"]},
    {"title": "국어", "forChildren": ["sihyun", "misong"]},
    {"title": "수학", "forChildren": ["sihyun", "misong"]},
    {"title": "영어", "forChildren": ["sihyun", "misong"]},
    {"title": "이챕터스 영어 단어 외우기", "forChildren": ["sihyun", "misong"]}
  ]$$::jsonb
);
