"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { loadFeatureFlags, isFeatureEnabled } from "@/lib/features";
import { getBalance } from "@/lib/coins";

/**
 * 초코 잔액 훅 (SWR).
 * feature_flags를 SWR로 공유 캐시, 잔액도 SWR 관리.
 * setCoinBalance로 거래 후 즉시 로컬 업데이트 가능.
 */
export function useCoinBalance(childId: string) {
  const { data: flags } = useSWR("feature_flags", loadFeatureFlags);
  const coinsEnabled = !!flags && isFeatureEnabled(childId, "coins");

  const { data: balance, mutate } = useSWR(
    coinsEnabled ? `coin_balance:${childId}` : null,
    () => getBalance(childId),
  );

  const setCoinBalance = useCallback(
    (val: number | null) => {
      if (val !== null) mutate(val, { revalidate: false });
    },
    [mutate],
  );

  return { coinsEnabled, coinBalance: balance ?? null, setCoinBalance };
}
