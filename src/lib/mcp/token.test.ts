import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { afterEach, vi } from "vitest";
import { apiKeyOk, passwordOk, pkceOk, redirectUriOk, sign, verify } from "./token";

const S = "s".repeat(32);

describe("sign/verify", () => {
  it("round-trips and checks kind and expiry", () => {
    const t = sign(S, { k: "access", exp: 2000 });
    expect(verify(S, t, "access", 1000)?.k).toBe("access");
    expect(verify(S, t, "refresh", 1000)).toBeNull();
    expect(verify(S, t, "access", 3000)).toBeNull();
  });
  it("rejects other secret and tampering", () => {
    const t = sign(S, { k: "access", exp: 2000, a: 1 });
    expect(verify("x".repeat(32), t, "access", 1000)).toBeNull();
    const [p, s] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ k: "access", exp: 9e9, a: 1 })).toString("base64url");
    expect(verify(S, `${forged}.${s}`, "access", 1000)).toBeNull();
    expect(verify(S, `${p}.${s}x`, "access", 1000)).toBeNull();
    expect(verify(S, "garbage", "access", 1000)).toBeNull();
    expect(verify(S, 42, "access", 1000)).toBeNull();
  });
  it("exp 0 never expires", () => {
    expect(verify(S, sign(S, { k: "client", exp: 0 }), "client", 9e9)).not.toBeNull();
  });
});

describe("pkce", () => {
  it("accepts S256 and rejects mismatch", () => {
    const v = "a".repeat(50);
    const c = createHash("sha256").update(v).digest("base64url");
    expect(pkceOk(v, c)).toBe(true);
    expect(pkceOk("b".repeat(50), c)).toBe(false);
    expect(pkceOk("short", c)).toBe(false);
  });
});

describe("password and redirect", () => {
  it("password", () => {
    expect(passwordOk("hello-world", "hello-world")).toBe(true);
    expect(passwordOk("hello", "hello-world")).toBe(false);
    expect(passwordOk(undefined, "x")).toBe(false);
    expect(passwordOk("", "")).toBe(false);
  });
  it("redirect uri", () => {
    expect(redirectUriOk("https://gemini.google.com/cb")).toBe(true);
    expect(redirectUriOk("http://localhost:6274/cb")).toBe(true);
    expect(redirectUriOk("http://evil.example/cb")).toBe(false);
    expect(redirectUriOk("javascript:alert(1)")).toBe(false);
    expect(redirectUriOk("https://a.example/cb#x")).toBe(false);
  });
});

describe("apiKeyOk", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("off when MCP_API_KEY is unset or short", () => {
    vi.stubEnv("MCP_API_KEY", "");
    expect(apiKeyOk("")).toBe(false);
    expect(apiKeyOk("anything")).toBe(false);
    vi.stubEnv("MCP_API_KEY", "short");
    expect(apiKeyOk("short")).toBe(false);
  });
  it("matches exact key only", () => {
    vi.stubEnv("MCP_API_KEY", "k".repeat(20));
    expect(apiKeyOk("k".repeat(20))).toBe(true);
    expect(apiKeyOk("k".repeat(19))).toBe(false);
  });
});
