// 피쳐플래그 — API Route 경유 DB 기본값 + localStorage override
// 우선순위: localStorage override > DB값 > 코드 기본값

import { cached, invalidate } from "./cache";

const CODE_DEFAULTS = {
  sihyun: { map: true },
  misong: { map: false },
} as const;

type ChildId = keyof typeof CODE_DEFAULTS;
export type FeatureKey = keyof (typeof CODE_DEFAULTS)[ChildId];

const STORAGE_KEY = "mungchi_feature_overrides";

export const ALL_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "map", label: "쌍둥이별" },
];

// --- DB (API Route 경유) ---
type FlagMap = Record<string, Record<string, boolean>>;
let flagsSnapshot: FlagMap = {};

export async function loadFeatureFlags(): Promise<FlagMap> {
  const flags = await cached<FlagMap>("feature_flags", 60_000, async () => {
    const res = await fetch("/api/features");
    return res.ok ? await res.json() : {};
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
  const res = await fetch("/api/features", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ child_id: childId, feature, enabled }),
  });
  if (!res.ok) return false;
  // 스냅샷 즉시 갱신 + 캐시 무효화
  if (!flagsSnapshot[childId]) flagsSnapshot[childId] = {};
  flagsSnapshot[childId][feature] = enabled;
  invalidate("feature_flags");
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
