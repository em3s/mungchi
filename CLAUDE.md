# mungchi 영어 단어장

영어 단어장 + 퀴즈 시스템 (객관식/스펠링). 메인 디바이스는 **iPad 9 (PWA)**.

## 기술 스택

- **프레임워크**: Next.js (App Router)
- **언어**: TypeScript
- **UI**: React + Tailwind CSS
- **데이터**: Supabase (PostgreSQL), 클라이언트 직접 호출
- **로컬 캐시**: IndexedDB (Dexie.js) — 사전 데이터
- **배포**: Vercel
- **PWA**: manifest.json, iPad 9 반응형 대응

## 개발 명령어

- `npm install` — 의존성 설치
- `npm run dev` — 개발 서버 (http://localhost:3000)
- `npm run build` — 프로덕션 빌드
- `npm run lint` — ESLint

## 환경 변수

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 라우트

- `/` — 단어장 메인 (단어장 목록, 오늘의 단어장, 퀴즈) · PIN 인증
- `/admin` — 관리 (단어장 벌크 입력) · PIN 인증

## 프로젝트 구조

- `src/app/page.tsx` — 단어장 메인
- `src/app/admin/page.tsx` — 관리 페이지
- `src/components/`
  - `PageHeader.tsx`, `PinModal.tsx`, `Toast.tsx`, `UpdateButton.tsx`, `SWRProvider.tsx`
  - `WordInput.tsx`, `VocabQuiz.tsx`, `VocabSettings.tsx`
  - `admin/AdminVocabSection.tsx`
- `src/hooks/`
  - `useSW.ts` — Service Worker 업데이트 감지
  - `useToast.ts`, `useLongPress.ts`
- `src/lib/`
  - `vocab.ts` — 단어장 CRUD, 퀴즈, 사전 검색
  - `tts.ts` — Web Speech API
  - `dict-db.ts` — IndexedDB 사전 스키마
  - `dictionary-data.ts` — 정적 사전 (398 단어)
  - `cache.ts`, `date.ts`, `swr.ts`, `types.ts`, `constants.ts`
  - `supabase/client.ts` — Supabase 클라이언트
- `supabase-schema.sql` — DB 스키마

## 단어장 시스템

- DB 테이블: `dictionary`, `vocab_list_meta`, `vocab_entries`, `vocab_quizzes`, `vocab_config`
- 단일 유저: 코드에서 `user_id="default"` 고정값 사용 (DB 컬럼은 호환성 유지)
- 사전 3계층: 정적(dictionary-data.ts 398단어) + 동적(Supabase dictionary) + IndexedDB(Dexie.js) 캐시
- `vocab_entries.spelling` (boolean): 스펠링 퀴즈 대상 여부
- 객관식 퀴즈: Levenshtein 편집거리 기반 유사 단어 오답지
- 스펠링 퀴즈: `spelling=true`인 단어만 출제
- 퀴즈 구조: 틀린 문제 재출제 (라운드), 전체 정답 시 완료
- TTS 발음: Web Speech API (`speechSynthesis`)
- 오늘의 단어장: 날짜 시드 기반 정적 사전 랜덤 10단어 (DB 저장 안 함)

## 관리 페이지

- PIN 인증 (`src/lib/constants.ts`의 `PIN`) — 메인과 세션 공유
- 단어장 벌크 입력: `[제목]` + `word | meaning` 라인

## 자동 업데이트 (PWA)

- `public/sw.js`: network-first 캐시
- `scripts/stamp-sw.js`: prebuild에서 sw.js에 빌드 타임스탬프 주입
- `src/hooks/useSW.ts`: SW 업데이트 감지 (60초 폴링)
- `src/components/UpdateButton.tsx`: "새 버전이 있어요! 업데이트" 배너

## 주의사항

- 코드 변경 후 `npm run build` 확인
- KST 타임존 (UTC+9) 일관 사용 (`src/lib/date.ts`)
- Supabase 에러 핸들링: 읽기=fallback, 쓰기=토스트
- RLS 활성화 (anon 전체 허용)
