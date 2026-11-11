// 영어 단어장 시스템 — 단어장/단어 CRUD

import { supabase } from "@/lib/supabase/client";
import { cached, invalidate } from "@/lib/cache";
import type { VocabEntry } from "@/lib/types";

const USER_ID = "sihyun";

const ENTRIES_TTL = 30_000;
const LISTS_TTL = 30_000;

// --- 단어장 목록 조회 ---

export async function getVocabLists(): Promise<
  { id: string; name: string; count: number; createdAt: string }[]
> {
  return cached(`vocab_lists`, LISTS_TTL, async () => {
    const [metaRes, countsRes] = await Promise.all([
      supabase
        .from("vocab_list_meta")
        .select("id, name, created_at")
        .eq("user_id", USER_ID)
        .order("created_at", { ascending: false }),
      supabase
        .from("vocab_entry_counts")
        .select("list_id, total")
        .eq("user_id", USER_ID),
    ]);

    const counts = new Map<string, number>();
    if (countsRes.data) {
      for (const row of countsRes.data as { list_id: string; total: number }[]) {
        counts.set(row.list_id, row.total);
      }
    }

    const lists = (metaRes.data ?? []) as { id: string; name: string; created_at: string }[];
    return lists.map((meta) => ({
      id: meta.id,
      name: meta.name,
      count: counts.get(meta.id) ?? 0,
      createdAt: meta.created_at,
    }));
  });
}

// --- 단어장 생성 ---

export async function createList(
  name: string,
): Promise<{ ok: boolean; listId?: string }> {
  const { data, error } = await supabase
    .from("vocab_list_meta")
    .insert({ user_id: USER_ID, name })
    .select("id")
    .single();
  if (error) return { ok: false };
  invalidate(`vocab_lists`);
  return { ok: true, listId: (data as { id: string }).id };
}

export async function deleteList(listId: string): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_list_meta")
    .delete()
    .eq("id", listId)
    .eq("user_id", USER_ID);
  if (error) return false;
  invalidate(`vocab_lists`);
  return true;
}

// --- 단어 목록 ---

export async function getEntries(listId: string): Promise<VocabEntry[]> {
  return cached(`vocab_entries:${listId}`, ENTRIES_TTL, async () => {
    const { data } = await supabase
      .from("vocab_entries")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("list_id", listId)
      .order("created_at", { ascending: true });
    return (data as VocabEntry[]) ?? [];
  });
}

export async function removeEntry(
  listId: string,
  entryId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_entries")
    .delete()
    .eq("id", entryId);
  if (error) return false;
  invalidate(`vocab_entries:${listId}`);
  invalidate(`vocab_lists`);
  return true;
}

// --- 단어 수정 ---

export async function updateEntry(
  listId: string,
  entryId: string,
  word: string,
  meaning: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_entries")
    .update({ word, meaning })
    .eq("id", entryId);
  if (error) return false;
  invalidate(`vocab_entries:${listId}`);
  return true;
}

// --- Gemini 넣기 링크: 추가만 ---
// 읽기(미리보기)와 쓰기(넣기)를 나눈다. 미리보기는 DB 를 읽기만 한다.

type WordInput = { word: string; meaning: string };

// 같은 이름 단어장이 여럿이면 가장 오래된 것(동률은 id)을 쓴다.
async function findOldestList(name: string): Promise<{ id: string | null; error: boolean }> {
  const { data, error } = await supabase
    .from("vocab_list_meta")
    .select("id")
    .eq("user_id", USER_ID)
    .eq("name", name)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);
  if (error) return { id: null, error: true };
  return { id: (data as { id: string }[] | null)?.[0]?.id ?? null, error: false };
}

async function findExistingWords(listId: string, words: string[]): Promise<Set<string> | null> {
  const { data, error } = await supabase
    .from("vocab_entries")
    .select("word")
    .eq("list_id", listId)
    .in("word", words);
  if (error) return null;
  return new Set(((data as { word: string }[] | null) ?? []).map((r) => r.word));
}

export type PreviewAddResult =
  | { ok: true; listId: string | null; listExists: boolean; toAdd: string[]; skipped: string[] }
  | { ok: false };

/** 넣기 전 미리보기. DB 를 읽기만 한다(쓰기 없음). */
export async function previewAddWords(name: string, words: WordInput[]): Promise<PreviewAddResult> {
  const found = await findOldestList(name);
  if (found.error) return { ok: false };
  const all = words.map((w) => w.word);
  if (!found.id) return { ok: true, listId: null, listExists: false, toAdd: all, skipped: [] };
  const existing = await findExistingWords(found.id, all);
  if (!existing) return { ok: false };
  return {
    ok: true,
    listId: found.id,
    listExists: true,
    toAdd: all.filter((w) => !existing.has(w)),
    skipped: all.filter((w) => existing.has(w)),
  };
}

export type AddWordsResult =
  | { ok: true; listId: string; listCreated: boolean; added: string[]; skipped: string[] }
  | { ok: false };

/** 추가만 한다(수정·삭제 없음). 단어장이 없으면 만들고, 이미 있는 단어는 건너뛴다. */
export async function addWordsOnly(name: string, words: WordInput[]): Promise<AddWordsResult> {
  const found = await findOldestList(name);
  if (found.error) return { ok: false };
  let listId = found.id;
  let listCreated = false;
  if (!listId) {
    const { data, error } = await supabase
      .from("vocab_list_meta")
      .insert({ user_id: USER_ID, name })
      .select("id")
      .single();
    if (error || !data) return { ok: false };
    listId = (data as { id: string }).id;
    listCreated = true;
    // 동시에 같은 이름이 만들어졌을 수 있다(유일 제약 없음). 다시 조회해 가장 오래된 단어장으로 모은다.
    const again = await findOldestList(name);
    if (again.error) return { ok: false };
    listId = again.id ?? listId;
  }

  const existing = await findExistingWords(listId, words.map((w) => w.word));
  if (!existing) return { ok: false };
  const toAdd = words.filter((w) => !existing.has(w.word));
  const skipped = words.filter((w) => existing.has(w.word)).map((w) => w.word);
  let added = toAdd.map((w) => w.word);

  if (toAdd.length > 0) {
    const base = Date.now(); // 관리 페이지처럼 입력 순서를 created_at 으로 보존
    const rows = toAdd.map((w, i) => ({
      user_id: USER_ID,
      list_id: listId,
      word: w.word,
      meaning: w.meaning,
      created_at: new Date(base + i).toISOString(),
    }));
    const { data, error } = await supabase
      .from("vocab_entries")
      .upsert(rows, { onConflict: "list_id,word", ignoreDuplicates: true })
      .select("word");
    if (error) return { ok: false };
    const inserted = new Set(((data as { word: string }[] | null) ?? []).map((r) => r.word));
    skipped.push(...added.filter((w) => !inserted.has(w)));
    added = added.filter((w) => inserted.has(w));
  }

  invalidate(`vocab_lists`);
  invalidate(`vocab_entries:${listId}`);
  return { ok: true, listId, listCreated, added, skipped };
}
