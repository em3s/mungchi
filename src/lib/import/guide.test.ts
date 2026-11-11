import { describe, expect, it } from "vitest";
import { buildGuideText } from "./guide";
import { decodeFragment, parseBulkText } from "./parse";
import { validateImport } from "./validate";

describe("buildGuideText", () => {
  const text = buildGuideText("https://example.test");
  it("mentions import url, limits, code block, and confirmation by the child", () => {
    expect(text).toContain("https://example.test/import#");
    expect(text).toContain("100");
    expect(text).toContain("encodeURIComponent");
    expect(text).toContain("```");
  });
  it("states the length limit", () => {
    expect(text).toContain("링크 약 200,000자, 붙여넣기 30,000자");
  });
  it("contains no secrets or token mentions", () => {
    expect(text).not.toMatch(/token|토큰|api.?key|999999|sihyun|\d{6}/i);
  });
  it("example links in the guide decode and validate", () => {
    const links = text.match(/https:\/\/example\.test\/import#\S+/g) ?? [];
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      const d = decodeFragment(link.slice(link.indexOf("#")));
      expect(d.ok, link).toBe(true);
      if (d.ok) expect(validateImport(parseBulkText(d.text)).ok, link).toBe(true);
    }
  });
  it("examples include a space-containing word and Korean meaning", () => {
    const links = text.match(/https:\/\/example\.test\/import#\S+/g) ?? [];
    const decoded = links.map((l) => decodeFragment(l.slice(l.indexOf("#")))).map((d) => (d.ok ? d.text : ""));
    expect(decoded.some((t) => /[a-z]+ [a-z]+ \|/.test(t))).toBe(true);
    expect(decoded.some((t) => /[가-힣]/.test(t))).toBe(true);
  });
});
