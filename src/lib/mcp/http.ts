// MCP·OAuth 라우트가 함께 쓰는 작은 도우미.
import { resolveOrigin } from "@/lib/origin";

export function originOf(req: Request): string {
  return resolveOrigin((n) => req.headers.get(n));
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

export const disabled = () => json({ error: "temporarily_unavailable", error_description: "connector not configured" }, 503);

/** 폼(application/x-www-form-urlencoded) 또는 JSON 본문을 평평한 문자열 맵으로 읽는다. */
export async function readParams(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  const raw = await req.text();
  if (raw.length > 20_000) return {};
  if (ct.includes("application/json")) {
    try {
      const o = JSON.parse(raw);
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(o ?? {})) if (typeof v === "string") out[k] = v;
      return out;
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

export function authServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["vocab"],
  };
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: ["vocab"],
    bearer_methods_supported: ["header"],
    resource_name: "뭉치 단어장",
  };
}
