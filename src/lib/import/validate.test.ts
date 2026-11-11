import { describe, expect, it } from "vitest";
import { parseBulkText } from "./parse";
import { MAX_IMPORT_CHARS, MAX_IMPORT_WORDS, analyzeImport, validateImport } from "./validate";

const v = (raw: string) => validateImport(parseBulkText(raw));

describe("validateImport", () => {
  it("accepts a normal list", () => {
    const r = v("[Day 1]\nApple | 사과\nlook after | 돌보다");
    expect(r.ok).toBe(true);
    expect(r.title).toBe("Day 1");
    expect(r.words).toEqual([
      { word: "apple", meaning: "사과" },
      { word: "look after", meaning: "돌보다" },
    ]);
    expect(r.errors).toEqual([]);
  });
  it("requires a title of 1-50 chars (Korean counted by characters)", () => {
    expect(v("apple | 사과").ok).toBe(false);
    expect(v("[" + "가".repeat(50) + "]\na | b").ok).toBe(true);
    expect(v("[" + "가".repeat(51) + "]\na | b").ok).toBe(false);
  });
  it("rejects control characters in title and meaning", () => {
    expect(v("[a\u0000b]\nx | y").ok).toBe(false);
    expect(v("[T]\nx | a\tb").ok).toBe(false);
    expect(v("[T]\nx | a\u007fb").ok).toBe(false);
  });
  it("word pattern", () => {
    for (const w of ["1abc", "a_b", "한글", "-a", "a/b", "x".repeat(65)]) {
      expect(v(`[T]\n${w} | m`).ok, w).toBe(false);
    }
    for (const w of ["look after", "o'clock", "well-known", "etc.", "Apple"]) {
      expect(v(`[T]\n${w} | m`).ok, w).toBe(true);
    }
  });
  it("meaning 1-200 chars", () => {
    expect(v("[T]\na | " + "x".repeat(200)).ok).toBe(true);
    expect(v("[T]\na | " + "x".repeat(201)).ok).toBe(false);
  });
  it("reports error lines with line numbers, including parse errors", () => {
    const r = v("[T]\ngood | ok\n1bad | m\nnopipe");
    expect(r.ok).toBe(false);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4]);
  });
  it("dedupes repeated words keeping the first and reports them", () => {
    const r = v("[T]\nApple | 사과\napple | 다른 뜻\npear | 배");
    expect(r.words).toEqual([{ word: "apple", meaning: "사과" }, { word: "pear", meaning: "배" }]);
    expect(r.duplicates).toEqual(["apple"]);
    expect(r.ok).toBe(true);
  });
  it("1-100 words", () => {
    expect(MAX_IMPORT_WORDS).toBe(100);
    const mk = (n: number) =>
      "[T]\n" + Array.from({ length: n }, (_, i) => `w${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))} | m`).join("\n");
    expect(v(mk(100)).ok).toBe(true);
    expect(v(mk(101)).ok).toBe(false);
    expect(v("[T]").ok).toBe(false);
  });
});

describe("analyzeImport", () => {
  it("rejects over-long input without parsing", () => {
    const r = analyzeImport("[T]\n" + "a | b\n".repeat(MAX_IMPORT_CHARS));
    expect(r.ok).toBe(false);
    expect(r.errors[0].reason).toContain("너무 길어요");
  });
  it("is fast for many duplicate words within the limit", () => {
    const raw = "[T]\n" + "apple | 사과\n".repeat(2000);
    const t = Date.now();
    const r = analyzeImport(raw);
    expect(Date.now() - t).toBeLessThan(500);
    expect(r.duplicates).toEqual(["apple"]);
    expect(r.ok).toBe(true);
  });
  it("accepts normal input like validateImport", () => {
    expect(analyzeImport("[T]\na | b").ok).toBe(true);
  });
});
