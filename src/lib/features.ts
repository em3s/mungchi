// 피쳐플래그 — DB 기반 토글
// 우선순위: DB값 > 코드 기본값

import { supabase } from "@/lib/supabase/client";
import { mutate } from "swr";

// stable = 기본 활성 (DB 없어도 보임)
// testing = 기본 비활성 (DB에서 true로 활성화해야 보임)
type Stage = "stable" | "testing";

const CODE_DEFAULTS = {
  sihyun: { map: "testing", star: "testing", coins: "testing", vocab: "testing", game: "testing", weather: "testing" },
  misong: { map: "testing", star: "testing", coins: "testing", vocab: "testing", game: "testing", weather: "testing" },
  dad: { map: "testing", star: "testing", coins: "testing", vocab: "testing", game: "testing", weather: "testing" },
  mom: { map: "testing", star: "testing", coins: "testing", vocab: "testing", game: "testing", weather: "testing" },
} as const;

type UserId = keyof typeof CODE_DEFAULTS;
export type FeatureKey = keyof (typeof CODE_DEFAULTS)[UserId];

export const ALL_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "map", label: "쌍둥이별" },
  { key: "star", label: "반짝별" },
  { key: "coins", label: "초코" },
  { key: "vocab", label: "영어단어" },
  { key: "game", label: "미니게임" },
  { key: "weather", label: "날씨" },
];

// --- DB (SWR 캐시) ---
type FlagMap = Record<string, Record<string, boolean>>;
let flagsSnapshot: FlagMap = {};

export async function loadFeatureFlags(): Promise<FlagMap> {
  const { data, error } = await supabase.from("feature_flags").select("*");
  if (error) return flagsSnapshot;
  const map: FlagMap = {};
  if (data) {
    for (const row of data) {
      if (!map[row.user_id]) map[row.user_id] = {};
      map[row.user_id][row.feature] = row.enabled;
    }
  }
  flagsSnapshot = map;
  return map;
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
  // 낙관적 업데이트 (UI 즉시 반영)
  const prevValue = flagsSnapshot[userId]?.[feature];
  if (!flagsSnapshot[userId]) flagsSnapshot[userId] = {};
  flagsSnapshot[userId][feature] = enabled;

  const { error } = await supabase
    .from("feature_flags")
    .upsert({ user_id: userId, feature, enabled });

  if (error) {
    // DB 실패 시 롤백
    if (prevValue !== undefined) {
      flagsSnapshot[userId][feature] = prevValue;
    } else {
      delete flagsSnapshot[userId][feature];
    }
    return false;
  }

  mutate("feature_flags");
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
