"use client";

import { useState, useEffect } from "react";
import { isFeatureEnabled } from "@/lib/features";
import { getBalance } from "@/lib/coins";

/**
 * 초코 잔액 훅 — flagsLoaded가 true일 때 coins 피쳐 확인 후 잔액 조회.
 * setCoinBalance를 노출해서 거래 후 로컬 업데이트 가능.
 */
export function useCoinBalance(childId: string, flagsLoaded: boolean) {
  const [coinsEnabled, setCoinsEnabled] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!flagsLoaded) return;
    const on = isFeatureEnabled(childId, "coins");
    setCoinsEnabled(on);
    if (on) getBalance(childId).then(setCoinBalance);
  }, [childId, flagsLoaded]);

  return { coinsEnabled, coinBalance, setCoinBalance };
}
