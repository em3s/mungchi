-- mungchi RLS 활성화
-- Supabase SQL Editor에서 실행

-- 1. tasks 테이블
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_tasks" ON tasks
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 2. task_templates 테이블
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_templates" ON task_templates
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 3. feature_flags 테이블
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_features" ON feature_flags
  FOR ALL TO anon
  USING (true) WITH CHECK (true);
