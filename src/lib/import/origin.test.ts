import { describe, expect, it } from "vitest";
import { resolveOrigin } from "./origin";

const h = (m: Record<string, string>) => (n: string) => m[n] ?? null;

describe("resolveOrigin", () => {
  it("prefers SITE_URL env", () => {
    expect(resolveOrigin(h({ host: "evil.test" }), undefined, "https://mungchi.example/")).toBe("https://mungchi.example");
  });
  it("ignores malformed SITE_URL", () => {
    expect(resolveOrigin(h({ host: "a.test" }), undefined, "javascript:alert(1)")).toBe("https://a.test");
  });
  it("uses x-forwarded-host/proto over host", () => {
    expect(resolveOrigin(h({ "x-forwarded-host": "pub.test", "x-forwarded-proto": "https", host: "localhost:3000" }), undefined, undefined)).toBe("https://pub.test");
  });
  it("takes the first of comma-separated forwarded values", () => {
    expect(resolveOrigin(h({ "x-forwarded-host": "pub.test, internal", "x-forwarded-proto": "https, http" }), undefined, undefined)).toBe("https://pub.test");
  });
  it("localhost defaults to http, others to https", () => {
    expect(resolveOrigin(h({ host: "localhost:3000" }), undefined, undefined)).toBe("http://localhost:3000");
    expect(resolveOrigin(h({ host: "app.test" }), undefined, undefined)).toBe("https://app.test");
  });
  it("rejects odd host values and falls back to the request url", () => {
    expect(resolveOrigin(h({ host: "a.test/evil path" }), "https://real.test/guide.txt", undefined)).toBe("https://real.test");
    expect(resolveOrigin(h({ host: "a b" }), "https://real.test/x", undefined)).toBe("https://real.test");
  });
  it("same result for /guide and /guide.txt inputs", () => {
    const hh = h({ "x-forwarded-host": "pub.test", host: "localhost:3000" });
    expect(resolveOrigin(hh, "http://localhost:3000/guide.txt", undefined)).toBe(resolveOrigin(hh, undefined, undefined));
  });
});
