import { describe, expect, it } from "vitest";
import { resolveOrigin } from "./origin";

const h = (m: Record<string, string>) => (n: string) => m[n] ?? null;

describe("resolveOrigin", () => {
  it("prefers SITE_URL env", () => {
    expect(resolveOrigin(h({ host: "evil.test" }), "https://mungchi.example/")).toBe("https://mungchi.example");
  });
  it("ignores malformed site url", () => {
    expect(resolveOrigin(h({ host: "a.test" }), "javascript:alert(1)")).toBe("https://a.test");
  });
  it("uses x-forwarded-host/proto over host", () => {
    expect(resolveOrigin(h({ "x-forwarded-host": "pub.test", "x-forwarded-proto": "https", host: "localhost:3000" }), undefined)).toBe("https://pub.test");
  });
  it("takes the first of comma-separated forwarded values", () => {
    expect(resolveOrigin(h({ "x-forwarded-host": "pub.test, internal", "x-forwarded-proto": "https, http" }), undefined)).toBe("https://pub.test");
  });
  it("localhost defaults to http, others to https", () => {
    expect(resolveOrigin(h({ host: "localhost:3000" }), undefined)).toBe("http://localhost:3000");
    expect(resolveOrigin(h({ host: "app.test" }), undefined)).toBe("https://app.test");
  });
  it("rejects odd host values and falls back to localhost (no request url)", () => {
    expect(resolveOrigin(h({ host: "a.test/evil path" }), undefined)).toBe("http://localhost:3000");
    expect(resolveOrigin(h({ host: "a b" }), undefined)).toBe("http://localhost:3000");
  });
  it("x-forwarded-host wins over host; bad forwarded falls to host", () => {
    expect(resolveOrigin(h({ "x-forwarded-host": "bad host", host: "ok.test" }), undefined)).toBe("https://ok.test");
  });
});
