# mungchi (뭉치)

아이들 할일 관리 + 성과(달성) + 학습 시스템 프로젝트.

## 개요

아이들의 일일 할일을 관리하고, 달성도를 추적하며, 영어 단어 학습을 지원하는 시스템.
별사탕 화폐로 학습 동기를 부여. 메인 디바이스는 **iPad 9 (PWA)**.

## 기술 스택

- **프레임워크**: Next.js (App Router)
- **언어**: TypeScript
- **UI**: React + Tailwind CSS
- **데이터**: Supabase (PostgreSQL)
- **배포**: Vercel
- **PWA**: manifest.json, iPad 9 반응형 대응

## 개발 명령어

- `npm install` — 의존성 설치
- `npm run dev` — 개발 서버 (http://localhost:3000)
- `npm run build` — 프로덕션 빌드
- `npm run lint` — ESLint

## 프로젝트 구조

- `src/app/` — Next.js App Router 페이지
  - `page.tsx` — 홈 (아이 선택)
  - `[childId]/page.tsx` — 대시보드 (달력 + 달성률 + 할일)
  - `[childId]/badges/page.tsx` — 뱃지 컬렉션
  - `[childId]/shop/page.tsx` — 별사탕 상점 (잔액, 거래내역)
  - `[childId]/vocab/page.tsx` — 영어 단어장 (단어 추가, 퀴즈)
  - `[childId]/star/page.tsx` — 개인 달성맵 (반짝별/초코별)
  - `[childId]/map/page.tsx` — 합산 달성맵 (쌍둥이별)
  - `admin/page.tsx` — 관리 페이지 (할일, 템플릿, 별사탕, 사전, 보상설정)
- `src/components/` — UI 컴포넌트
  - `BadgeCard.tsx`, `BadgeModal.tsx` — 뱃지 표시/상세
  - `BottomNav.tsx` — 하단 네비게이션 (최대 6탭, feature flag 제어)
  - `Calendar.tsx` — 달력 컴포넌트
  - `ConfettiEffect.tsx` — 올클리어 컨페티
  - `MilestoneMap.tsx` — 달성맵 공통 컴포넌트 (마일스톤 계산+렌더링)
  - `MapNode.tsx` — 달성맵 노드
  - `PinModal.tsx` — PIN 인증 모달
  - `ProgressRing.tsx` — 달성률 링
  - `TaskForm.tsx` — 할일 추가 폼
  - `TaskItem.tsx` — 할일 항목
  - `Toast.tsx` — 토스트 알림
  - `TrophyShelf.tsx` — 트로피 셸프
  - `VocabQuiz.tsx` — 영어 퀴즈 (객관식/주관식)
  - `WordInput.tsx` — 영어 단어 자동완성 입력
- `src/hooks/` — 커스텀 훅 (useSession, useToast)
- `src/lib/` — 유틸리티
  - `constants.ts` — 아이 정보 (CHILDREN, starName), PIN, 마일스톤
  - `cache.ts` — 클라이언트 TTL 캐시 (Map 기반)
  - `features.ts` — feature flag (DB + localStorage override)
  - `date.ts` — KST 날짜 유틸 (todayKST, toKSTDate)
  - `types.ts` — 타입 정의
  - `coins.ts` — 별사탕 화폐 (잔액, 거래, 적립/차감)
  - `vocab.ts` — 영어 단어장 (사전검색, 단어CRUD, 퀴즈, 설정)
  - `supabase/client.ts` — Supabase 클라이언트
  - `badges/` — 뱃지 시스템 (definitions, engine, types)
- `public/` — 정적 파일 (manifest.json)
- `scripts/` — 마이그레이션 스크립트

## 성과 시스템

### 뱃지
- 64개+ 뱃지 (daily 8, streak 13, milestone 30, weekly 3, special 5, hidden 5)
- 등급: common, rare, epic, legendary
- 반복 획득 가능 뱃지 있음
- 히든 뱃지: 획득 전엔 목록에 미노출
- 주간 뱃지: 월~일 기준, 지난주(완료된 주)만 평가
- 얼리버드: KST 6~8시 사이 완료 시 획득
- 트로피 셸프: 💎×1000 👑×100 🏆×10 🏅×1 시각화

### 달성맵
- **쌍둥이별** (합산): 22노드, 최대 5000개 (두 아이 합산)
- **반짝별/초코별** (개인): 22노드, 최대 2500개 (개인 완료 기준)
- `MilestoneMap` 공통 컴포넌트로 렌더링 통합
- feature flag로 탭 표시 제어 (DB 기반, 코드 기본값은 false)

### 재미 요소
- 올클리어 시 컨페티 애니메이션
- 달성률 기반 랜덤 응원 메시지 (perfect/good/start/zero)

## 별사탕 🍬 화폐 시스템

- DB: `coin_transactions` 테이블 (child_id, amount, type, description, balance_after)
- 잔액 조회: `getBalance(childId)` — 최신 balance_after 기반
- 적립/차감: `addTransaction(childId, amount, type, desc)` — 트랜잭션 추가 + 새 잔액 반환
- 거래 타입: `task_reward`, `purchase`, `admin_adjust`, `vocab_quiz`
- 관리자: Admin에서 수동 적립/차감, 거래내역 조회
- feature flag: `coins` (testing)

## 영어 단어장 📖 시스템

- 매일 영어 단어를 입력하고, 사전 기반 자동완성으로 단어장 구성
- 단어장 완성 후 퀴즈 (한국어 뜻 → 영단어 맞추기)
- 퀴즈 통과 시 별사탕 적립 (기본=10, 심화=20, admin에서 설정 가능)
- feature flag: `vocab` (testing)

### DB 테이블
- `dictionary` — 영어 사전 (~300 초등 기본 단어, `text_pattern_ops` prefix 인덱스)
- `vocab_entries` — 아이별 일일 단어 (child_id, date, dictionary_id, word, meaning)
- `vocab_quizzes` — 퀴즈 결과 (child_id, date, quiz_type, total, correct, candy)
- `vocab_config` — 보상 설정 (basic_reward=10, advanced_reward=20, min_words=3)

### 핵심 모듈 (vocab.ts)
- `searchDictionary(query, limit)` — prefix 검색 (자동완성, 캐시 없음)
- `getEntries(childId, date)` — 오늘 단어 목록 (캐시 30s)
- `addEntry / removeEntry` — 단어 추가/삭제
- `hasEarnedToday(childId, date, type)` — 오늘 보상 수령 여부 (중복 방지)
- `saveQuizResult` — 퀴즈 결과 저장
- `getVocabConfig / setVocabConfig` — 보상 설정 CRUD (캐시 60s)
- `getRandomWords(excludeIds, count)` — 객관식 오답 후보

### 퀴즈
- 객관식 (basic): 4지선다 (정답 1 + 오답 3), 별사탕 10
- 주관식 (advanced): 텍스트 입력 (case-insensitive), 별사탕 20
- 하루 1회, 퀴즈 타입별 별사탕 지급

## BottomNav 구조

최대 6탭: 📋 할일 / 🏅 뱃지 / 🍬 별사탕 / 📖 영어 / ⭐ 반짝별 or 🍫 초코별 / 🌟 쌍둥이별
- 별사탕, 영어, 반짝별/초코별, 쌍둥이별은 feature flag로 조건부 표시
- feature flag 기본값은 모두 false (DB에서 true로 활성화)

## Feature Flag 시스템

- 우선순위: localStorage override > DB값 > 코드 기본값 (false)
- DB 테이블: `feature_flags` (child_id, feature, enabled)
- 코드 기본값은 false → 탭이 DB 로드 후 "나타나는" 방식 (깜빡임 방지)
- 현재 피쳐: `map` (쌍둥이별), `star` (반짝별/초코별), `coins` (별사탕), `vocab` (영어단어)
- admin 페이지에서 토글 가능

## 세션/로그인

- Home(아이 선택) → 아이 클릭 → PIN 모달 → 대시보드 진입
- 세션: localStorage (`mungchi_session` = childId)
- 새로고침 시 세션 유지, 로그아웃은 아이 이름 롱프레스 + PIN
- ← 뒤로가기 버튼 없음 (애들이 전환 못하게)

## 관리 페이지 (/admin)

- PIN 인증 후 접근
- 벌크 할일 추가 (아이 선택 + 날짜 + 할일 목록)
- 템플릿 저장/적용/수정/삭제
- 날짜 복제 (특정 날짜의 할일을 다른 날짜로 복사)
- 별사탕 관리 (잔액 조회, 수동 적립/차감, 거래내역)
- 사전 관리 (단건/벌크 추가, TSV 붙여넣기)
- 단어장 보상 설정 (객관식/주관식 보상액, 최소 단어 수)

## 주의사항

- KST 타임존 (UTC+9) 일관 사용
- earnedAt은 UTC 저장, 날짜 비교는 반드시 KST 변환 (toKSTDate)
- React hooks 순서: 모든 hooks는 conditional return 전에 배치해야 함
- Supabase 에러 핸들링: 읽기는 fallback 값, 쓰기는 토스트 알림
- RLS 활성화됨: tasks, task_templates, feature_flags, coin_transactions, dictionary, vocab_entries, vocab_quizzes, vocab_config (anon 전체 허용)
- 아이 추가 시: Child 타입 + CHILDREN 상수 + CODE_DEFAULTS 모두 업데이트
