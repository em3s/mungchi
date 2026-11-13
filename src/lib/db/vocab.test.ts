import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const st: { calls: string[]; rows?: Record<string, string>[]; fail?: string; deleted: Record<string, string>[] } = { calls: [], deleted: [] };

vi.mock("./supabase", () => {
  const from = (table: string) => {
    const f: Record<string, string> = {};
    const b: Record<string, unknown> = {};
    b.insert = (row: Record<string, string>) => ({
      select: () => ({
        single: () => {
          st.calls.push(`${table}.insert:${row.user_id}`);
          return Promise.resolve(st.fail === "create" ? { data: null, error: { message: "x" } } : { data: { id: "NEW" }, error: null });
        },
      }),
    });
    b.upsert = (rows: Record<string, string>[]) => {
      st.calls.push(`${table}.upsert`);
      st.rows = rows;
      const e = st.fail === "upsert" ? { message: "x" } : null;
      return { select: () => Promise.resolve({ data: e ? null : rows.map((r) => ({ word: r.word })), error: e }) };
    };
    b.delete = () => {
      st.calls.push(`${table}.delete`);
      return b;
    };
    b.eq = (k: string, v: string) => {
      f[k] = v;
      return b;
    };
    b.then = (res: (v: unknown) => unknown) => {
      st.deleted.push({ ...f });
      return Promise.resolve({ error: null }).then(res);
    };
    return b;
  };
  return { db: () => ({ from }) };
});

import { addList } from "./vocab";

const words = [{ word: "apple", meaning: "사과" }, { word: "pear", meaning: "배" }];

beforeEach(() => {
  st.calls = [];
  st.rows = undefined;
  st.fail = undefined;
  st.deleted = [];
});

describe("addList (server)", () => {
  it("always creates a new list for user sihyun and keeps input order", async () => {
    const r = await addList("T", words);
    expect(r).toEqual({ ok: true, listId: "NEW", added: ["apple", "pear"], skipped: [] });
    expect(st.calls[0]).toBe("vocab_list_meta.insert:sihyun");
    const ts = st.rows!.map((x) => Date.parse(x.created_at));
    expect(ts[1] - ts[0]).toBe(1);
    expect(st.rows!.every((x) => x.list_id === "NEW" && x.user_id === "sihyun")).toBe(true);
  });
  it("create failure → ok false, no word insert", async () => {
    st.fail = "create";
    expect((await addList("T", words)).ok).toBe(false);
    expect(st.rows).toBeUndefined();
  });
  it("word insert failure → deletes only the list it just made", async () => {
    st.fail = "upsert";
    expect((await addList("T", words)).ok).toBe(false);
    expect(st.calls.filter((c) => c.endsWith(".delete"))).toEqual(["vocab_list_meta.delete"]);
    expect(st.deleted).toEqual([{ id: "NEW", user_id: "sihyun" }]);
  });
});
