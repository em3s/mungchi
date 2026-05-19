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

// --- 단어장 이름 변경 ---

export async function renameList(
  listId: string,
  name: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_list_meta")
    .update({ name })
    .eq("id", listId);
  if (error) return false;
  invalidate(`vocab_lists`);
  return true;
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
