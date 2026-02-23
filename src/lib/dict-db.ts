// IndexedDB 기반 사전 저장소 (Dexie.js)
// 정적 데이터(코드) + 동적 데이터(Supabase) 모두 저장

import Dexie, { type EntityTable } from "dexie";

export interface DictRow {
  word: string; // PK
  meaning: string;
  level: number;
  source: "static" | "dynamic"; // 정적(코드) vs 동적(DB 추가)
  dbId?: string; // Supabase UUID (동적만)
}

const db = new Dexie("mungchi-dict") as Dexie & {
  words: EntityTable<DictRow, "word">;
  meta: EntityTable<{ key: string; value: string }, "key">;
};

db.version(1).stores({
  words: "word, source",
  meta: "key",
});

// 정적 데이터 시드 (최초 1회)
export async function seedStatic(
  entries: [string, string, number][],
): Promise<void> {
  const ver = await db.meta.get("static_version");
  const currentVer = String(entries.length); // 단어 수가 바뀌면 재시드
  if (ver?.value === currentVer) return;

  // 기존 정적 데이터 삭제 후 재삽입
  await db.words.where("source").equals("static").delete();
  const rows: DictRow[] = entries.map(([word, meaning, level]) => ({
    word,
    meaning,
    level,
    source: "static",
  }));
  await db.words.bulkPut(rows);
  await db.meta.put({ key: "static_version", value: currentVer });
}

// 동적 데이터 동기화 (Supabase → IndexedDB)
export async function syncDynamic(
  entries: { id: string; word: string; meaning: string; level: number }[],
): Promise<void> {
  // 기존 동적 데이터 제거 → 최신으로 교체
  await db.words.where("source").equals("dynamic").delete();
  const rows: DictRow[] = entries.map((e) => ({
    word: e.word,
    meaning: e.meaning,
    level: e.level,
    source: "dynamic",
    dbId: e.id,
  }));
  if (rows.length > 0) await db.words.bulkPut(rows);
}

// 전체 사전 조회 (알파벳순)
export async function getAllWords(): Promise<DictRow[]> {
  return db.words.orderBy("word").toArray();
}

// prefix 검색
export async function searchWords(
  prefix: string,
  limit = 8,
): Promise<DictRow[]> {
  if (!prefix) return [];
  const q = prefix.toLowerCase();
  // Dexie의 where+startsWith로 IndexedDB 인덱스 활용
  return db.words
    .where("word")
    .startsWith(q)
    .limit(limit)
    .toArray();
}

// 동적 데이터 초기화 (admin에서 단어 추가 후)
export async function clearDynamicCache(): Promise<void> {
  await db.words.where("source").equals("dynamic").delete();
}
