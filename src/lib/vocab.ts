// 영어 단어장 시스템 — 사전 검색, 단어 관리, 퀴즈

import { supabase } from "@/lib/supabase/client";
import { cached, invalidate } from "@/lib/cache";
import { STATIC_DICT } from "@/lib/dictionary-data";
import {
  seedStatic,
  syncDynamic,
  getAllWords,
  resetAll,
} from "@/lib/dict-db";
import type { DictionaryEntry, VocabEntry, VocabQuizType } from "@/lib/types";

const USER_ID = "sihyun";

// --- 오늘의 단어장 ---

export const DAILY_LIST_ID = "daily";
export const DAILY_WORD_COUNT = 10;

/** djb2 해시 → 32bit 정수 */
function hashSeed(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** 시드 기반 PRNG (Mulberry32) */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 날짜 시드로 오늘의 단어 10개 선택 */
export function getDailyWords(date: string): VocabEntry[] {
  const seed = hashSeed(date);
  const rng = mulberry32(seed);

  const indices = Array.from({ length: STATIC_DICT.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const count = Math.min(DAILY_WORD_COUNT, STATIC_DICT.length);
  return indices.slice(0, count).map((idx, i) => {
    const [word, meaning, level] = STATIC_DICT[idx];
    return {
      id: `daily-${i}`,
      user_id: USER_ID,
      list_id: DAILY_LIST_ID,
      dictionary_id: null,
      word,
      meaning,
      spelling: level <= 2,
    };
  });
}

const ENTRIES_TTL = 30_000;
const LISTS_TTL = 30_000;
const CONFIG_TTL = 60_000;

// --- 사전: IndexedDB(정적+동적) → 메모리 캐시 ---

let dictCache: DictionaryEntry[] | null = null;
let dictPromise: Promise<DictionaryEntry[]> | null = null;

export async function loadDictionary(): Promise<DictionaryEntry[]> {
  if (dictCache) return dictCache;
  if (dictPromise) return dictPromise;

  dictPromise = (async () => {
    try {
      return await _loadDictionaryImpl();
    } finally {
      dictPromise = null;
    }
  })();
  return dictPromise;
}

async function _loadDictionaryImpl(): Promise<DictionaryEntry[]> {
  await seedStatic(STATIC_DICT);

  const { data } = await supabase
    .from("dictionary")
    .select("*")
    .order("word");
  const allDbEntries = (data as DictionaryEntry[]) ?? [];

  const dbIdMap = new Map<string, string>();
  for (const e of allDbEntries) {
    dbIdMap.set(e.word, e.id);
  }

  const staticWords = new Set(STATIC_DICT.map(([w]) => w));
  const dynamicOnly = allDbEntries.filter((e) => !staticWords.has(e.word));
  await syncDynamic(dynamicOnly);

  const rows = await getAllWords();
  dictCache = rows.map((r) => ({
    id: r.dbId ?? dbIdMap.get(r.word) ?? `s:${r.word}`,
    word: r.word,
    meaning: r.meaning,
    level: r.level,
  }));
  return dictCache;
}

export async function reloadDictionary(): Promise<number> {
  await resetAll();
  dictCache = null;
  const entries = await loadDictionary();
  return entries.length;
}

// --- 사전 검색 (메모리 prefix 매칭) ---

export function searchDictionary(
  query: string,
  limit = 8,
): DictionaryEntry[] {
  if (!dictCache || !query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  const results: DictionaryEntry[] = [];
  for (const entry of dictCache) {
    if (entry.word.startsWith(q)) {
      results.push(entry);
      if (results.length >= limit) break;
    }
  }
  return results;
}

// --- 단어장 목록 조회 ---

export async function getVocabLists(): Promise<
  { id: string; name: string; count: number; spellingCount: number; createdAt: string }[]
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
        .select("list_id, total, spelling_count")
        .eq("user_id", USER_ID),
    ]);

    const counts = new Map<string, { total: number; spelling: number }>();
    if (countsRes.data) {
      for (const row of countsRes.data as {
        list_id: string;
        total: number;
        spelling_count: number;
      }[]) {
        counts.set(row.list_id, { total: row.total, spelling: row.spelling_count });
      }
    }

    const lists = (metaRes.data ?? []) as { id: string; name: string; created_at: string }[];
    return lists.map((meta) => {
      const c = counts.get(meta.id) ?? { total: 0, spelling: 0 };
      return {
        id: meta.id,
        name: meta.name,
        count: c.total,
        spellingCount: c.spelling,
        createdAt: meta.created_at,
      };
    });
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

export async function addEntry(
  listId: string,
  dictEntry: DictionaryEntry | null,
  custom?: { word: string; meaning: string },
): Promise<{ ok: boolean; entry?: VocabEntry; duplicate?: boolean }> {
  const word = dictEntry?.word ?? custom?.word;
  const meaning = dictEntry?.meaning ?? custom?.meaning;
  if (!word || !meaning) return { ok: false };

  const row: Record<string, unknown> = {
    user_id: USER_ID,
    list_id: listId,
    word,
    meaning,
  };
  if (dictEntry) row.dictionary_id = dictEntry.id;

  const { data, error } = await supabase
    .from("vocab_entries")
    .insert(row)
    .select()
    .single();
  if (error) return { ok: false, duplicate: error.code === "23505" };
  invalidate(`vocab_entries:${listId}`);
  invalidate(`vocab_lists`);
  return { ok: true, entry: data as VocabEntry };
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

// --- 스펠링 토글 ---

export async function toggleSpelling(
  listId: string,
  entryId: string,
  value: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_entries")
    .update({ spelling: value })
    .eq("id", entryId);
  if (error) return false;
  invalidate(`vocab_entries:${listId}`);
  invalidate(`vocab_lists`);
  return true;
}

// --- 퀴즈 ---

export async function getQuizStatuses(
  listIds: string[],
): Promise<Map<string, { basic: boolean; spelling: boolean }>> {
  const result = new Map<string, { basic: boolean; spelling: boolean }>();
  for (const id of listIds) result.set(id, { basic: false, spelling: false });
  if (listIds.length === 0) return result;

  const { data } = await supabase
    .from("vocab_quizzes")
    .select("list_id, quiz_type")
    .eq("user_id", USER_ID)
    .in("list_id", listIds)
    .gt("correct_answers", 0);

  for (const row of (data ?? []) as { list_id: string; quiz_type: string }[]) {
    const s = result.get(row.list_id);
    if (s) {
      if (row.quiz_type === "basic") s.basic = true;
      if (row.quiz_type === "spelling") s.spelling = true;
    }
  }
  return result;
}

export async function saveQuizResult(
  listId: string,
  quizType: VocabQuizType,
  totalQuestions: number,
  correctAnswers: number,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("vocab_quizzes").insert({
    user_id: USER_ID,
    list_id: listId,
    quiz_type: quizType,
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
    candy_earned: 0,
  });
  return { ok: !error };
}

// --- 보상 설정 ---

export async function getVocabConfig(): Promise<Record<string, number>> {
  return cached("vocab_config", CONFIG_TTL, async () => {
    const { data } = await supabase.from("vocab_config").select("*");
    const config: Record<string, number> = {};
    if (data) {
      for (const row of data as { key: string; value: number }[]) {
        config[row.key] = row.value;
      }
    }
    return config;
  });
}

export async function setVocabConfig(
  key: string,
  value: number,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_config")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) return false;
  invalidate("vocab_config");
  return true;
}

// --- 퀴즈 선택지 생성 ---

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

/** 정답과 비슷한 단어를 우선 뽑되, 부족하면 랜덤으로 채움 */
export function getSimilarWords(
  targetWord: string,
  excludeWords: string[],
  count: number,
): DictionaryEntry[] {
  if (!dictCache) return [];
  const excludeSet = new Set(excludeWords);
  const pool = dictCache.filter((e) => !excludeSet.has(e.word));
  if (pool.length === 0) return [];

  const word = targetWord.toLowerCase();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const scored = shuffled.map((e) => ({
    entry: e,
    dist: levenshtein(word, e.word.toLowerCase()),
  }));
  scored.sort((a, b) => a.dist - b.dist);
  return scored.filter((s) => s.dist > 0).slice(0, count).map((s) => s.entry);
}
