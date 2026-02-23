-- dad, mom 유저 추가 (children 테이블)
-- Supabase SQL Editor에서 실행

INSERT INTO children (id, name, theme, emoji) VALUES
  ('dad', '아빠', 'shield', '🛡️'),
  ('mom', '엄마', 'heart', '💖')
ON CONFLICT (id) DO NOTHING;
