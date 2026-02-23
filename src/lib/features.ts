// 피쳐플래그 — 아이별 기능 활성/비활성
export const FEATURE_FLAGS = {
  sihyun: {
    map: true,
  },
  misong: {
    map: false,
  },
} as const;

type ChildId = keyof typeof FEATURE_FLAGS;
type FeatureKey = keyof (typeof FEATURE_FLAGS)[ChildId];

export function isFeatureEnabled(
  childId: string,
  feature: FeatureKey
): boolean {
  const flags = FEATURE_FLAGS[childId as ChildId];
  if (!flags) return true;
  return flags[feature] ?? true;
}
