// Gemini 넣기 링크용 파서. 순수 모듈(화면·DB 없음).

export type DecodeResult =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "broken" | "toolong" };

// 인코딩된 fragment 길이 상한(디코드·파싱 전에 거른다).
// 계산 근거: 100단어 x (단어 100자 + 뜻 200자 x 한글 3바이트 x %XX 3자 = 1,800자 + 구분 ~10자)
//   ≈ 190,000 + 제목 → 200,000 이면 정상 최대 입력을 담는다.
export const MAX_FRAGMENT_CHARS = 200_000;

// fragment(`#...`)를 디코드한다. `+` 는 공백으로 본다(`%2B` 는 + 로 남는다).
// 잘린 %인코딩 등은 "broken", 내용이 없으면 "empty".
export function decodeFragment(hash: string): DecodeResult {
  const body = hash.startsWith("#") ? hash.slice(1) : hash;
  if (body === "") return { ok: false, reason: "empty" };
  if (body.length > MAX_FRAGMENT_CHARS) return { ok: false, reason: "toolong" };
  let text: string;
  try {
    text = decodeURIComponent(body.replace(/\+/g, " "));
  } catch {
    return { ok: false, reason: "broken" };
  }
  if (text.trim() === "") return { ok: false, reason: "empty" };
  return { ok: true, text };
}

export interface ParsedRow {
  line: number;
  word: string;
  meaning: string;
}

export interface LineError {
  line: number;
  text: string;
  reason: string;
}

export interface ParsedBulk {
  title: string;
  titleLine: number | null;
  rows: ParsedRow[];
  errors: LineError[];
}

const MAX_ERROR_TEXT = 80;

// 글자(코드 포인트) 단위로 자른다. 바이트 기준 아님.
function clip(s: string): string {
  const chars = Array.from(s);
  return chars.length > MAX_ERROR_TEXT ? chars.slice(0, MAX_ERROR_TEXT).join("") + "…" : s;
}

// 관리 페이지(AdminVocabSection)와 같은 형식: 첫 줄 `[제목]`, 이어서 `word | meaning`.
// line 은 원문의 1부터 시작하는 줄 번호(빈 줄 포함).
export function parseBulkText(raw: string): ParsedBulk {
  const all = raw.split(/\r?\n/).map((text, i) => ({ line: i + 1, text: text.trim() })).filter((l) => l.text !== "");
  let title = "";
  let titleLine: number | null = null;
  let body = all;
  const m = all[0]?.text.match(/^\[(.+)\]$/);
  if (m) {
    title = m[1].trim();
    titleLine = all[0].line;
    body = all.slice(1);
  }
  const rows: ParsedRow[] = [];
  const errors: LineError[] = [];
  for (const { line, text } of body) {
    const parts = text.split("|");
    if (parts.length < 2) {
      errors.push({ line, text: clip(text), reason: "`word | 뜻` 형식이 아니에요" });
      continue;
    }
    const word = parts[0].trim().toLowerCase();
    const meaning = parts.slice(1).join("|").trim();
    if (word && meaning) rows.push({ line, word, meaning });
    else errors.push({ line, text: clip(text), reason: "단어나 뜻이 비었어요" });
  }
  return { title, titleLine, rows, errors };
}
