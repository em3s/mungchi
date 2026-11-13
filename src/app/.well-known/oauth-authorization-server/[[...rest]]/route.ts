import { authServerMetadata, json, originOf } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return json(authServerMetadata(originOf(req)));
}
