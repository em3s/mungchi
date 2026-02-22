# mungchi (뭉치)

아이들 할일 관리 + 성과(달성) 시스템 프로젝트.

## 개요

아이들의 일일 할일을 관리하고, 달성도를 추적하는 성과 관리 시스템.
메인 디바이스는 **iPad 9 (PWA)**.

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
  - `[childId]/map/page.tsx` — 달성 맵 (쌍둥이별)
  - `admin/page.tsx` — 관리 페이지 (벌크 추가, 템플릿, 날짜 복제)
- `src/components/` — UI 컴포넌트
  - `BadgeCard.tsx`, `BadgeModal.tsx` — 뱃지 표시/상세
  - `BottomNav.tsx` — 하단 네비게이션 (3탭)
  - `Calendar.tsx` — 달력 컴포넌트
  - `ConfettiEffect.tsx` — 올클리어 컨페티
  - `MapNode.tsx` — 달성 맵 노드
  - `PinModal.tsx` — PIN 인증 모달
  - `ProgressRing.tsx` — 달성률 링
  - `TaskForm.tsx` — 할일 추가 폼
  - `TaskItem.tsx` — 할일 항목
  - `Toast.tsx` — 토스트 알림
  - `TrophyShelf.tsx` — 트로피 셸프
- `src/hooks/` — 커스텀 훅 (useSession, useToast)
- `src/lib/` — 유틸리티
  - `constants.ts` — 아이 정보, PIN 등
  - `date.ts` — KST 날짜 유틸 (todayKST, toKSTDate)
  - `types.ts` — 타입 정의
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

### 달성 맵 (쌍둥이별)
- 17 노드, 최대 2500개 완료 기준 (9개월 × 10개/일)

### 재미 요소
- 올클리어 시 컨페티 애니메이션
- 달성률 기반 랜덤 응원 메시지 (perfect/good/start/zero)

## BottomNav 구조

3탭: 📋 할일 / 🏅 뱃지 / 🗺️ 달성맵

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

## 주의사항

- KST 타임존 (UTC+9) 일관 사용
- earnedAt은 UTC 저장, 날짜 비교는 반드시 KST 변환 (toKSTDate)
- React hooks 순서: 모든 hooks는 conditional return 전에 배치해야 함
