// Gemini 넣기 링크용 파서. 순수 모듈(화면·DB 없음).
import { Unzlib } from "fflate";

export type DecodeResult =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "broken" | "toolong" };

// 인코딩된 fragment 길이 상한(디코드·파싱 전에 거른다).
// 계산 근거: 100단어 x (단어 100자 + 뜻 200자 x 한글 3바이트 x %XX 3자 = 1,800자 + 구분 ~10자)
//   ≈ 190,000 + 제목 → 200,000 이면 정상 최대 입력을 담는다.
export const MAX_FRAGMENT_CHARS = 200_000;

// 압축 링크 `#z=<base64url(zlib(UTF-8 텍스트))>` 를 푼 결과 상한(바이트). 압축 폭탄 방지.
// 붙여넣기 상한 30,000자 x 한글 3바이트 + 여유.
export const MAX_INFLATED_BYTES = 120_000;

function adler32(buf: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function inflateZ(b64: string): DecodeResult {
  const broken = { ok: false, reason: "broken" } as const;
  if (!/^[A-Za-z0-9_-]+$/.test(b64)) return broken;
  let bin: string;
  try {
    const std = b64.replace(/-/g, "+").replace(/_/g, "/");
    bin = atob(std + "=".repeat((4 - (std.length % 4)) % 4));
  } catch {
    return broken;
  }
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  const chunks: Uint8Array[] = [];
  let total = 0;
  let tooBig = false;
  let done = false;
  const inf = new Unzlib((chunk, final) => {
    total += chunk.length;
    if (total > MAX_INFLATED_BYTES) tooBig = true;
    else chunks.push(chunk);
    if (final) done = true;
  });
  try {
    // 잘게 넣어 상한을 넘으면 바로 멈춘다.
    for (let i = 0; i < data.length && !tooBig; i += 1024) {
      inf.push(data.subarray(i, i + 1024), i + 1024 >= data.length);
    }
  } catch {
    return broken;
  }
  if (tooBig) return { ok: false, reason: "toolong" };
  if (!done) return broken;
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  // fflate 는 zlib 꼬리의 Adler-32 를 확인하지 않는다. 직접 확인해 한 글자 오류도 거른다.
  if (data.length < 6) return broken;
  const n = data.length;
  const want = ((data[n - 4] << 24) | (data[n - 3] << 16) | (data[n - 2] << 8) | data[n - 1]) >>> 0;
  if (adler32(out) !== want) return broken;
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(out) };
  } catch {
    return broken;
  }
}

// fragment(`#...`)를 디코드한다. 두 형식:
//  - `#z=<base64url>`: zlib 로 압축한 UTF-8 텍스트(링크가 3배쯤 짧다)
//  - 그 밖: encodeURIComponent 텍스트. `+` 는 공백으로 본다(`%2B` 는 + 로 남는다).
// 잘린 %인코딩·깨진 압축은 "broken", 내용이 없으면 "empty".
export function decodeFragment(hash: string): DecodeResult {
  const body = hash.startsWith("#") ? hash.slice(1) : hash;
  if (body === "") return { ok: false, reason: "empty" };
  if (body.length > MAX_FRAGMENT_CHARS) return { ok: false, reason: "toolong" };
  let text: string;
  if (body.startsWith("z=")) {
    const r = inflateZ(body.slice(2));
    if (!r.ok) return r;
    text = r.text;
  } else {
    try {
      text = decodeURIComponent(body.replace(/\+/g, " "));
    } catch {
      return { ok: false, reason: "broken" };
    }
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
