// 피쳐플래그 — DB 기본값 + localStorage override
// 우선순위: localStorage override > DB값 > 코드 기본값

import { supabase } from "@/lib/supabase/client";
import { cached, invalidate } from "@/lib/cache";

const CODE_DEFAULTS = {
  sihyun: { map: true },
  misong: { map: false },
} as const;

type ChildId = keyof typeof CODE_DEFAULTS;
export type FeatureKey = keyof (typeof CODE_DEFAULTS)[ChildId];

const STORAGE_KEY = "mungchi_feature_overrides";
const CACHE_TTL = 60_000; // 1분

export const ALL_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "map", label: "쌍둥이별" },
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
        if (!map[row.child_id]) map[row.child_id] = {};
        map[row.child_id][row.feature] = row.enabled;
      }
    }
    return map;
  });
  flagsSnapshot = flags;
  return flags;
}

function getDbValue(childId: string, feature: string): boolean | undefined {
  return flagsSnapshot[childId]?.[feature];
}

// --- localStorage override ---
type Overrides = Partial<Record<string, Partial<Record<string, boolean>>>>;

function getOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function isFeatureEnabled(
  childId: string,
  feature: FeatureKey
): boolean {
  const override = getOverrides()[childId]?.[feature];
  if (override !== undefined) return override;
  const db = getDbValue(childId, feature);
  if (db !== undefined) return db;
  const flags = CODE_DEFAULTS[childId as ChildId];
  if (!flags) return true;
  return flags[feature] ?? true;
}

// --- DB 토글 (admin용) ---
export async function setFeatureFlag(
  childId: string,
  feature: FeatureKey,
  enabled: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("feature_flags")
    .upsert({ child_id: childId, feature, enabled });
  if (error) return false;
  invalidate("feature_flags");
  // 스냅샷도 즉시 갱신
  if (!flagsSnapshot[childId]) flagsSnapshot[childId] = {};
  flagsSnapshot[childId][feature] = enabled;
  return true;
}

// --- localStorage override (세션용) ---
export function setFeatureOverride(
  childId: string,
  feature: FeatureKey,
  value: boolean | null
): void {
  const overrides = getOverrides();
  if (value === null) {
    if (overrides[childId]) {
      delete overrides[childId]![feature];
      if (Object.keys(overrides[childId]!).length === 0)
        delete overrides[childId];
    }
  } else {
    if (!overrides[childId]) overrides[childId] = {};
    overrides[childId]![feature] = value;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getFeatureState(
  childId: string,
  feature: FeatureKey
): {
  db: boolean;
  override: boolean | undefined;
  effective: boolean;
} {
  const dbVal = getDbValue(childId, feature);
  const codeDefault =
    CODE_DEFAULTS[childId as ChildId]?.[feature] ?? true;
  const db = dbVal !== undefined ? dbVal : codeDefault;
  const override = getOverrides()[childId]?.[feature];
  return {
    db,
    override,
    effective: override !== undefined ? override : db,
  };
}
