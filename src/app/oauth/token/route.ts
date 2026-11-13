// 토큰 발급. authorization_code(+PKCE) 와 refresh_token 만.
import { TTL, mcpEnv, pkceOk, sign, verify } from "@/lib/mcp/token";
import { json, readParams } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => json({ error }, status);

function issue(secret: string, clientId: string) {
  const now = Math.floor(Date.now() / 1000);
  return json({
    access_token: sign(secret, { k: "access", exp: now + TTL.access }),
    token_type: "Bearer",
    expires_in: TTL.access,
    refresh_token: sign(secret, { k: "refresh", exp: now + TTL.refresh, c: clientId }),
    scope: "vocab",
  });
}

export async function POST(req: Request) {
  const env = mcpEnv();
  const p = await readParams(req);

  if (p.grant_type === "authorization_code") {
    const code = verify(env.secret, p.code, "code");
    if (!code) return fail("invalid_grant");
    if (code.c !== p.client_id || code.r !== p.redirect_uri) return fail("invalid_grant");
    if (!pkceOk(p.code_verifier, code.ch)) return fail("invalid_grant");
    return issue(env.secret, p.client_id);
  }
  if (p.grant_type === "refresh_token") {
    const rt = verify(env.secret, p.refresh_token, "refresh");
    if (!rt) return fail("invalid_grant");
    if (p.client_id && p.client_id !== rt.c) return fail("invalid_grant");
    return issue(env.secret, rt.c as string);
  }
  return fail("unsupported_grant_type");
}
