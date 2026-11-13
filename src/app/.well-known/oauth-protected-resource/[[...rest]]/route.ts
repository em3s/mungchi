import { json, originOf, protectedResourceMetadata } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return json(protectedResourceMetadata(originOf(req)));
}
