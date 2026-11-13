import { beforeEach, describe, expect, it, vi } from "vitest";

interface St {
  lists: { id: string; user_id: string; name: string }[];
  entries: { list_id: string; word: string }[];
  calls: string[];
  upsert?: { rows: Record<string, string>[]; opts: unknown };
  fail?: string;
  raceOlder?: boolean;
}
const st: St = { lists: [], entries: [], calls: [] };

vi.mock("@/lib/supabase/client", () => {
  const err = (op: string) => (st.fail === op ? { message: "x" } : null);
  const from = (table: string) => {
    const f: Record<string, string> = {};
    let inWords: string[] | null = null;
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = (k: string, v: string) => { f[k] = v; return b; };
    b.in = (_k: string, v: string[]) => { inWords = v; return b; };
    b.order = () => b;
    b.limit = () => b;
    b.then = (res: (v: unknown) => unknown) => {
      st.calls.push(`${table}.select`);
      if (table === "vocab_list_meta") {
        const e = err("findList");
        return Promise.resolve({ data: e ? null : st.lists.filter((l) => l.user_id === f.user_id && l.name === f.name).slice(0, 1), error: e }).then(res);
      }
      const e = err("findEntries");
      const data = st.entries.filter((x) => x.list_id === f.list_id && (!inWords || inWords.includes(x.word))).map((x) => ({ word: x.word }));
      return Promise.resolve({ data: e ? null : data, error: e }).then(res);
    };
    b.insert = (row: Record<string, string>) => ({
      select: () => ({
        single: () => {
          st.calls.push(`${table}.insert`);
          const e = err("createList");
          if (e) return Promise.resolve({ data: null, error: e });
          if (st.raceOlder) st.lists.push({ id: "OLDER", user_id: row.user_id, name: row.name });
          st.lists.push({ id: "NEW", user_id: row.user_id, name: row.name });
          return Promise.resolve({ data: { id: "NEW" }, error: null });
        },
      }),
    });
    b.upsert = (rows: Record<string, string>[], opts: unknown) => {
      st.calls.push(`${table}.upsert`);
      st.upsert = { rows, opts };
      const e = err("upsert");
      const have = new Set(st.entries.map((x) => `${x.list_id}|${x.word}`));
      const ins = e ? [] : rows.filter((r) => !have.has(`${r.list_id}|${r.word}`));
      ins.forEach((r) => st.entries.push({ list_id: r.list_id, word: r.word }));
      return { select: () => Promise.resolve({ data: e ? null : ins.map((r) => ({ word: r.word })), error: e }) };
    };
    b.update = () => { st.calls.push(`${table}.update`); return b; };
    b.delete = () => { st.calls.push(`${table}.delete`); return b; };
    return b;
  };
  return { supabase: { from } };
});

import { addWordsOnly, previewAddWords } from "./vocab";

const words = [{ word: "apple", meaning: "사과" }, { word: "pear", meaning: "배" }];

beforeEach(() => {
  st.lists = [];
  st.entries = [];
  st.calls = [];
  st.upsert = undefined;
  st.fail = undefined;
  st.raceOlder = false;
});

describe("previewAddWords (page load)", () => {
  it("never touches the DB and always plans a new list", async () => {
    st.lists = [{ id: "L1", user_id: "sihyun", name: "T" }];
    const r = await previewAddWords("T", words);
    expect(r).toEqual({ ok: true, listId: null, listExists: false, toAdd: ["apple", "pear"], skipped: [] });
    expect(st.calls).toEqual([]);
  });
});

describe("addWordsOnly (new list every time)", () => {
  it("creates a new list and adds all words in order", async () => {
    const r = await addWordsOnly("T", words);
    expect(r).toEqual({ ok: true, listId: "NEW", listCreated: true, added: ["apple", "pear"], skipped: [] });
    const ts = st.upsert!.rows.map((x) => Date.parse(x.created_at));
    expect(ts[1] - ts[0]).toBe(1);
    expect(st.upsert!.rows.every((x) => x.user_id === "sihyun" && x.list_id === "NEW")).toBe(true);
  });
  it("same title again makes another list (no merge, no reads)", async () => {
    st.lists = [{ id: "L1", user_id: "sihyun", name: "T" }];
    st.entries = [{ list_id: "L1", word: "apple" }];
    const r = await addWordsOnly("T", words);
    expect(r).toMatchObject({ ok: true, listId: "NEW", added: ["apple", "pear"] });
    expect(st.calls.filter((c) => c === "vocab_list_meta.insert")).toHaveLength(1);
    expect(st.calls.some((c) => c.endsWith(".select"))).toBe(false);
  });
  it("create failure → ok false, nothing else", async () => {
    st.fail = "createList";
    expect((await addWordsOnly("T", words)).ok).toBe(false);
    expect(st.upsert).toBeUndefined();
  });
  it("word insert failure → removes only the list it just made", async () => {
    st.fail = "upsert";
    expect((await addWordsOnly("T", words)).ok).toBe(false);
    expect(st.calls.filter((c) => c.endsWith(".delete"))).toEqual(["vocab_list_meta.delete"]);
  });
  it("never updates, and deletes nothing on success", async () => {
    await addWordsOnly("T", words);
    expect(st.calls.filter((c) => /\.(update|delete)$/.test(c))).toEqual([]);
  });
});
