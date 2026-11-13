// 뭉치 MCP 커넥터용 OAuth 토큰. 서버 비밀값(MCP_AUTH_SECRET)으로 서명한 상태 없는 토큰이다.
// DB 테이블 없이 동작하고, 비밀값을 바꾸면 발급된 토큰이 모두 무효가 된다.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type TokenKind = "client" | "code" | "access" | "refresh" | "session";

export interface TokenBody {
  k: TokenKind;
  exp: number; // 초 단위 epoch. 0 이면 만료 없음(client 만)
  [key: string]: unknown;
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function mac(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function sign(secret: string, body: TokenBody): string {
  const p = b64u(JSON.stringify(body));
  return `${p}.${mac(secret, p)}`;
}

/** 서명·종류·만료를 확인한다. 틀리면 null. */
export function verify(secret: string, token: unknown, kind: TokenKind, now = Date.now() / 1000): TokenBody | null {
  if (typeof token !== "string" || token.length > 4096) return null;
  const i = token.indexOf(".");
  if (i <= 0 || i !== token.lastIndexOf(".")) return null;
  const p = token.slice(0, i);
  const s = Buffer.from(token.slice(i + 1));
  const want = Buffer.from(mac(secret, p));
  if (s.length !== want.length || !timingSafeEqual(s, want)) return null;
  let body: TokenBody;
  try {
    body = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!body || body.k !== kind || typeof body.exp !== "number") return null;
  if (body.exp !== 0 && body.exp < now) return null;
  return body;
}

/** PKCE S256: base64url(sha256(verifier)) === challenge */
export function pkceOk(verifier: unknown, challenge: unknown): boolean {
  if (typeof verifier !== "string" || typeof challenge !== "string") return false;
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const got = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const want = Buffer.from(challenge);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** 비밀번호 비교(길이 차이도 시간으로 새지 않게 해시 후 비교). */
export function passwordOk(given: unknown, expected: string): boolean {
  if (typeof given !== "string" || !expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** redirect_uri 는 https(또는 로컬 개발용 http://localhost)만. */
export function redirectUriOk(u: unknown): u is string {
  if (typeof u !== "string" || u.length > 2000) return false;
  try {
    const url = new URL(u);
    if (url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export const TTL = {
  code: 300,
  access: 3600,
  refresh: 180 * 24 * 3600,
};

/** 필요한 환경변수. 없으면 커넥터 전체를 끈다(503). 기본값은 두지 않는다. */
export function mcpEnv(): { secret: string; password: string } | null {
  const secret = process.env.MCP_AUTH_SECRET ?? "";
  const password = process.env.MCP_OWNER_PASSWORD ?? "";
  if (secret.length < 32 || password.length < 8) return null;
  return { secret, password };
}

/** 고정 API 키(MCP_API_KEY, 16자 이상). 없으면 키 방식은 꺼진다(OAuth 만). */
export function apiKeyOk(given: string): boolean {
  const key = process.env.MCP_API_KEY ?? "";
  if (key.length < 16 || !given) return false;
  return passwordOk(given, key);
}
