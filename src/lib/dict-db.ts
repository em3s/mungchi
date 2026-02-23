// IndexedDB 기반 사전 저장소 (Dexie.js)
// 정적 데이터(코드) + 동적 데이터(Supabase) 모두 저장
// SSR 환경에서는 indexedDB가 없으므로 lazy 초기화

import Dexie, { type EntityTable } from "dexie";

export interface DictRow {
  word: string; // PK
  meaning: string;
  level: number;
  source: "static" | "dynamic"; // 정적(코드) vs 동적(DB 추가)
  dbId?: string; // Supabase UUID (동적만)
}

type DictDB = Dexie & {
  words: EntityTable<DictRow, "word">;
  meta: EntityTable<{ key: string; value: string }, "key">;
};

let _db: DictDB | null = null;

function getDb(): DictDB {
  if (_db) return _db;
  _db = new Dexie("mungchi-dict") as DictDB;
  _db.version(1).stores({
    words: "word, source",
    meta: "key",
  });
  return _db;
}

// 정적 데이터 시드 (최초 1회)
export async function seedStatic(
  entries: [string, string, number][],
): Promise<void> {
  const db = getDb();
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
  const db = getDb();
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
  return getDb().words.orderBy("word").toArray();
}

// 동적 데이터 초기화 (admin에서 단어 추가 후)
export async function clearDynamicCache(): Promise<void> {
  await getDb().words.where("source").equals("dynamic").delete();
}
