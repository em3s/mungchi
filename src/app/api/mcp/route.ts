// 뭉치 MCP 서버 주소. Gemini 앱 "맞춤 커넥터"에 이 주소를 넣는다. OAuth 액세스 토큰이 있어야 한다.
import { handleRpc } from "@/lib/mcp/server";
import { apiKeyOk, mcpEnv, verify } from "@/lib/mcp/token";
import { disabled, json, originOf } from "@/lib/mcp/http";
import { DbUnavailable, addList, listLists } from "@/lib/db/vocab";

export const dynamic = "force-dynamic";

const deps = {
  listLists: async () => (await listLists()).map((l) => ({ name: l.name, count: l.count })),
  addWords: (title: string, words: { word: string; meaning: string }[]) => addList(title, words),
};

function unauthorized(req: Request) {
  const meta = `${originOf(req)}/.well-known/oauth-protected-resource`;
  return json({ error: "unauthorized" }, 401, {
    "www-authenticate": `Bearer resource_metadata="${meta}", scope="vocab"`,
  });
}

export async function POST(req: Request) {
  const env = mcpEnv();
  if (!env) return disabled();
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  // OAuth 액세스 토큰, 또는 고정 API 키(Authorization: Bearer <키> / X-API-Key: <키>)
  const key = req.headers.get("x-api-key")?.trim() || token;
  if (!verify(env.secret, token, "access") && !apiKeyOk(key)) return unauthorized(req);

  const raw = await req.text();
  if (raw.length > 200_000) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Too large" } }, 413);
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  let res;
  try {
    res = await handleRpc(msg, deps);
  } catch (e) {
    if (e instanceof DbUnavailable) return json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "DB not configured" } }, 503);
    throw e;
  }
  if (res === null) return new Response(null, { status: 202 });
  return json(res);
}

// 서버에서 먼저 보내는 스트림(SSE)과 세션 종료는 쓰지 않는다.
export function GET() {
  return new Response(null, { status: 405, headers: { allow: "POST" } });
}
export function DELETE() {
  return new Response(null, { status: 405, headers: { allow: "POST" } });
}
