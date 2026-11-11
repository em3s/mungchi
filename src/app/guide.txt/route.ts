import { buildGuideText } from "@/lib/import/guide";
import { resolveOrigin } from "@/lib/import/origin";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const origin = resolveOrigin((n) => req.headers.get(n));
  return new Response(buildGuideText(origin), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
