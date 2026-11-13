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

// --- AI 커넥터: 넣을 때마다 새 단어장 ---
// 제목이 같아도 합치지 않는다(아이들이 같은 단어장을 여러 번 넣고 싶어 함). 새 단어장은 목록 맨 위에 온다.
// 수정·삭제 없음. 실패하면 방금 만든 빈 단어장만 정리한다.

type WordInput = { word: string; meaning: string };

export type AddWordsResult =
  | { ok: true; listId: string; listCreated: true; added: string[]; skipped: string[] }
  | { ok: false };

/** 새 단어장을 만들고 단어를 넣는다(입력 안 중복은 검사 단계에서 이미 걸러짐). */
export async function addWordsOnly(name: string, words: WordInput[]): Promise<AddWordsResult> {
  const { data, error } = await supabase
    .from("vocab_list_meta")
    .insert({ user_id: USER_ID, name })
    .select("id")
    .single();
  if (error || !data) return { ok: false };
  const listId = (data as { id: string }).id;

  const base = Date.now(); // 관리 페이지처럼 입력 순서를 created_at 으로 보존
  const rows = words.map((w, i) => ({
    user_id: USER_ID,
    list_id: listId,
    word: w.word,
    meaning: w.meaning,
    created_at: new Date(base + i).toISOString(),
  }));
  const ins = await supabase
    .from("vocab_entries")
    .upsert(rows, { onConflict: "list_id,word", ignoreDuplicates: true })
    .select("word");
  if (ins.error) {
    // 방금 만든 빈 단어장만 지운다(다른 데이터는 건드리지 않음).
    await supabase.from("vocab_list_meta").delete().eq("id", listId).eq("user_id", USER_ID);
    invalidate(`vocab_lists`);
    return { ok: false };
  }
  const inserted = new Set(((ins.data as { word: string }[] | null) ?? []).map((r) => r.word));
  const added = words.map((w) => w.word).filter((w) => inserted.has(w));
  const skipped = words.map((w) => w.word).filter((w) => !inserted.has(w));

  invalidate(`vocab_lists`);
  invalidate(`vocab_entries:${listId}`);
  return { ok: true, listId, listCreated: true, added, skipped };
}
