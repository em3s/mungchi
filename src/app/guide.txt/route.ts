import { buildGuideText } from "@/lib/import/guide";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return new Response(buildGuideText(new URL(req.url).origin), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
