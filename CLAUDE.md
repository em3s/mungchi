# mungchi (뭉치)

아이들 할일 관리 + 성과(달성) 시스템 프로젝트.

## 개요

Apple 미리알림(Reminders)의 두 목록을 기반으로 아이들의 일일 할일을 관리하고, 달성도를 추적하는 성과 관리 시스템.
메인 디바이스는 **iPad 9 (PWA)**.

## Apple 미리알림 목록

- **반짝별 수호자 - 시현**: 시현(딸)의 할일 목록
- **초코별 탐험가 - 미송**: 미송(아들)의 할일 목록
- 매일 아빠가 벌크로 할일을 추가함
- CLI 도구: `remindctl` (brew install steipete/tap/remindctl)
- 반복 미리알림은 remindctl이 다음 1회만 반환 → 매일 싱크로 누적

## 기술 스택

- **런타임**: Bun (TypeScript 내장 실행, tsx 불필요)
- **서버**: Hono (hono/bun 네이티브 서빙)
- **프론트엔드**: Preact + HTM (빌드 스텝 없음, ES 모듈로 직접 서빙)
- **데이터**: Apple 미리알림 = SSOT, `data/cache.json`으로 캐시
- **CLI**: `remindctl` (brew install steipete/tap/remindctl)
- **PWA**: manifest.json, iPad 9 반응형 대응 (min-width: 768px)

## 개발 명령어

- `bun install` — 의존성 설치
- `bun run dev` — 개발 서버 (watch 모드, http://localhost:3000)
- `bun run start` — 서버 시작

## 배포

- `deploy/start.sh start` — 프로덕션 서버 시작 (port 8080)
- `deploy/start.sh stop` — 중지
- `deploy/start.sh restart` — 재시작
- `deploy/start.sh status` — 상태 확인
- `deploy/start.sh logs` — 로그 보기

## remindctl 명령어

- `remindctl show all --list "반짝별 수호자 - 시현" --json` — 시현 할일 조회
- `remindctl show all --list "초코별 탐험가 - 미송" --json` — 미송 할일 조회
- `remindctl lists` — 전체 목록 조회

## 프로젝트 구조

- `server/` — Hono 서버 (TypeScript)
  - `index.ts` — 진입점 (Bun 네이티브 export default)
  - `config.ts` — 아이 정보, 경로, 설정
  - `routes/api.ts` — REST API
  - `lib/date.ts` — 공통 날짜 유틸 (todayKST, toKSTDate)
  - `sync/` — remindctl 싱크 엔진 (5분 간격 setInterval)
  - `badges/` — 뱃지 평가 엔진
    - `definitions.ts` — 64개+ 뱃지 정의 (daily/streak/milestone/weekly/special + 히든)
    - `engine.ts` — 싱크 시점에 조건 평가 → badges.json 저장
- `public/` — 정적 프론트엔드 (빌드 없음)
  - `js/pages/Dashboard.js` — 메인 페이지 (달력 + 달성률 + 할일)
  - `js/pages/Badges.js` — 뱃지 컬렉션 (트로피 셸프, 모달)
  - `js/pages/Map.js` — 달성 맵
  - `js/components/` — ProgressRing, TaskItem, BottomNav, Toast
  - `vendor/` — vendored ES 모듈 (preact, htm)
- `data/` — (gitignored) 런타임 캐시/뱃지 데이터
- `deploy/` — 프로덕션 배포 스크립트

## 성과 시스템

### 뱃지
- 64개+ 뱃지 (daily 8, streak 13, milestone 30, weekly 3, special 5, hidden 5)
- 등급: common, rare, epic, legendary
- 반복 획득 가능 뱃지 있음
- 히든 뱃지: 획득 전엔 목록에 미노출
- 싱크 시점에 동적 평가 (실시간 X)
- 트로피 셸프: 💎×1000 👑×100 🏆×10 🏅×1 시각화

### 달성 맵
- 17 노드, 최대 2500개 완료 기준 (9개월 × 10개/일)

### 재미 요소
- 올클리어 시 컨페티 애니메이션
- 달성률 기반 랜덤 응원 메시지 (perfect/good/start/zero)

## BottomNav 구조

3탭: 📋 할일 / 🏅 뱃지 / 🗺️ 달성맵

## 주의사항

- KST 타임존 (UTC+9) 일관 사용
- 싱크 버튼 5초 throttle
- Preact hooks 순서: 모든 hooks는 conditional return 전에 배치해야 함
