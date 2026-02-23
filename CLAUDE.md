# mungchi (뭉치)

가족 할일 관리 + 성과(달성) + 학습 시스템.

## 개요

가족 구성원의 일일 할일을 관리하고, 달성도를 추적하며, 영어 단어 학습을 지원하는 시스템.
별사탕 화폐로 학습 동기를 부여. 메인 디바이스는 **iPad 9 (PWA)**.

## 유저 구조

| id | name | role | theme | emoji | starName | descriptor |
|---|---|---|---|---|---|---|
| sihyun | 시현 | child | starry | ⭐ | 반짝별 | 반짝별 수호자 |
| misong | 미송 | child | choco | 🍫 | 초코별 | 초코별 탐험가 |
| dad | 아빠 | parent | shield | 🛡️ | 든든별 | 쌍둥이별 이끔이 |
| mom | 엄마 | parent | heart | 💖 | 따뜻별 | 쌍둥이별 지킴이 |

- `User` 타입 (`src/lib/types.ts`): role="child"|"parent", 모든 기능 동일
- `USERS` 상수 (`src/lib/constants.ts`): 앱 전체에서 사용
- DB에 users 테이블 없음 (유저 정보는 코드 상수 USERS로 관리)
- 쌍둥이별(합산 달성맵): child role만 집계
- 유저 추가 시: User 타입 + USERS 상수 + CODE_DEFAULTS 업데이트

## 기술 스택

- **프레임워크**: Next.js (App Router)
- **언어**: TypeScript
- **UI**: React + Tailwind CSS
- **데이터**: Supabase (PostgreSQL), 클라이언트 직접 호출 (API Route 없음)
- **배포**: Vercel
- **PWA**: manifest.json, iPad 9 반응형 대응

## 개발 명령어

- `npm install` — 의존성 설치
- `npm run dev` — 개발 서버 (http://localhost:3000)
- `npm run build` — 프로덕션 빌드
- `npm run lint` — ESLint

## 프로젝트 구조

- `src/app/` — Next.js App Router 페이지
  - `page.tsx` — 홈 (유저 선택)
  - `[childId]/page.tsx` — 대시보드 (달력 + 달성률 + 할일)
  - `[childId]/badges/page.tsx` — 뱃지 컬렉션
  - `[childId]/shop/page.tsx` — 별사탕 상점 (잔액, 별사탕샵, 거래내역 페이지네이션)
  - `[childId]/vocab/page.tsx` — 영어 단어장 (단어 추가, 퀴즈)
  - `[childId]/game/page.tsx` — 공룡 달리기 게임 (1🍬/판)
  - `[childId]/star/page.tsx` — 개인 달성맵
  - `[childId]/map/page.tsx` — 합산 달성맵 (쌍둥이별, child만 집계)
  - `admin/page.tsx` — 관리 페이지
- `src/components/` — UI 컴포넌트
  - `BottomNav.tsx` — 하단 네비게이션 (최대 6탭, feature flag 제어)
  - `MilestoneMap.tsx` — 달성맵 공통 컴포넌트
  - `SupervisorFAB.tsx` — 관리자 플로팅 버튼 (유저 전환, 관리 이동)
  - `TaskItem.tsx` — 할일/단어 공용 리스트 항목 (onToggle 없으면 체크박스 숨김, checkOnly=스타일 없이 체크만)
  - `TaskForm.tsx` — 할일 추가 폼
  - `WordInput.tsx` — 영어 단어 자동완성 입력
  - `VocabQuiz.tsx` — 영어 퀴즈 (객관식/스펠링, Levenshtein 기반 유사 단어 오답지)
  - `DinoGame.tsx` — 공룡 달리기 Canvas 게임 (🏃 달리는 사람 캐릭터)
  - `PinModal.tsx` — PIN 인증 모달
- `src/hooks/` — 커스텀 훅 (useSession, useToast)
- `src/lib/` — 유틸리티
  - `constants.ts` — USERS, PIN, 마일스톤, 응원 메시지
  - `types.ts` — 타입 정의 (User, Task, Badge, Coin, Vocab 등)
  - `features.ts` — feature flag (DB 기반, admin에서 토글)
  - `cache.ts` — 클라이언트 TTL 캐시 (Map 기반)
  - `date.ts` — KST 날짜 유틸 (todayKST, toKSTDate)
  - `coins.ts` — 별사탕 화폐 시스템
  - `vocab.ts` — 영어 단어장 시스템
  - `supabase/client.ts` — Supabase 클라이언트
  - `badges/` — 뱃지 시스템 (definitions, engine, types)
- `supabase-schema.sql` — 전체 DB 스키마
- `scripts/` — 마이그레이션 스크립트

## 테마 시스템

CSS 커스텀 프로퍼티 기반 (`src/app/globals.css`):
- `.theme-starry` — 보라 (#6c5ce7)
- `.theme-choco` — 오렌지 (#e17055)
- `.theme-shield` — 네이비 (#4a69bd)
- `.theme-heart` — 로즈 (#f78fb3)

## 성과 시스템

### 뱃지
- 64개+ 뱃지 (daily, streak, milestone, weekly, special, hidden)
- 등급: common, rare, epic, legendary
- 트로피 셸프: 💎×1000 👑×100 🏆×10 🏅×1

### 달성맵
- **쌍둥이별** (합산): 22노드, 최대 5000개 (child role만 합산)
- **개인별**: 22노드, 최대 2500개

## 별사탕 🍬 화폐 시스템

- DB: `coin_balances` (잔액), `coin_transactions` (거래), `coin_rewards` (별사탕샵 카탈로그)
- 거래 타입: task_complete, task_uncomplete, allclear_bonus, exchange, admin_adjust, vocab_quiz, game
- 별사탕샵: 보상 아이템 무제한 구매 가능 (잔액 충분 시), emoji-picker-react로 이모지 선택

## 영어 단어장 📖 시스템

- DB: `dictionary`, `vocab_entries`, `vocab_quizzes`, `vocab_config`, `vocab_list_meta`
- 단어장은 이름(name) 기반, UUID list_id로 관리 (날짜 기반 아님)
- `vocab_list_meta`: id(UUID PK), user_id, name, created_at
- `vocab_entries.list_id`: 단어장 FK, `vocab_entries.spelling`: 스펠링 퀴즈 대상 여부
- 모든 단어장 항상 편집 가능 (날짜 제한 없음)
- 퀴즈 보상: 객관식=config.basic_reward(기본1🍬)/완주, 스펠링=1🍬×맞춘수 (매회 지급, 1일 제한 없음)
- 객관식: Levenshtein 편집거리 기반 유사 단어 오답지 생성
- 스펠링: spelling=true인 단어만 출제, 정답 시 +1🍬 플로팅 애니메이션
- 퀴즈 구조: 틀린 문제 재출제 (라운드), 전체 정답 시 완료

## Feature Flag 시스템

- DB 테이블: `feature_flags` (user_id, feature, enabled)
- 코드 기본값: false (testing) → DB에서 true로 활성화
- 현재 피쳐: `map`, `star`, `coins`, `vocab`, `game`
- admin 페이지에서 DB 토글

## 세션/로그인

- Home → 유저 클릭 → PIN 모달 → 대시보드 진입
- PIN: 전체 공통 (`constants.ts`의 `PIN`)
- 세션: localStorage (`mungchi_session` = childId)
- 로그아웃: 이름 롱프레스 + PIN
- SupervisorFAB: admin 진입 시 활성화, 유저 전환/관리 이동

## 관리 페이지 (/admin)

- PIN 인증 후 접근
- 피쳐플래그 토글 (DB)
- 별사탕 관리 (잔액, 수동 조정, 거래내역)
- 별사탕샵 카탈로그 (추가/삭제/활성화, emoji-picker-react)
- 단어장 보상 설정
- 사전 관리 (단건/벌크 추가)
- 벌크 할일 추가 + 템플릿
- 날짜 복제

## 자동 업데이트 (PWA)

- `public/sw.js`: network-first 캐시, 사용자 제어 업데이트
- `scripts/stamp-sw.js`: prebuild에서 sw.js에 빌드 타임스탬프 주입 → 배포마다 SW 변경
- `src/hooks/useSW.ts`: SW 업데이트 + 피쳐플래그 변경 감지 (각 60초 폴링)
- `src/components/UpdateButton.tsx`: "새 버전이 있어요! 업데이트" 배너 (SW 업데이트, 플래그 변경 동일)

## 주의사항

- KST 타임존 (UTC+9) 일관 사용
- earnedAt은 UTC 저장, 날짜 비교는 반드시 KST 변환 (toKSTDate)
- React hooks 순서: 모든 hooks는 conditional return 전에 배치
- Supabase 에러 핸들링: 읽기=fallback, 쓰기=토스트
- RLS 활성화 (anon 전체 허용)
