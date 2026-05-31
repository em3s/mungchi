# mungchi 영어 단어장

영어 단어장 + 자가 테스트 가리기 모드. 메인 디바이스는 **iPad 9 (PWA)**.

## 기술 스택

- **프레임워크**: Next.js (App Router)
- **언어**: TypeScript
- **UI**: React + Tailwind CSS
- **데이터**: Supabase (PostgreSQL), 클라이언트 직접 호출
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

- `/` — 단어장 메인 (단어장 목록, 단어 목록, 가리기 모드, TTS) · PIN 인증
- `/admin` — 관리 및 단어장 벌크 입력 · PIN 인증

## 프로젝트 구조

- `src/app/page.tsx` — 단어장 메인 및 상세 뷰
- `src/app/admin/page.tsx` — 벌크 입력 관리 페이지
- `src/components/`
  - `PageHeader.tsx`, `PinModal.tsx`, `Toast.tsx`, `UpdateButton.tsx`, `SWRProvider.tsx`
  - `TopTabs.tsx`, `admin/AdminVocabSection.tsx`
- `src/hooks/`
  - `useSW.ts` — Service Worker 업데이트 감지
  - `useToast.ts`, `usePullToRefresh.ts`
- `src/lib/`
  - `vocab.ts` — 단어장 및 단어 CRUD API (Supabase 연동)
  - `tts.ts` — Web Speech API 발음 기능 (영어 1회/3회, 한국어)
  - `cache.ts`, `date.ts`, `swr.ts`, `types.ts`, `constants.ts`
  - `supabase/client.ts` — Supabase 클라이언트 설정 (빌드 시 예외 방지 대응)
- `supabase-schema.sql` — DB 스키마

## 단어장 시스템

- **DB 테이블**: `vocab_list_meta` (단어장 정보), `vocab_entries` (단어장별 단어 리스트)
- **단일 유저**: 코드에서 `user_id="sihyun"` 고정값 사용 (데이터 표시 일관성 유지)
- **가리기 모드 (🙈 단어 가리기)**:
  - 단어장 상세 뷰에서 실행 가능
  - 한글 뜻을 먼저 보고 영어 단어를 암기할 수 있게 화면을 전환
  - 숨겨진 단어를 클릭하면 첫 글자와 글자 수 힌트(예: `a•••••`) 제공
- **TTS 발음**: Web Speech API (`speechSynthesis`) 기반으로 한글 발음 / 영어 발음 1회 / 영어 발음 3회 연속 재생 기능 제공
- **학습 상태 및 카운터 토글**:
  - **4단계 학습 상태 토글**: 각 단어 행의 첫 번째 단추를 클릭할 때마다 `없음(·) ➔ 세모(△) ➔ 동그라미(○) ➔ 별(☆) ➔ 없음(·)` 순으로 순환 토글되어 학습 성취도를 다단계로 표시합니다. (상단에 상태별 집계도 자동 표시)
  - **학습 횟수 카운터**: 두 번째 단추는 클릭할 때마다 학습 횟수가 `1`씩 증가하는 카운터입니다.
    - **10단위 색상 변화**: 학습 횟수가 10 증가할 때마다 단추의 테두리/배경 색상이 자동으로 바뀌어 직관적인 학습 빈도를 시각화합니다.
    - **오래 누르면 초기화**: 단추를 오래 누르면(Long Press, 800ms) 경고창으로 컨펌(확인)을 거친 후 횟수를 `0`으로 리셋할 수 있습니다.
  - **데이터 보관**: 브라우저의 로컬 스토리지(`localStorage`) 기반으로 동작하므로, 서버 요청 없이 즉각적이고 안정적으로 상태가 유지됩니다.

## 관리 페이지

- PIN 인증 (`src/lib/constants.ts`의 `PIN`) — 메인과 세션 공유
- 단어장 벌크 입력: `[단어장 제목]` 첫 줄 자동 추출 + `영어단어 | 뜻` 형태로 줄바꿈 기입 시 대량 단어장 생성

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
