// 앱 로그인 세션. PIN 이 맞으면 서버가 서명한 HttpOnly 쿠키를 준다(브라우저 저장값으로는 통과 못 함).
// 서명 비밀값은 MCP_AUTH_SECRET 을 같이 쓴다(32자 이상). 바꾸면 모든 기기가 다시 PIN 을 넣어야 한다.
import { sign, verify } from "@/lib/mcp/token";

export const SESSION_COOKIE = "mungchi_auth";
const SESSION_DAYS = 180;

export function sessionSecret(): string | null {
  const s = process.env.MCP_AUTH_SECRET ?? "";
  return s.length >= 32 ? s : null;
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function isAuthed(req: Request): boolean {
  const secret = sessionSecret();
  if (!secret) return false;
  return verify(secret, readCookie(req, SESSION_COOKIE), "session") !== null;
}

/** Set-Cookie 값. */
export function sessionCookie(secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const token = sign(secret, { k: "session", exp });
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}
