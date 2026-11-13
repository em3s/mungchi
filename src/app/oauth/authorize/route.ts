// 연결 승인 화면. 대장님(보호자) 비밀번호(MCP_OWNER_PASSWORD)를 넣어야 커넥터가 연결된다.
import { TTL, mcpEnv, passwordOk, sign, verify } from "@/lib/mcp/token";
import { readParams } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

const FIELDS = ["response_type", "client_id", "redirect_uri", "code_challenge", "code_challenge_method", "state", "scope", "resource"] as const;
type Q = Partial<Record<(typeof FIELDS)[number], string>>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>뭉치 연결</title>
<style>body{font-family:system-ui,sans-serif;background:#f8f7f4;color:#222;margin:0;padding:24px}main{max-width:420px;margin:40px auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 4px #0001}h1{font-size:20px;margin:0 0 8px}p{color:#666;font-size:14px;line-height:1.5}input{width:100%;box-sizing:border-box;font-size:16px;padding:12px;border:1px solid #ddd;border-radius:10px;margin:12px 0}button{width:100%;font-size:16px;padding:12px;border:0;border-radius:10px;background:#6c5ce7;color:#fff;font-weight:700}.err{color:#d63031}</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "content-security-policy": "frame-ancestors 'none'" } },
  );
}

/** 요청 검사. 문제가 있으면 오류 문구(리다이렉트하지 않는다: 열린 리다이렉트 방지). */
function check(secret: string, q: Q): string | null {
  if (q.response_type !== "code") return "response_type 은 code 여야 해요";
  const client = verify(secret, q.client_id, "client");
  if (!client) return "등록되지 않은 클라이언트예요";
  if (!q.redirect_uri || !(client.r as string[]).includes(q.redirect_uri)) return "redirect_uri 가 등록된 값과 달라요";
  if (q.code_challenge_method !== "S256" || !q.code_challenge || !/^[A-Za-z0-9_-]{43}$/.test(q.code_challenge)) return "PKCE(S256)가 필요해요";
  return null;
}

function form(q: Q, error = "") {
  const hidden = FIELDS.filter((f) => q[f] !== undefined)
    .map((f) => `<input type="hidden" name="${f}" value="${esc(q[f]!)}">`)
    .join("");
  return page(`<h1>🔗 뭉치 단어장 연결</h1>
<p>AI(Gemini)가 뭉치 단어장에 <b>단어를 넣을 수 있게</b> 연결합니다. 단어를 고치거나 지우지는 못해요.<br>보호자 비밀번호를 넣어 주세요.</p>
${error ? `<p class="err">${esc(error)}</p>` : ""}
<form method="post" action="/oauth/authorize">${hidden}<input type="password" name="password" autocomplete="current-password" placeholder="비밀번호" required autofocus><button type="submit">연결하기</button></form>`);
}

function pick(src: Record<string, string>): Q {
  const q: Q = {};
  for (const f of FIELDS) if (typeof src[f] === "string") q[f] = src[f].slice(0, 2000);
  return q;
}

export function GET(req: Request) {
  const env = mcpEnv();
  const q = pick(Object.fromEntries(new URL(req.url).searchParams));
  const bad = check(env.secret, q);
  if (bad) return page(`<h1>연결할 수 없어요</h1><p class="err">${esc(bad)}</p>`, 400);
  return form(q);
}

export async function POST(req: Request) {
  const env = mcpEnv();
  const p = await readParams(req);
  const q = pick(p);
  const bad = check(env.secret, q);
  if (bad) return page(`<h1>연결할 수 없어요</h1><p class="err">${esc(bad)}</p>`, 400);
  if (!passwordOk(p.password, env.password)) {
    await new Promise((r) => setTimeout(r, 1500)); // 마구 대입 늦추기
    return form(q, "비밀번호가 달라요");
  }
  const code = sign(env.secret, {
    k: "code",
    exp: Math.floor(Date.now() / 1000) + TTL.code,
    c: q.client_id,
    r: q.redirect_uri,
    ch: q.code_challenge,
  });
  const to = new URL(q.redirect_uri!);
  to.searchParams.set("code", code);
  if (q.state) to.searchParams.set("state", q.state);
  return new Response(null, { status: 302, headers: { location: to.toString(), "cache-control": "no-store" } });
}
