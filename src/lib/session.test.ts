import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthed, sessionCookie } from "./session";

const S = "s".repeat(32);
const req = (cookie?: string) => new Request("https://x.test/", { headers: cookie ? { cookie } : {} });

describe("session", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("cookie from sessionCookie authenticates", () => {
    vi.stubEnv("MCP_AUTH_SECRET", S);
    const set = sessionCookie(S);
    expect(set).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    const pair = set.split(";")[0];
    expect(isAuthed(req(`other=1; ${pair}`))).toBe(true);
  });
  it("rejects missing, forged, or old-style cookies", () => {
    vi.stubEnv("MCP_AUTH_SECRET", S);
    expect(isAuthed(req())).toBe(false);
    expect(isAuthed(req("mungchi_auth=true"))).toBe(false);
    expect(isAuthed(req(sessionCookie("x".repeat(32)).split(";")[0]))).toBe(false);
  });
  it("no secret → never authed", () => {
    vi.stubEnv("MCP_AUTH_SECRET", "");
    expect(isAuthed(req(sessionCookie(S).split(";")[0]))).toBe(false);
  });
});
