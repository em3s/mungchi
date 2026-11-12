import { parseBulkText, type LineError, type ParsedBulk } from "./parse";

export const MAX_IMPORT_WORDS = 100;
// 100개 x (단어 100 + 뜻 200 + 구분) + 제목 정도. 넘으면 파싱 전에 거절한다.
export const MAX_IMPORT_CHARS = 30_000;
const MAX_TITLE = 50;
const MAX_WORD = 100;
const MAX_MEANING = 200;
// 영어로 시작(또는 ~ ( 로 시작). 시험지 표기(clutch / clutched, wrap ↔ unwrap, fling one's arms around ~)를 받는다.
const WORD_PATTERN = /^[a-z~(][a-z0-9 '’.,!?&;:()/~↔-]*$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export interface ImportCheck {
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

// 검사 규칙은 이전 안의 서버 validate 와 같다(단어 상한만 100).
// 줄별 오류(line 0 은 줄 없는 전체 오류)를 모아 돌려준다. 하나라도 있으면 ok=false.
export function validateImport(parsed: ParsedBulk): ImportCheck {
  const errors: LineError[] = [...parsed.errors];
  const title = parsed.title.trim();
  if (parsed.titleLine === null) {
    errors.push({ line: 0, text: "", reason: "첫 줄에 [단어장 제목] 이 필요해요" });
  } else if (len(title) < 1 || len(title) > MAX_TITLE) {
    errors.push({ line: parsed.titleLine, text: clip(title), reason: `제목은 1~${MAX_TITLE}자` });
  } else if (CONTROL.test(title)) {
    errors.push({ line: parsed.titleLine, text: clip(title), reason: "제목에 제어문자가 있어요" });
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
  if (words.length > MAX_IMPORT_WORDS) {
    errors.push({ line: 0, text: "", reason: `단어는 한 번에 ${MAX_IMPORT_WORDS}개까지(지금 ${words.length}개)` });
  }
  errors.sort((a, b) => a.line - b.line);
  return { ok: errors.length === 0, title, words, duplicates, errors };
}

/** 원문 전체 검사. 너무 길면 파싱하지 않고 거절한다(화면 멈춤 방지). */
export function analyzeImport(raw: string): ImportCheck {
  if (raw.length > MAX_IMPORT_CHARS) {
    return {
      ok: false,
      title: "",
      words: [],
      duplicates: [],
      errors: [{ line: 0, text: "", reason: `내용이 너무 길어요(${MAX_IMPORT_CHARS.toLocaleString("en-US")}자 이하). 나눠서 넣어 주세요` }],
    };
  }
  return validateImport(parseBulkText(raw));
}
