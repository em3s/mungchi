/* eslint-disable @typescript-eslint/no-explicit-any -- JSON-RPC 응답을 테스트에서 자유롭게 읽는다 */
import { describe, expect, it, vi } from "vitest";
import { handleRpc, type McpDeps } from "./server";

function deps(): McpDeps & { addWords: ReturnType<typeof vi.fn> } {
  return {
    listLists: async () => [{ name: "Day 1", count: 3 }],
    addWords: vi.fn(async (_t: string, words: { word: string }[]) => ({
      ok: true as const,
      added: words.map((w) => w.word),
      skipped: [],
    })),
  };
}
const call = (name: string, args: unknown) => ({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });

describe("handleRpc", () => {
  it("initialize negotiates version", async () => {
    const r = (await handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } }, deps())) as any;
    expect(r.result.protocolVersion).toBe("2025-03-26");
    expect(r.result.capabilities.tools).toBeDefined();
    const r2 = (await handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "1999" } }, deps())) as any;
    expect(r2.result.protocolVersion).toBe("2025-06-18");
  });
  it("notifications return null", async () => {
    expect(await handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, deps())).toBeNull();
  });
  it("tools/list has only list and add (no delete/update)", async () => {
    const r = (await handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, deps())) as any;
    expect(r.result.tools.map((t: any) => t.name)).toEqual(["list_vocab_lists", "add_words"]);
  });
  it("add_words adds valid worksheet notation", async () => {
    const d = deps();
    const r = (await handleRpc(
      call("add_words", { title: "Anne", words: [{ word: "Clutch / clutched", meaning: "움켜잡다 / 움켜잡았다" }, { word: "wrap ↔ unwrap", meaning: "싸다 ↔ 풀다" }] }),
      d,
    )) as any;
    expect(r.result.isError).toBe(false);
    expect(d.addWords).toHaveBeenCalledWith("Anne", [
      { word: "clutch / clutched", meaning: "움켜잡다 / 움켜잡았다" },
      { word: "wrap ↔ unwrap", meaning: "싸다 ↔ 풀다" },
    ]);
    expect(r.result.content[0].text).toContain("2개를 넣었어요");
    expect(r.result.content[0].text).toContain("새 단어장");
  });
  it("add_words with any invalid word writes nothing", async () => {
    const d = deps();
    const r = (await handleRpc(call("add_words", { title: "T", words: [{ word: "ok", meaning: "m" }, { word: "한글", meaning: "m" }] }), d)) as any;
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toContain("2번째 단어");
    expect(d.addWords).not.toHaveBeenCalled();
  });
  it("add_words rejects bad shapes and over 100", async () => {
    const d = deps();
    for (const args of [{}, { title: "T" }, { title: "T", words: "x" }, { title: "", words: [{ word: "a", meaning: "b" }] }]) {
      const r = (await handleRpc(call("add_words", args), d)) as any;
      expect(r.result.isError, JSON.stringify(args)).toBe(true);
    }
    const many = Array.from({ length: 101 }, (_, i) => ({ word: `w${"abcdefghijklmnopqrstuvwxyz"[i % 26]}${"abcdefghijklmnopqrstuvwxyz"[Math.floor(i / 26)]}`, meaning: "m" }));
    const r = (await handleRpc(call("add_words", { title: "T", words: many }), d)) as any;
    expect(r.result.isError).toBe(true);
    expect(d.addWords).not.toHaveBeenCalled();
  });
  it("unknown tool and method", async () => {
    expect(((await handleRpc(call("delete_list", {}), deps())) as any).error.code).toBe(-32602);
    expect(((await handleRpc({ jsonrpc: "2.0", id: 3, method: "resources/list" }, deps())) as any).error.code).toBe(-32601);
    expect(((await handleRpc([1], deps())) as any).error.code).toBe(-32600);
  });
});
