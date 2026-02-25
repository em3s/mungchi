"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import type { FeatureKey } from "@/lib/features";

/**
 * Feature flag guard — 비활성 피쳐면 대시보드로 리다이렉트.
 * flagsLoaded=false 또는 allowed=false면 페이지에서 null 반환.
 */
export function useFeatureGuard(childId: string, feature: FeatureKey) {
  const router = useRouter();
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  useEffect(() => {
    loadFeatureFlags().then(() => setFlagsLoaded(true));
  }, []);

  const featureDisabled = flagsLoaded && !isFeatureEnabled(childId, feature);

  useEffect(() => {
    if (featureDisabled) router.replace(`/${childId}`);
  }, [featureDisabled, childId, router]);

  return { flagsLoaded, allowed: flagsLoaded && !featureDisabled };
}
