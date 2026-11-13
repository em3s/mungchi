-- 공개(anon) 키로는 DB 를 읽거나 쓰지 못하게 잠근다. 앱 서버(서비스 키)만 접근한다.
-- 순서: 서버 전환 코드가 배포되고 앱이 정상인 것을 확인한 뒤 Supabase SQL Editor 에서 한 번 실행.
-- 되돌리기(비상): CREATE POLICY "anon_all" ON <테이블> FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all" ON dictionary;
DROP POLICY IF EXISTS "anon_all" ON vocab_list_meta;
DROP POLICY IF EXISTS "anon_all" ON vocab_entries;
DROP POLICY IF EXISTS "anon_all" ON vocab_quizzes;
DROP POLICY IF EXISTS "anon_all" ON vocab_config;

-- RLS 는 켜 둔 채(정책 없음 = anon 전부 거부). 뷰는 RLS 를 거치지 않으니 권한을 뺀다.
REVOKE ALL ON vocab_entry_counts FROM anon, authenticated;
