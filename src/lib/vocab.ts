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

// --- 월별 단어장 날짜 조회 (달력용) ---

export async function getVocabDates(
  childId: string,
  year: number,
  month: number, // 0-indexed (Calendar 컴포넌트 규격)
): Promise<Set<string>> {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  return cached(`vocab_dates:${childId}:${monthStr}`, DATES_TTL, async () => {
    const { data } = await supabase
      .from("vocab_entries")
      .select("date")
      .eq("child_id", childId)
      .gte("date", `${monthStr}-01`)
      .lte("date", `${monthStr}-31`);
    const dates = new Set<string>();
    if (data) {
      for (const row of data as { date: string }[]) {
        dates.add(row.date);
      }
    }
    return dates;
  });
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
  invalidate(`vocab_dates:${childId}:${date.slice(0, 7)}`);
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
  invalidate(`vocab_dates:${childId}:${date.slice(0, 7)}`);
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
