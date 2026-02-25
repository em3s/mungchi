"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { loadFeatureFlags, isFeatureEnabled } from "@/lib/features";
import type { FeatureKey } from "@/lib/features";

/**
 * Feature flag guard (SWR).
 * 비활성 피쳐면 대시보드로 리다이렉트.
 * SWR 키 "feature_flags"를 공유해 중복 요청 제거.
 */
export function useFeatureGuard(childId: string, feature: FeatureKey) {
  const router = useRouter();
  const { data: flags } = useSWR("feature_flags", loadFeatureFlags);
  const flagsLoaded = !!flags;
  const featureDisabled = flagsLoaded && !isFeatureEnabled(childId, feature);

  useEffect(() => {
    if (featureDisabled) router.replace(`/${childId}`);
  }, [featureDisabled, childId, router]);

  return { flagsLoaded, allowed: flagsLoaded && !featureDisabled };
}

/**
 * Feature flag만 로드 (guard 없음) — 대시보드 등에서 사용.
 */
export function useFeatureFlags() {
  const { data: flags } = useSWR("feature_flags", loadFeatureFlags);
  return { flagsLoaded: !!flags };
}
