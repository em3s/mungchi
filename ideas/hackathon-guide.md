---
title: 뭉치 빌더스 데이
---

<style>
  body {
    font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: #222;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;
  }
  h1 { font-size: 28px; color: #6c5ce7; margin-bottom: 4px; }
  h2 { font-size: 18px; color: #6c5ce7; border-bottom: 2px solid #6c5ce7; padding-bottom: 4px; margin-top: 32px; }
  h3 { font-size: 15px; color: #444; margin-top: 20px; }
  blockquote {
    background: #f0eeff;
    border-left: 4px solid #6c5ce7;
    margin: 12px 0;
    padding: 10px 16px;
    border-radius: 0 8px 8px 0;
    font-style: normal;
    color: #333;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
  }
  th {
    background: #6c5ce7;
    color: white;
    padding: 8px 12px;
    text-align: left;
  }
  td {
    border: 1px solid #ddd;
    padding: 8px 12px;
  }
  tr:nth-child(even) td { background: #f9f9f9; }
  .card {
    border: 2px dashed #aaa;
    border-radius: 12px;
    padding: 16px 20px;
    margin: 16px 0;
    background: #fafafa;
  }
  .card-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
  }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 16px 0;
  }
  .box {
    border: 2px solid #ddd;
    border-radius: 10px;
    padding: 14px;
    min-height: 120px;
  }
  .box-label {
    font-size: 11px;
    font-weight: bold;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 10px 0;
  }
  .step-num {
    background: #6c5ce7;
    color: white;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 13px;
    flex-shrink: 0;
  }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
  }
  .badge-easy { background: #d4edda; color: #155724; }
  .badge-normal { background: #fff3cd; color: #856404; }
  .badge-hard { background: #f8d7da; color: #721c24; }
  code {
    background: #f0eeff;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  hr { border: none; border-top: 1px solid #eee; margin: 28px 0; }
  @media print {
    body { padding: 0; }
    h2 { page-break-before: auto; }
    .no-break { page-break-inside: avoid; }
  }
</style>

# 🏗️ 뭉치 빌더스 데이

**가족 해커톤 가이드북** · 아빠 + 시현 + 미송

---

## 해커톤이 뭐야?

> **짧은 시간 안에 아이디어를 실제로 만들어내는 것.**
>
> 오늘은 우리가 쓰는 앱 **뭉치**에 새 기능을 직접 추가한다.
> 아이들은 기획자, 아빠는 개발자.

| 역할 | 담당 | 도구 |
|------|------|------|
| 기획자 · 디자이너 | 시현, 미송 | 종이 + 펜 |
| 개발자 | 아빠 | 컴퓨터 |
| 테스터 | 시현, 미송 | iPad |

---

## 오늘 일정

| 시간 | 내용 |
|------|------|
| 10:00 | **1라운드 시작** — 아빠가 해커톤을 보여준다 |
| 10:45 | **중간 쉬는 시간** — 간식 🍪 |
| 11:00 | **2라운드** — 너희가 직접 기획 |
| 12:30 | **점심** |
| 13:30 | **3라운드** (여유 있으면) |
| 15:00 | **최종 데모** — 엄마한테 발표! |

---

## 1라운드: 아빠가 보여주는 해커톤

*처음 해보는 거니까, 아빠가 먼저 한 번 보여줄게.*
*너희는 딱 하나만 결정해줘.*

<div class="no-break">

### 📋 1단계 — 요구사항 (5분)

> "지금 뭉치 켜봐. 기분 표시하는 거 있어? **없지?**
> 오늘 우리가 만들 거야.
> '오늘 내 기분을 앱에 표시하는 기능'."

**너희가 결정할 것 딱 하나:**

<div class="card">
<div class="card-title">🎯 어떤 이모지를 고를 수 있게 할까? 5개만 골라줘.</div>

| 번호 | 이모지 | 뜻 |
|------|--------|-----|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |

</div>

</div>

<div class="no-break">

### ✏️ 2단계 — 설계 (5분)

아빠가 종이에 그려서 설명:

```
    지금 뭉치              만들고 나면
  ┌────────────┐         ┌────────────┐
  │ 안녕 시현아 │         │ 안녕 시현아 │
  │            │   →     │ 오늘 기분:  │
  │  할일 목록  │         │    😊      │
  │   ...      │         │  할일 목록  │
  └────────────┘         └────────────┘
```

> "이렇게 생기게 만들 거야. 이게 **설계**야."

</div>

<div class="no-break">

### 💻 3단계 — 개발 (20분)

> "이제 아빠가 만들게. 옆에서 봐도 되고, 뭉치 해도 돼."

중간에 한 번 설명:
> "이 줄이 방금 너희가 고른 이모지들이야."

</div>

<div class="no-break">

### 🧪 4단계 — 테스트 (5분)

완성되면 아이들이 직접 탭해봄.

> "버그 있어? 이상한 거 있어? **테스트**해봐."

버그 발견 → 종이에 적어서 아빠에게 줌 → 아빠가 고침.
이게 **QA(품질 검사)**야.

</div>

<div class="no-break">

### 🎉 5단계 — 완성!

> "이게 해커톤이야.
> 요구사항 → 설계 → 개발 → 테스트 → 완성.
>
> **2라운드는 너희가 요구사항이랑 설계를 해.**
> 종이랑 펜 줄게 — 뭉치에 뭘 넣고 싶은지 그려봐."

</div>

---

## 2라운드부터: 기획 카드 (아이들용)

*아래 양식을 복사해서 아이들에게 1장씩 줘.*

<div class="card no-break">
<div class="card-title">📝 우리가 만들 기능</div>

**기능 이름:**
&nbsp;
&nbsp;

**왜 있으면 좋아요?**
&nbsp;
&nbsp;

<div class="two-col">
  <div class="box">
    <div class="box-label">지금 모습</div>
    &nbsp;
    &nbsp;
    &nbsp;
    &nbsp;
  </div>
  <div class="box">
    <div class="box-label">만들고 난 모습 (꿈)</div>
    &nbsp;
    &nbsp;
    &nbsp;
    &nbsp;
  </div>
</div>

**초코 보상은 몇 개?** 🍪 \_\_\_개

</div>

---

## 아이디어 메뉴판

*아이들이 고르기 어려우면 이 카드들을 보여줘.*

<div class="two-col">

<div class="card no-break">
<div class="card-title">💌 응원 메시지 보드</div>

가족끼리 짧은 응원 메시지 남기기.
내 화면에 오늘 메시지 1개 표시.

**만드는 시간** ⚡ 빠름
</div>

<div class="card no-break">
<div class="card-title">🏅 내가 만든 뱃지</div>

내가 조건을 직접 정하는 특별 뱃지.
이름, 이모지, 달성 조건 모두 내 맘대로.

**만드는 시간** ⏱ 보통
</div>

<div class="card no-break">
<div class="card-title">🎨 나만의 배경 색</div>

내 화면 색깔을 직접 고른다.
고르면 바로 적용.

**만드는 시간** ⚡ 빠름
</div>

<div class="card no-break">
<div class="card-title">🎮 새 미니게임</div>

두더지/공룡 말고 새 게임 하나 더.
규칙, 점수 체계 내가 설계.

**만드는 시간** 🐢 오래 걸림
</div>

</div>

---

## 아빠용 운영 팁

**말문이 막힐 때**
> "A랑 B 중에 뭐가 더 재미있어?" — 열린 질문 대신 고르기

**의견이 충돌할 때**
> 가위바위보. 또는 둘 다 만들기 (간단한 거면 가능).

**불가능한 걸 원할 때**
> "그건 다음 해커톤 때!" 라고 카드에 메모. 진짜 다음에 해주기.

**지루해할 때**
> 아빠 코딩하는 화면 옆에서 보게 하기.
> "이 줄이 네가 고른 색이야" — 가볍게 설명. 신기해함.

---

*뭉치 빌더스 데이 · made with ❤️ by 아빠*
