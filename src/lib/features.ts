// 피쳐플래그 — DB 기반 토글
// 우선순위: DB값 > 코드 기본값

import { supabase } from "@/lib/supabase/client";
import { cached, invalidate } from "@/lib/cache";

// stable = 기본 활성 (DB 없어도 보임)
// testing = 기본 비활성 (DB에서 true로 활성화해야 보임)
type Stage = "stable" | "testing";

const CODE_DEFAULTS = {
  sihyun: { map: "testing", star: "testing", coins: "testing", vocab: "testing", game: "testing" },
  misong: { map: "testing", star: "testing", coins: "testing", vocab: "testing", game: "testing" },
  dad: { map: "testing", star: "testing", coins: "testing", vocab: "testing", game: "testing" },
  mom: { map: "testing", star: "testing", coins: "testing", vocab: "testing", game: "testing" },
} as const;

type UserId = keyof typeof CODE_DEFAULTS;
export type FeatureKey = keyof (typeof CODE_DEFAULTS)[UserId];

const CACHE_TTL = 60_000; // 1분

export const ALL_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "map", label: "쌍둥이별" },
  { key: "star", label: "반짝별" },
  { key: "coins", label: "초코" },
  { key: "vocab", label: "영어단어" },
  { key: "game", label: "공룡 달리기" },
];

// --- DB (캐시 경유) ---
type FlagMap = Record<string, Record<string, boolean>>;
let flagsSnapshot: FlagMap = {};

export async function loadFeatureFlags(): Promise<FlagMap> {
  const flags = await cached<FlagMap>("feature_flags", CACHE_TTL, async () => {
    const { data } = await supabase.from("feature_flags").select("*");
    const map: FlagMap = {};
    if (data) {
      for (const row of data) {
        if (!map[row.user_id]) map[row.user_id] = {};
        map[row.user_id][row.feature] = row.enabled;
      }
    }
    return map;
  });
  flagsSnapshot = flags;
  return flags;
}

function getDbValue(userId: string, feature: string): boolean | undefined {
  return flagsSnapshot[userId]?.[feature];
}

function stageToDefault(stage: Stage): boolean {
  return stage === "stable";
}

export function isFeatureEnabled(
  userId: string,
  feature: FeatureKey,
): boolean {
  const db = getDbValue(userId, feature);
  if (db !== undefined) return db;
  const flags = CODE_DEFAULTS[userId as UserId];
  if (!flags) return false;
  return stageToDefault(flags[feature] ?? "testing");
}

// --- DB 토글 (admin용) ---
export async function setFeatureFlag(
  userId: string,
  feature: FeatureKey,
  enabled: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("feature_flags")
    .upsert({ user_id: userId, feature, enabled });
  if (error) return false;
  invalidate("feature_flags");
  if (!flagsSnapshot[userId]) flagsSnapshot[userId] = {};
  flagsSnapshot[userId][feature] = enabled;
  return true;
}

export function getFeatureState(
  userId: string,
  feature: FeatureKey
): { db: boolean; effective: boolean } {
  const dbVal = getDbValue(userId, feature);
  const stage = CODE_DEFAULTS[userId as UserId]?.[feature] ?? "testing";
  const codeDefault = stageToDefault(stage);
  const db = dbVal !== undefined ? dbVal : codeDefault;
  return { db, effective: db };
}
