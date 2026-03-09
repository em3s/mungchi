# 오늘의 단어장 — 날짜 시드 랜덤

## 변경 파일 (2개만)

### 1. `src/lib/vocab.ts` — 시드 랜덤 + getDailyWords 추가
- `hashSeed(seed)`: djb2 해시 → 32bit 정수
- `mulberry32(seed)`: 시드 기반 PRNG
- `getDailyWords(userId, date)`: STATIC_DICT에서 10개 결정론적 선택 → VocabEntry[] 반환
- `DAILY_LIST_ID = "daily"` 센티널 상수

### 2. `src/app/[childId]/vocab/page.tsx` — UI 통합
- home 뷰 상단에 "🌅 오늘의 단어장" 카드 (기존 리스트 위)
  - 단어장 보기 (list 뷰, 읽기전용)
  - 객관식/스펠링 퀴즈 버튼
- `handleStartDailyQuiz(type)`: 동기 함수, DB 불필요
- `handleOpenDailyList()`: 읽기전용 list 뷰
- list 뷰: `isDailyList` 체크 → 추가/삭제/편집/스펠링 토글 숨김
- `handleQuizComplete`: daily면 `saveQuizResult` 스킵 (UUID 아니라 DB 에러), 초코 보상은 정상 지급

## DB 변경 없음
