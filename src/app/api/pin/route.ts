// PIN 확인. GET 은 자릿수만 알려 준다(점 개수). POST {pin} 이 맞으면 ok.
import { appPin, pinOk } from "@/lib/pin";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function GET() {
  const pin = appPin();
  if (!pin) return json({ error: "not_configured" }, 503);
  return json({ length: pin.length });
}

export async function POST(req: Request) {
  const pin = appPin();
  if (!pin) return json({ ok: false, error: "not_configured" }, 503);
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
  return json({ ok: true });
}
