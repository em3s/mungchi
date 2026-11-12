import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { GET } from "./route";

describe("guide caching", () => {
  it("/guide.txt response is no-store and uses the forwarded host", async () => {
    const res = GET(new Request("http://internal:3000/guide.txt", { headers: { "x-forwarded-host": "pub.test", "x-forwarded-proto": "https" } }));
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toContain("https://pub.test/import#");
  });
  it("next.config sets no-store for /guide and /guide.txt", async () => {
    const rules = await nextConfig.headers!();
    for (const source of ["/guide", "/guide.txt"]) {
      const r = rules.find((x) => x.source === source);
      expect(r?.headers).toContainEqual({ key: "Cache-Control", value: "no-store" });
    }
  });
});
