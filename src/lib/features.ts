// 피쳐플래그 — 아이별 기능 활성/비활성
// 코드 기본값 + localStorage override 지원

export const FEATURE_FLAGS = {
  sihyun: {
    map: true,
  },
  misong: {
    map: false,
  },
} as const;

type ChildId = keyof typeof FEATURE_FLAGS;
export type FeatureKey = keyof (typeof FEATURE_FLAGS)[ChildId];

const STORAGE_KEY = "mungchi_feature_overrides";

export const ALL_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "map", label: "쌍둥이별" },
];

type Overrides = Partial<Record<ChildId, Partial<Record<FeatureKey, boolean>>>>;

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
  const override = getOverrides()[childId as ChildId]?.[feature];
  if (override !== undefined) return override;
  const flags = FEATURE_FLAGS[childId as ChildId];
  if (!flags) return true;
  return flags[feature] ?? true;
}

export function setFeatureOverride(
  childId: string,
  feature: FeatureKey,
  value: boolean | null
): void {
  const overrides = getOverrides();
  const cid = childId as ChildId;
  if (value === null) {
    if (overrides[cid]) {
      delete overrides[cid]![feature];
      if (Object.keys(overrides[cid]!).length === 0) delete overrides[cid];
    }
  } else {
    if (!overrides[cid]) overrides[cid] = {};
    overrides[cid]![feature] = value;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getFeatureState(
  childId: string,
  feature: FeatureKey
): { default: boolean; override: boolean | undefined; effective: boolean } {
  const flags = FEATURE_FLAGS[childId as ChildId];
  const defaultVal = flags ? (flags[feature] ?? true) : true;
  const override = getOverrides()[childId as ChildId]?.[feature];
  return {
    default: defaultVal,
    override,
    effective: override !== undefined ? override : defaultVal,
  };
}
