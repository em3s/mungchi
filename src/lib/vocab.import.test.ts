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
  it("reads only — never inserts/upserts/updates/deletes", async () => {
    st.lists = [{ id: "L1", user_id: "sihyun", name: "T" }];
    st.entries = [{ list_id: "L1", word: "apple" }];
    const r = await previewAddWords("T", words);
    expect(r).toEqual({ ok: true, listId: "L1", listExists: true, toAdd: ["pear"], skipped: ["apple"] });
    expect(st.calls.every((c) => c.endsWith(".select"))).toBe(true);
  });
  it("new list: listExists false, everything to add, no writes", async () => {
    const r = await previewAddWords("T", words);
    expect(r).toEqual({ ok: true, listId: null, listExists: false, toAdd: ["apple", "pear"], skipped: [] });
    expect(st.calls.every((c) => c.endsWith(".select"))).toBe(true);
  });
  it("scopes to user sihyun", async () => {
    st.lists = [{ id: "X", user_id: "other", name: "T" }];
    expect((await previewAddWords("T", words))).toMatchObject({ listExists: false });
  });
  it("db error → ok false", async () => {
    st.fail = "findList";
    expect((await previewAddWords("T", words)).ok).toBe(false);
  });
});

describe("addWordsOnly", () => {
  it("creates a new list and adds all words in order", async () => {
    const r = await addWordsOnly("T", words);
    expect(r).toEqual({ ok: true, listId: "NEW", listCreated: true, added: ["apple", "pear"], skipped: [] });
    expect(st.upsert!.opts).toEqual({ onConflict: "list_id,word", ignoreDuplicates: true });
    const ts = st.upsert!.rows.map((x) => Date.parse(x.created_at));
    expect(ts[1] - ts[0]).toBe(1);
    expect(st.upsert!.rows.every((x) => x.user_id === "sihyun" && x.list_id === "NEW")).toBe(true);
  });
  it("adds to existing list and skips existing words", async () => {
    st.lists = [{ id: "L1", user_id: "sihyun", name: "T" }];
    st.entries = [{ list_id: "L1", word: "apple" }];
    const r = await addWordsOnly("T", words);
    expect(r).toEqual({ ok: true, listId: "L1", listCreated: false, added: ["pear"], skipped: ["apple"] });
    expect(st.calls.filter((c) => c === "vocab_list_meta.insert")).toEqual([]);
    expect(st.upsert!.rows.map((x) => x.word)).toEqual(["pear"]);
  });
  it("all existing → no upsert", async () => {
    st.lists = [{ id: "L1", user_id: "sihyun", name: "T" }];
    st.entries = [{ list_id: "L1", word: "apple" }, { list_id: "L1", word: "pear" }];
    const r = await addWordsOnly("T", words);
    expect(r).toMatchObject({ ok: true, added: [], skipped: ["apple", "pear"] });
    expect(st.upsert).toBeUndefined();
  });
  it("after creating, converges on the oldest same-name list", async () => {
    st.raceOlder = true;
    const r = await addWordsOnly("T", words);
    expect(r).toMatchObject({ ok: true, listId: "OLDER" });
    expect(st.upsert!.rows.every((x) => x.list_id === "OLDER")).toBe(true);
  });
  it("db errors → ok false", async () => {
    for (const fail of ["findList", "findEntries", "upsert"]) {
      st.lists = [{ id: "L1", user_id: "sihyun", name: "T" }];
      st.fail = fail;
      expect((await addWordsOnly("T", words)).ok, fail).toBe(false);
    }
    st.lists = [];
    st.fail = "createList";
    expect((await addWordsOnly("T", words)).ok).toBe(false);
  });
  it("never calls update or delete", async () => {
    st.lists = [{ id: "L1", user_id: "sihyun", name: "T" }];
    await addWordsOnly("T", words);
    await addWordsOnly("New", words);
    expect(st.calls.filter((c) => /\.(update|delete)$/.test(c))).toEqual([]);
  });
});
