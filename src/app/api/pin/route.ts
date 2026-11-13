// PIN 확인과 로그인 세션. GET: 자릿수와 로그인 여부. POST {pin}: 맞으면 세션 쿠키.
import { appPin, pinOk } from "@/lib/pin";
import { isAuthed, sessionCookie, sessionSecret } from "@/lib/session";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

export function GET(req: Request) {
  const pin = appPin();
  if (!pin || !sessionSecret()) return json({ error: "not_configured", authed: false }, 503);
  return json({ length: pin.length, authed: isAuthed(req) });
}

export async function POST(req: Request) {
  const pin = appPin();
  const secret = sessionSecret();
  if (!pin || !secret) return json({ ok: false, error: "not_configured" }, 503);
  let given: unknown;
  try {
    given = (await req.json())?.pin;
  } catch {
    return json({ ok: false }, 400);
  }
  if (!pinOk(given, pin)) {
    await new Promise((r) => setTimeout(r, 1000)); // 마구 대입 늦추기
    return json({ ok: false }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(secret) });
}
