// 영어 단어장 — 화면용 API 호출(브라우저). DB 는 서버(/api/vocab)만 만진다.

import { cached, invalidate } from "@/lib/cache";
import type { VocabEntry } from "@/lib/types";

const ENTRIES_TTL = 30_000;
const LISTS_TTL = 30_000;

/** 세션이 끊기면(401) 화면이 PIN 을 다시 띄우도록 알린다. */
export const AUTH_EXPIRED_EVENT = "mungchi-auth-expired";

async function call<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch("/api/vocab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (r.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// --- 단어장 목록 조회 ---

export async function getVocabLists(): Promise<{ id: string; name: string; count: number; createdAt: string }[]> {
  return cached(`vocab_lists`, LISTS_TTL, async () => {
    const r = await call<{ lists: { id: string; name: string; count: number; createdAt: string }[] }>({ op: "lists" });
    return r?.lists ?? [];
  });
}

// --- 단어장 만들기(제목이 같아도 새 단어장, 목록 맨 위) ---

export async function addList(
  title: string,
  words: { word: string; meaning: string }[],
): Promise<{ ok: boolean; listId?: string }> {
  const r = await call<{ ok: boolean; listId?: string }>({ op: "addList", title, words });
  invalidate(`vocab_lists`);
  return r && r.ok ? { ok: true, listId: r.listId } : { ok: false };
}

export async function deleteList(listId: string): Promise<boolean> {
  const r = await call<{ ok: boolean }>({ op: "deleteList", listId });
  if (!r?.ok) return false;
  invalidate(`vocab_lists`);
  return true;
}

// --- 단어 목록 ---

export async function getEntries(listId: string): Promise<VocabEntry[]> {
  return cached(`vocab_entries:${listId}`, ENTRIES_TTL, async () => {
    const r = await call<{ entries: VocabEntry[] }>({ op: "entries", listId });
    return r?.entries ?? [];
  });
}

export async function removeEntry(listId: string, entryId: string): Promise<boolean> {
  const r = await call<{ ok: boolean }>({ op: "removeEntry", entryId });
  if (!r?.ok) return false;
  invalidate(`vocab_entries:${listId}`);
  invalidate(`vocab_lists`);
  return true;
}

// --- 단어 수정 ---

export async function updateEntry(listId: string, entryId: string, word: string, meaning: string): Promise<boolean> {
  const r = await call<{ ok: boolean }>({ op: "updateEntry", entryId, word, meaning });
  if (!r?.ok) return false;
  invalidate(`vocab_entries:${listId}`);
  return true;
}
