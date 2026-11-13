// 공개 주소(커넥터 OAuth 메타데이터, AI 탭의 커넥터 주소)를 정한다.
// 1) 환경변수 NEXT_PUBLIC_SITE_URL(있으면 그대로) 2) x-forwarded-host 3) host. 요청 URL 은 쓰지 않는다.
// Host 값은 형식을 검사해서 이상한 값이 주소에 들어가지 않게 한다.

const HOST_RE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;

export function resolveOrigin(
  get: (name: string) => string | null | undefined,
  envSiteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  if (envSiteUrl && /^https?:\/\/[^\s/]+$/i.test(envSiteUrl.replace(/\/+$/, ""))) {
    return envSiteUrl.replace(/\/+$/, "");
  }
  const first = (v: string | null | undefined) => v?.split(",")[0].trim() ?? "";
  const host = [first(get("x-forwarded-host")), first(get("host"))].find((h) => h && HOST_RE.test(h));
  if (host) {
    const p = first(get("x-forwarded-proto")).toLowerCase();
    const proto = p === "http" || p === "https" ? p : host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}
