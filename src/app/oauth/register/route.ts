// 동적 클라이언트 등록(RFC 7591). 상태 없이 client_id 에 redirect_uris 를 서명해 담는다.
import { mcpEnv, redirectUriOk, sign } from "@/lib/mcp/token";
import { json } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const env = mcpEnv();
  let body: { redirect_uris?: unknown; client_name?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > 20_000) throw new Error("too large");
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_client_metadata" }, 400);
  }
  const uris = body.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10 || !uris.every(redirectUriOk)) {
    return json({ error: "invalid_redirect_uri" }, 400);
  }
  const name = typeof body.client_name === "string" ? body.client_name.slice(0, 100) : "";
  const client_id = sign(env.secret, { k: "client", exp: 0, r: uris, n: name });
  return json(
    {
      client_id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name || undefined,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    201,
  );
}
