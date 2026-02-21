# mungchi (뭉치)

아이들 할일 관리 + 성과(달성) 시스템 프로젝트.

## 개요

Apple 미리알림(Reminders)의 두 목록을 기반으로 아이들의 일일 할일을 관리하고, 달성도를 추적하는 성과 관리 시스템.

## Apple 미리알림 목록

- **반짝별 수호자 - 시현**: 시현(딸)의 할일 목록
- **초코별 탐험가 - 미송**: 미송(아들)의 할일 목록
- 매일 아빠가 벌크로 할일을 추가함
- CLI 도구: `remindctl` (brew install steipete/tap/remindctl)

## 성과 관리 시스템

- 뱃지 시스템: 할일 달성에 따른 뱃지 부여
- 달성 맵: 진행도/성장을 시각적으로 보여주는 맵
- 일일/주간/월간 달성률 추적

## 기술 스택

- **서버**: Node.js + Hono (경량 웹 프레임워크) + tsx (TypeScript 실행)
- **프론트엔드**: Preact + HTM (빌드 스텝 없음, ES 모듈로 직접 서빙)
- **데이터**: Apple 미리알림 = SSOT, `data/cache.json`으로 캐시
- **CLI**: `remindctl` (brew install steipete/tap/remindctl)
- **PWA**: manifest.json + service worker

## 개발 명령어

- `npm install` — 의존성 설치
- `npm run dev` — 개발 서버 (watch 모드, http://localhost:3000)
- `npm start` — 서버 시작

## remindctl 명령어

- `remindctl list "반짝별 수호자 - 시현"` — 시현 할일 조회
- `remindctl list "초코별 탐험가 - 미송"` — 미송 할일 조회
- `remindctl lists` — 전체 목록 조회

## 프로젝트 구조

- `server/` — Hono 서버 (TypeScript)
  - `index.ts` — 진입점
  - `config.ts` — 아이 정보, 경로
  - `routes/api.ts` — REST API
  - `sync/` — remindctl 싱크 엔진
  - `badges/` — 뱃지 평가 엔진
- `public/` — 정적 프론트엔드 (빌드 없음)
  - `js/` — Preact + HTM 앱
  - `vendor/` — vendored ES 모듈 (preact, htm)
- `data/` — (gitignored) 런타임 캐시/뱃지 데이터
