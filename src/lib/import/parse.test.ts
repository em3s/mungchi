import { describe, expect, it } from "vitest";
import { decodeFragment, parseBulkText } from "./parse";

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
