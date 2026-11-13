// 단어 목록 검사(AI 커넥터 add_words 가 쓴다). 순수 모듈(화면·DB 없음).

export const MAX_WORDS = 100;

export interface WordRow {
  line: number; // 단어 순서(1부터)
  word: string;
  meaning: string;
}

export interface LineError {
  line: number; // 0 은 특정 단어가 아닌 전체 오류
  text: string;
  reason: string;
}

export interface WordList {
  title: string;
  rows: WordRow[];
  errors: LineError[]; // 모양 오류(빈 단어·뜻 등)
}

const MAX_TITLE = 50;
const MAX_WORD = 100;
const MAX_MEANING = 200;
// 영어로 시작(또는 ~ ( 로 시작). 시험지 표기(clutch / clutched, wrap ↔ unwrap, fling one's arms around ~)를 받는다.
const WORD_PATTERN = /^[a-z~(][a-z0-9 '’.,!?&;:()/~↔-]*$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export interface WordCheck {
  ok: boolean;
  title: string;
  words: { word: string; meaning: string }[];
  duplicates: string[];
  errors: LineError[];
}

// 글자 수(코드 포인트)로 센다. 바이트 길이가 아니다.
const len = (s: string) => Array.from(s).length;

function clip(s: string): string {
  const c = Array.from(s);
  return c.length > 80 ? c.slice(0, 80).join("") + "…" : s;
}

// 오류를 모두 모아 돌려준다. 하나라도 있으면 ok=false(아무것도 넣지 않는다).
export function validateWords(parsed: WordList): WordCheck {
  const errors: LineError[] = [...parsed.errors];
  const title = parsed.title.trim();
  if (len(title) < 1 || len(title) > MAX_TITLE) {
    errors.push({ line: 0, text: clip(title), reason: `제목은 1~${MAX_TITLE}자` });
  } else if (CONTROL.test(title)) {
    errors.push({ line: 0, text: clip(title), reason: "제목에 제어문자가 있어요" });
  }

  const seen = new Set<string>();
  const duplicates: string[] = [];
  const dupSeen = new Set<string>();
  const words: { word: string; meaning: string }[] = [];
  for (const r of parsed.rows) {
    let bad = false;
    if (len(r.word) > MAX_WORD) {
      errors.push({ line: r.line, text: clip(r.word), reason: `단어는 ${MAX_WORD}자 이하` });
      bad = true;
    } else if (!WORD_PATTERN.test(r.word)) {
      errors.push({ line: r.line, text: clip(r.word), reason: "단어는 영어·숫자·공백과 ' . , - / ~ ↔ ( ) ! ? & ; : 만 가능(첫 글자는 영어)" });
      bad = true;
    }
    if (len(r.meaning) > MAX_MEANING) {
      errors.push({ line: r.line, text: clip(r.word), reason: `뜻은 ${MAX_MEANING}자 이하` });
      bad = true;
    } else if (CONTROL.test(r.meaning)) {
      errors.push({ line: r.line, text: clip(r.word), reason: "뜻에 제어문자가 있어요" });
      bad = true;
    }
    if (bad) continue;
    if (seen.has(r.word)) {
      if (!dupSeen.has(r.word)) {
        dupSeen.add(r.word);
        duplicates.push(r.word);
      }
      continue;
    }
    seen.add(r.word);
    words.push({ word: r.word, meaning: r.meaning });
  }

  if (words.length === 0 && errors.length === 0) {
    errors.push({ line: 0, text: "", reason: "단어가 없어요" });
  }
  if (words.length > MAX_WORDS) {
    errors.push({ line: 0, text: "", reason: `단어는 한 번에 ${MAX_WORDS}개까지(지금 ${words.length}개)` });
  }
  errors.sort((a, b) => a.line - b.line);
  return { ok: errors.length === 0, title, words, duplicates, errors };
}
