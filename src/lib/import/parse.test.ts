import { describe, expect, it } from "vitest";
import { strToU8, zlibSync } from "fflate";
import { MAX_FRAGMENT_CHARS, MAX_INFLATED_BYTES, decodeFragment, parseBulkText } from "./parse";

const enc = encodeURIComponent;

describe("decodeFragment", () => {
  it("decodes encodeURIComponent output with leading #", () => {
    const text = "[Day 1]\nlook after | 돌보다\napple | 사과";
    expect(decodeFragment("#" + enc(text))).toEqual({ ok: true, text });
  });
  it("works without leading #", () => {
    expect(decodeFragment(enc("[a]\nb | c"))).toEqual({ ok: true, text: "[a]\nb | c" });
  });
  it("treats + and %20 both as space", () => {
    expect(decodeFragment("#a+b%20c")).toEqual({ ok: true, text: "a b c" });
  });
  it("keeps encoded plus (%2B) as a plus", () => {
    expect(decodeFragment("#c%2B%2B")).toEqual({ ok: true, text: "c++" });
  });
  it("decodes Korean", () => {
    expect(decodeFragment("#" + enc("사과"))).toEqual({ ok: true, text: "사과" });
  });
  it("fails on truncated percent-encoding", () => {
    const full = enc("[T]\napple | 사과");
    const cut = full.slice(0, full.length - 2); // 마지막 %XX 를 중간에서 자름
    const r = decodeFragment("#" + cut);
    expect(r.ok).toBe(false);
  });
  it("fails on lone %", () => {
    expect(decodeFragment("#100%").ok).toBe(false);
  });
  it("empty / missing fragment is a distinct 'empty' result", () => {
    expect(decodeFragment("")).toEqual({ ok: false, reason: "empty" });
    expect(decodeFragment("#")).toEqual({ ok: false, reason: "empty" });
    expect(decodeFragment("#%20%0A")).toEqual({ ok: false, reason: "empty" });
  });
  it("over-long fragment is rejected before decoding", () => {
    expect(decodeFragment("#" + "a".repeat(MAX_FRAGMENT_CHARS + 1))).toEqual({ ok: false, reason: "toolong" });
    expect(decodeFragment("#" + "a".repeat(MAX_FRAGMENT_CHARS)).ok).toBe(true);
  });
  it("a worst-case valid import (100 words, 200 Korean chars each) fits the cap", () => {
    const body = Array.from({ length: 100 }, (_, i) => `${"a".repeat(60)}${String(i).padStart(4, "b")} | ${"가".repeat(200)}`).join("\n");
    expect(encodeURIComponent("[" + "가".repeat(50) + "]\n" + body).length).toBeLessThanOrEqual(MAX_FRAGMENT_CHARS);
  });
  it("invalid sequences report reason 'broken'", () => {
    expect(decodeFragment("#%E0%A4%A")).toEqual({ ok: false, reason: "broken" });
  });
});

describe("parseBulkText", () => {
  it("parses title and rows with line numbers", () => {
    const r = parseBulkText("[Day 1]\napple | 사과\n\n Book |책 \ncat|고양이|새끼");
    expect(r.title).toBe("Day 1");
    expect(r.rows).toEqual([
      { line: 2, word: "apple", meaning: "사과" },
      { line: 4, word: "book", meaning: "책" },
      { line: 5, word: "cat", meaning: "고양이|새끼" },
    ]);
    expect(r.errors).toEqual([]);
  });
  it("collects malformed lines", () => {
    const r = parseBulkText("[T]\nnopipe\n | 뜻\nword | ");
    expect(r.rows).toEqual([]);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4]);
    expect(r.errors.every((e) => e.reason.length > 0)).toBe(true);
  });
  it("no title line → empty title, first line treated as a word row", () => {
    const r = parseBulkText("apple | 사과");
    expect(r.title).toBe("");
    expect(r.rows).toHaveLength(1);
  });
  it("handles CRLF", () => {
    expect(parseBulkText("[T]\r\na | b\r\n").rows).toEqual([{ line: 2, word: "a", meaning: "b" }]);
  });
  it("truncates long error line text by characters, not bytes", () => {
    const r = parseBulkText("[T]\n" + "가".repeat(200));
    expect(Array.from(r.errors[0].text).length).toBeLessThanOrEqual(81);
    expect(r.errors[0].text).not.toContain("�");
  });
});

describe("decodeFragment compressed (#z=)", () => {
  // Python 과 같은 방식: base64url(zlib.compress(text.encode("utf-8"), 9)), = 없음
  const z = (t: string) =>
    "#z=" + Buffer.from(zlibSync(strToU8(t), { level: 9 })).toString("base64url");
  const text = "[Anne of Green Gables]\nclutch / clutched | 움켜잡다 / 움켜잡았다\nfling one's arms around ~ | ~에게 달려들다";

  it("round-trips Korean text", () => {
    expect(decodeFragment(z(text))).toEqual({ ok: true, text });
  });
  it("accepts the Python output (with padding stripped)", () => {
    // python3: base64.urlsafe_b64encode(zlib.compress("[T]\na | 가".encode(), 9)).decode().rstrip("=")
    const py = Buffer.from(zlibSync(strToU8("[T]\na | 가"), { level: 9 })).toString("base64url");
    expect(decodeFragment("#z=" + py)).toEqual({ ok: true, text: "[T]\na | 가" });
  });
  it("one changed character is detected as broken", () => {
    const h = z(text);
    const i = Math.floor(h.length / 2);
    const bad = h.slice(0, i) + (h[i] === "A" ? "B" : "A") + h.slice(i + 1);
    expect(decodeFragment(bad).ok).toBe(false);
  });
  it("truncated or non-base64 is broken", () => {
    expect(decodeFragment(z(text).slice(0, 30))).toEqual({ ok: false, reason: "broken" });
    expect(decodeFragment("#z=abc$%")).toEqual({ ok: false, reason: "broken" });
    expect(decodeFragment("#z=")).toEqual({ ok: false, reason: "broken" });
  });
  it("rejects a decompression bomb", () => {
    expect(decodeFragment(z("a".repeat(MAX_INFLATED_BYTES + 1)))).toEqual({ ok: false, reason: "toolong" });
  });
});
