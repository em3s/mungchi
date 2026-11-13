// 뭉치 MCP 서버 주소. Gemini 앱 "맞춤 커넥터"에 이 주소를 넣는다. OAuth 액세스 토큰이 있어야 한다.
import { handleRpc } from "@/lib/mcp/server";
import { mcpEnv, verify } from "@/lib/mcp/token";
import { json, originOf } from "@/lib/mcp/http";
import { addWordsOnly, getVocabLists } from "@/lib/vocab";

export const dynamic = "force-dynamic";

const deps = {
  listLists: async () => (await getVocabLists()).map((l) => ({ name: l.name, count: l.count })),
  addWords: (title: string, words: { word: string; meaning: string }[]) => addWordsOnly(title, words),
};

function unauthorized(req: Request) {
  const meta = `${originOf(req)}/.well-known/oauth-protected-resource`;
  return json({ error: "unauthorized" }, 401, {
    "www-authenticate": `Bearer resource_metadata="${meta}", scope="vocab"`,
  });
}

export async function POST(req: Request) {
  const env = mcpEnv();
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!verify(env.secret, token, "access")) return unauthorized(req);

  const raw = await req.text();
  if (raw.length > 200_000) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Too large" } }, 413);
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  const res = await handleRpc(msg, deps);
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
