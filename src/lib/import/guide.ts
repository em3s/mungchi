import { MAX_FRAGMENT_CHARS } from "./parse";
import { MAX_IMPORT_CHARS, MAX_IMPORT_WORDS } from "./validate";

// Gemini 같은 AI 가 읽는 공개 지침. 비밀값은 넣지 않는다.
// 예시 링크는 encodeURIComponent 로 만들어 항상 올바른 인코딩이 되게 한다.
export function buildGuideText(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  const ex1 = "[Day 1]\napple | 사과\nlook after | 돌보다";
  const ex2 = "[동물 단어]\nwell-known | 유명한\no'clock | ~시 정각";
  const link = (t: string) => `${base}/import#${encodeURIComponent(t)}`;

  return `# 뭉치 단어장에 단어 넣기 — 지침

이 지침은 AI(Gemini 등)가 아이의 요청("뭉치 단어장에 넣어 줘")을 처리할 때 따르는 방법입니다.
AI 는 단어를 직접 저장할 수 없습니다. 대신 "넣기 링크"를 만들어 아이에게 줍니다.
아이가 링크를 탭하면 뭉치 앱이 열려 미리보기를 보여 주고, 아이가 비밀번호를 입력하고 [넣기]를 눌러야만 단어가 들어갑니다.

## 1. 단어 목록을 이 형식의 텍스트로 만듭니다

첫 줄은 [단어장 제목], 그다음 줄마다 "영어단어 | 한글 뜻" 입니다.

${ex1}

규칙
- 제목: 1~50자
- 영어 단어: 영어로 시작, 영어·숫자·공백과 ' . , - / ~ ↔ ( ) ! ? & ; : 만 가능 (예: look after, clutch / clutched, wrap ↔ unwrap, fling one's arms around ~). 100자 이하
- 뜻: 1~200자
- 한 번에 ${MAX_IMPORT_WORDS}개까지. 더 많으면 단어장을 나눠 링크를 여러 개 만듭니다
- 링크가 너무 길면 앱이 받지 않아요(링크 약 ${MAX_FRAGMENT_CHARS.toLocaleString("en-US")}자, 붙여넣기 ${MAX_IMPORT_CHARS.toLocaleString("en-US")}자). 그러면 단어장을 나눠 링크를 여러 개 만드세요
- 같은 단어가 반복되면 첫 번째만 들어갑니다
- 이미 있는 단어는 앱이 건너뜁니다

## 2. 넣기 링크를 만듭니다

링크 = ${base}/import# + encodeURIComponent(위 텍스트 전체)

줄바꿈, 공백, 한글, | 는 모두 인코딩해야 합니다. 머리로 계산하지 말고 코드를 실행해서 만드세요(Python: urllib.parse.quote(text, safe=""), JavaScript: encodeURIComponent(text)).
(공백은 %20, 줄바꿈은 %0A, | 는 %7C, 한글은 %XX%XX%XX 형태)

예시 1 (공백이 있는 단어, 한글 뜻):
텍스트:
${ex1}
링크:
${link(ex1)}

예시 2:
텍스트:
${ex2}
링크:
${link(ex2)}

## 3. 아이에게 이렇게 답합니다

- 넣기 링크를 보여 주고, "링크를 탭한 뒤 앱에서 내용을 확인하고 비밀번호를 입력하면 들어가요"라고 안내합니다
- 링크와 함께 같은 텍스트(1번 형식)를 코드 블록으로도 보여 주세요. 링크가 안 열리거나 깨지면 아이가 텍스트를 복사해 ${base}/import 의 붙여넣기 칸에 넣을 수 있습니다

\`\`\`
${ex1}
\`\`\`

## 주의

- AI 가 단어를 직접 저장하거나 확정할 수 없습니다. 아이가 앱에서 확인하고 직접 [넣기]를 눌러야 합니다
- 아이에게 비밀번호를 묻거나 대신 입력하지 마세요
`;
}
