// 단어장 DB 접근(서버 전용). 화면은 /api/vocab, AI 커넥터는 /api/mcp 를 거쳐 여기로 온다.
import "server-only";
import { db } from "./supabase";
import type { VocabEntry } from "@/lib/types";

const USER_ID = "sihyun";

export class DbUnavailable extends Error {}

function c() {
  const x = db();
  if (!x) throw new DbUnavailable("SUPABASE_SERVICE_ROLE_KEY 가 없어요");
  return x;
}

export type ListSummary = { id: string; name: string; count: number; createdAt: string };

/** 단어장 목록(최근 것이 위). 실패하면 빈 목록(읽기=fallback). */
export async function listLists(): Promise<ListSummary[]> {
  const [metaRes, countsRes] = await Promise.all([
    c().from("vocab_list_meta").select("id, name, created_at").eq("user_id", USER_ID).order("created_at", { ascending: false }),
    c().from("vocab_entry_counts").select("list_id, total").eq("user_id", USER_ID),
  ]);
  const counts = new Map<string, number>();
  for (const row of (countsRes.data ?? []) as { list_id: string; total: number }[]) counts.set(row.list_id, row.total);
  return ((metaRes.data ?? []) as { id: string; name: string; created_at: string }[]).map((m) => ({
    id: m.id,
    name: m.name,
    count: counts.get(m.id) ?? 0,
    createdAt: m.created_at,
  }));
}

export async function getEntries(listId: string): Promise<VocabEntry[]> {
  const { data } = await c()
    .from("vocab_entries")
    .select("*")
    .eq("user_id", USER_ID)
    .eq("list_id", listId)
    .order("created_at", { ascending: true });
  return (data as VocabEntry[]) ?? [];
}

export async function deleteList(listId: string): Promise<boolean> {
  const { error } = await c().from("vocab_list_meta").delete().eq("id", listId).eq("user_id", USER_ID);
  return !error;
}

export async function removeEntry(entryId: string): Promise<boolean> {
  const { error } = await c().from("vocab_entries").delete().eq("id", entryId).eq("user_id", USER_ID);
  return !error;
}

export async function updateEntry(entryId: string, word: string, meaning: string): Promise<boolean> {
  const { error } = await c().from("vocab_entries").update({ word, meaning }).eq("id", entryId).eq("user_id", USER_ID);
  return !error;
}

type WordInput = { word: string; meaning: string };

export type AddWordsResult =
  | { ok: true; listId: string; added: string[]; skipped: string[] }
  | { ok: false };

/**
 * 새 단어장을 만들고 단어를 넣는다. 제목이 같아도 합치지 않는다(새 단어장이 목록 맨 위).
 * 실패하면 방금 만든 빈 단어장만 지운다.
 */
export async function addList(name: string, words: WordInput[]): Promise<AddWordsResult> {
  const { data, error } = await c().from("vocab_list_meta").insert({ user_id: USER_ID, name }).select("id").single();
  if (error || !data) return { ok: false };
  const listId = (data as { id: string }).id;

  const base = Date.now(); // 입력 순서를 created_at 으로 보존
  const rows = words.map((w, i) => ({
    user_id: USER_ID,
    list_id: listId,
    word: w.word,
    meaning: w.meaning,
    created_at: new Date(base + i).toISOString(),
  }));
  const ins = await c().from("vocab_entries").upsert(rows, { onConflict: "list_id,word", ignoreDuplicates: true }).select("word");
  if (ins.error) {
    await c().from("vocab_list_meta").delete().eq("id", listId).eq("user_id", USER_ID);
    return { ok: false };
  }
  const inserted = new Set(((ins.data as { word: string }[] | null) ?? []).map((r) => r.word));
  return {
    ok: true,
    listId,
    added: words.map((w) => w.word).filter((w) => inserted.has(w)),
    skipped: words.map((w) => w.word).filter((w) => !inserted.has(w)),
  };
}
