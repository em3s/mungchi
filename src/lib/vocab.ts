// 영어 단어장 시스템 — 사전 검색, 단어 관리, 퀴즈

import { supabase } from "@/lib/supabase/client";
import { cached, invalidate } from "@/lib/cache";
import type { DictionaryEntry, VocabEntry, VocabQuizType } from "@/lib/types";

const ENTRIES_TTL = 30_000; // 30초
const DATES_TTL = 30_000; // 30초
const CONFIG_TTL = 60_000; // 1분

// --- 사전 검색 (autocomplete) ---

export async function searchDictionary(
  query: string,
  limit = 8,
): Promise<DictionaryEntry[]> {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  const { data } = await supabase
    .from("dictionary")
    .select("*")
    .ilike("word", `${q}%`)
    .order("word")
    .limit(limit);
  return (data as DictionaryEntry[]) ?? [];
}

// --- 단어장 목록 조회 ---

export async function getVocabLists(
  childId: string,
): Promise<{ date: string; count: number; title: string }[]> {
  return cached(`vocab_lists:${childId}`, DATES_TTL, async () => {
    const [entriesRes, metaRes] = await Promise.all([
      supabase.from("vocab_entries").select("date").eq("child_id", childId),
      supabase
        .from("vocab_list_meta")
        .select("date, title")
        .eq("child_id", childId),
    ]);
    const counts = new Map<string, number>();
    if (entriesRes.data) {
      for (const row of entriesRes.data as { date: string }[]) {
        counts.set(row.date, (counts.get(row.date) ?? 0) + 1);
      }
    }
    const titles = new Map<string, string>();
    if (metaRes.data) {
      for (const row of metaRes.data as { date: string; title: string }[]) {
        titles.set(row.date, row.title);
      }
    }
    return Array.from(counts.entries())
      .map(([date, count]) => ({ date, count, title: titles.get(date) ?? "" }))
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
    child_id: childId,
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
      .eq("child_id", childId)
      .eq("date", date)
      .order("created_at");
    return (data as VocabEntry[]) ?? [];
  });
}

export async function addEntry(
  childId: string,
  date: string,
  dictEntry: DictionaryEntry,
): Promise<{ ok: boolean; entry?: VocabEntry }> {
  const { data, error } = await supabase
    .from("vocab_entries")
    .insert({
      child_id: childId,
      date,
      dictionary_id: dictEntry.id,
      word: dictEntry.word,
      meaning: dictEntry.meaning,
    })
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

// --- 날짜 변경 ---

export async function updateVocabDate(
  childId: string,
  oldDate: string,
  newDate: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("vocab_entries")
    .update({ date: newDate })
    .eq("child_id", childId)
    .eq("date", oldDate);
  if (error) return false;
  invalidate(`vocab_entries:${childId}:${oldDate}`);
  invalidate(`vocab_entries:${childId}:${newDate}`);
  invalidate(`vocab_lists:${childId}`);
  return true;
}

// --- 퀴즈 ---

export async function hasEarnedToday(
  childId: string,
  date: string,
  quizType: VocabQuizType,
): Promise<boolean> {
  const { count } = await supabase
    .from("vocab_quizzes")
    .select("*", { count: "exact", head: true })
    .eq("child_id", childId)
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
    child_id: childId,
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

// --- 퀴즈 선택지 생성 (객관식용 오답) ---

export async function getRandomWords(
  excludeIds: string[],
  count: number,
): Promise<DictionaryEntry[]> {
  const filter =
    excludeIds.length > 0
      ? `(${excludeIds.join(",")})`
      : "(00000000-0000-0000-0000-000000000000)";
  const { data } = await supabase
    .from("dictionary")
    .select("*")
    .not("id", "in", filter)
    .limit(count * 3);
  if (!data || data.length === 0) return [];
  const shuffled = (data as DictionaryEntry[]).sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
