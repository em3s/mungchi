import { describe, expect, it } from "vitest";
import { MAX_WORDS, validateWords } from "./validate";

const v = (title: string, pairs: [string, string][]) =>
  validateWords({ title, rows: pairs.map(([word, meaning], i) => ({ line: i + 1, word: word.trim().toLowerCase(), meaning })), errors: [] });

describe("validateWords", () => {
  it("accepts a normal list", () => {
    const r = v("Day 1", [["Apple", "사과"], ["look after", "돌보다"]]);
    expect(r).toMatchObject({ ok: true, title: "Day 1", errors: [] });
    expect(r.words).toEqual([{ word: "apple", meaning: "사과" }, { word: "look after", meaning: "돌보다" }]);
  });
  it("title 1-50 chars, counted by characters", () => {
    expect(v("", [["a", "b"]]).ok).toBe(false);
    expect(v("가".repeat(50), [["a", "b"]]).ok).toBe(true);
    expect(v("가".repeat(51), [["a", "b"]]).ok).toBe(false);
  });
  it("rejects control characters in title and meaning", () => {
    expect(v("a\u0000b", [["x", "y"]]).ok).toBe(false);
    expect(v("T", [["x", "a\tb"]]).ok).toBe(false);
    expect(v("T", [["x", "a\u007fb"]]).ok).toBe(false);
  });
  it("word pattern accepts worksheet notation", () => {
    for (const w of ["1abc", "a_b", "한글", "-a", "a<b", "/a", "x".repeat(101)]) {
      expect(v("T", [[w, "m"]]).ok, w).toBe(false);
    }
    for (const w of ["look after", "o'clock", "well-known", "etc.", "clutch / clutched", "wrap ↔ unwrap", "fling one's arms around ~", "(be) good at", "~ as well", "x".repeat(100)]) {
      expect(v("T", [[w, "m"]]).ok, w).toBe(true);
    }
  });
  it("meaning 1-200 chars", () => {
    expect(v("T", [["a", "x".repeat(200)]]).ok).toBe(true);
    expect(v("T", [["a", "x".repeat(201)]]).ok).toBe(false);
  });
  it("reports positions of bad words", () => {
    const r = v("T", [["good", "ok"], ["1bad", "m"], ["한글", "m"]]);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3]);
  });
  it("dedupes repeated words, keeping the first", () => {
    const r = v("T", [["Apple", "사과"], ["apple", "다른 뜻"], ["pear", "배"]]);
    expect(r.ok).toBe(true);
    expect(r.words).toEqual([{ word: "apple", meaning: "사과" }, { word: "pear", meaning: "배" }]);
    expect(r.duplicates).toEqual(["apple"]);
  });
  it(`at most ${MAX_WORDS} words`, () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => [`w${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`, "m"] as [string, string]);
    expect(v("T", many(MAX_WORDS)).ok).toBe(true);
    expect(v("T", many(MAX_WORDS + 1)).ok).toBe(false);
  });
  it("empty list is an error", () => {
    expect(v("T", []).ok).toBe(false);
  });
});
