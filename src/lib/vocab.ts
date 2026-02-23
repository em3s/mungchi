// 영어 단어장 시스템 — 사전 검색, 단어 관리, 퀴즈

import { supabase } from "@/lib/supabase/client";
import { cached, invalidate } from "@/lib/cache";
import { STATIC_DICT } from "@/lib/dictionary-data";
import {
  seedStatic,
  syncDynamic,
  getAllWords,
  clearDynamicCache,
  resetAll,
} from "@/lib/dict-db";
import type { DictionaryEntry, VocabEntry, VocabQuizType } from "@/lib/types";

const ENTRIES_TTL = 30_000; // 30초
const DATES_TTL = 30_000; // 30초
const CONFIG_TTL = 60_000; // 1분

// --- 사전: IndexedDB(정적+동적) → 메모리 캐시 ---

let dictCache: DictionaryEntry[] | null = null;

export async function loadDictionary(): Promise<DictionaryEntry[]> {
  if (dictCache) return dictCache;

  // 1. 정적 데이터를 IndexedDB에 시드 (최초 1회 또는 버전 변경 시)
  await seedStatic(STATIC_DICT);

  // 2. Supabase에서 전체 사전 가져오기
  const { data } = await supabase
    .from("dictionary")
    .select("*")
    .order("word");
  const allDbEntries = (data as DictionaryEntry[]) ?? [];

  // DB word→UUID 매핑 (정적 단어의 실제 UUID 보존용)
  const dbIdMap = new Map<string, string>();
  for (const e of allDbEntries) {
    dbIdMap.set(e.word, e.id);
  }

  // 동적 단어만 IndexedDB에 동기화
  const staticWords = new Set(STATIC_DICT.map(([w]) => w));
  const dynamicOnly = allDbEntries.filter((e) => !staticWords.has(e.word));
  await syncDynamic(dynamicOnly);

  // 3. IndexedDB에서 전체 로드 → 메모리 캐시 (DB UUID 우선 사용)
  const rows = await getAllWords();
  dictCache = rows.map((r) => ({
    id: r.dbId ?? dbIdMap.get(r.word) ?? `s:${r.word}`,
    word: r.word,
    meaning: r.meaning,
    level: r.level,
  }));
  return dictCache;
}

export async function invalidateDictionary(): Promise<void> {
  await clearDynamicCache();
  dictCache = null;
}

// IndexedDB 전체 초기화 + 재로드 (설정에서 사전 리로드)
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

export async function getVocabLists(
  childId: string,
): Promise<{ date: string; count: number; spellingCount: number; title: string }[]> {
  return cached(`vocab_lists:${childId}`, DATES_TTL, async () => {
    const [entriesRes, metaRes] = await Promise.all([
      supabase.from("vocab_entries").select("date, spelling").eq("user_id", childId),
      supabase
        .from("vocab_list_meta")
        .select("date, title")
        .eq("user_id", childId),
    ]);
    const counts = new Map<string, { total: number; spelling: number }>();
    if (entriesRes.data) {
      for (const row of entriesRes.data as { date: string; spelling: boolean }[]) {
        const prev = counts.get(row.date) ?? { total: 0, spelling: 0 };
        prev.total += 1;
        if (row.spelling) prev.spelling += 1;
        counts.set(row.date, prev);
      }
    }
    const titles = new Map<string, string>();
    if (metaRes.data) {
      for (const row of metaRes.data as { date: string; title: string }[]) {
        titles.set(row.date, row.title);
      }
    }
    return Array.from(counts.entries())
      .map(([date, c]) => ({
        date,
        count: c.total,
        spellingCount: c.spelling,
        title: titles.get(date) ?? "",
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  });
}

// --- 단어장 제목 ---

export async function setListTitle(
  childId: string,
  date: string,
  title: string,
): Promise<boolean> {
  const { error } = await supabase.from("vocab_list_meta").upsert({
    user_id: childId,
    date,
    title,
  });
  if (error) return false;
  invalidate(`vocab_lists:${childId}`);
  return true;
}

// --- 단어 목록 ---

export async function getEntries(
  childId: string,
  date: string,
): Promise<VocabEntry[]> {
  return cached(`vocab_entries:${childId}:${date}`, ENTRIES_TTL, async () => {
    const { data } = await supabase
      .from("vocab_entries")
      .select("*")
      .eq("user_id", childId)
      .eq("date", date)
      .order("created_at");
    return (data as VocabEntry[]) ?? [];
  });
}

export async function addEntry(
  childId: string,
  date: string,
  dictEntry: DictionaryEntry | null,
  custom?: { word: string; meaning: string },
): Promise<{ ok: boolean; entry?: VocabEntry }> {
  const word = dictEntry?.word ?? custom?.word;
  const meaning = dictEntry?.meaning ?? custom?.meaning;
  if (!word || !meaning) return { ok: false };

  const row: Record<string, unknown> = {
    user_id: childId,
    date,
    word,
    meaning,
  };
  if (dictEntry) row.dictionary_id = dictEntry.id;

  const { data, error } = await supabase
    .from("vocab_entries")
    .insert(row)
    .select()
    .single();
  if (error) return { ok: false };
  invalidate(`vocab_entries:${childId}:${date}`);
  invalidate(`vocab_lists:${childId}`);
  return { ok: true, entry: data as VocabEntry };
}

export async function removeEntry(
  childId: string,
  date: string,
  entryId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_entries")
    .delete()
    .eq("id", entryId);
  if (error) return false;
  invalidate(`vocab_entries:${childId}:${date}`);
  invalidate(`vocab_lists:${childId}`);
  return true;
}

// --- 스펠링 토글 ---

export async function toggleSpelling(
  childId: string,
  date: string,
  entryId: string,
  value: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_entries")
    .update({ spelling: value })
    .eq("id", entryId);
  if (error) return false;
  invalidate(`vocab_entries:${childId}:${date}`);
  invalidate(`vocab_lists:${childId}`);
  return true;
}

// --- 날짜 변경 ---

export async function updateVocabDate(
  childId: string,
  oldDate: string,
  newDate: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_entries")
    .update({ date: newDate })
    .eq("user_id", childId)
    .eq("date", oldDate);
  if (error) return false;
  invalidate(`vocab_entries:${childId}:${oldDate}`);
  invalidate(`vocab_entries:${childId}:${newDate}`);
  invalidate(`vocab_lists:${childId}`);
  return true;
}

// --- 퀴즈 ---

// 여러 날짜의 퀴즈 완료 상태를 한번에 조회
export async function getQuizStatuses(
  childId: string,
  dates: string[],
): Promise<Map<string, { basic: boolean; spelling: boolean }>> {
  const result = new Map<string, { basic: boolean; spelling: boolean }>();
  for (const d of dates) result.set(d, { basic: false, spelling: false });
  if (dates.length === 0) return result;

  const { data } = await supabase
    .from("vocab_quizzes")
    .select("date, quiz_type")
    .eq("user_id", childId)
    .in("date", dates)
    .gt("candy_earned", 0);

  for (const row of (data ?? []) as { date: string; quiz_type: string }[]) {
    const s = result.get(row.date);
    if (s) {
      if (row.quiz_type === "basic") s.basic = true;
      if (row.quiz_type === "spelling") s.spelling = true;
    }
  }
  return result;
}

export async function hasEarnedToday(
  childId: string,
  date: string,
  quizType: VocabQuizType,
): Promise<boolean> {
  const { count } = await supabase
    .from("vocab_quizzes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", childId)
    .eq("date", date)
    .eq("quiz_type", quizType)
    .gt("candy_earned", 0);
  return (count ?? 0) > 0;
}

export async function saveQuizResult(
  childId: string,
  date: string,
  quizType: VocabQuizType,
  totalQuestions: number,
  correctAnswers: number,
  candyEarned: number,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("vocab_quizzes").insert({
    user_id: childId,
    date,
    quiz_type: quizType,
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
    candy_earned: candyEarned,
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
  const scored = pool.map((e) => ({
    entry: e,
    dist: levenshtein(word, e.word.toLowerCase()),
  }));
  // 가까운 순 정렬, 같은 거리면 랜덤
  scored.sort((a, b) => a.dist - b.dist || Math.random() - 0.5);
  // dist=0 제외 (동일 단어)
  return scored.filter((s) => s.dist > 0).slice(0, count).map((s) => s.entry);
}

