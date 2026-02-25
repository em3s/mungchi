"use client";

import { useSW } from "@/hooks/useSW";
import { useRealtimeFeatureFlags } from "@/hooks/useRealtimeFeatureFlags";

export function UpdateButton() {
  const { updateAvailable, applyUpdate } = useSW();

  // Supabase Realtime — feature_flags 변경 시 SWR 캐시 자동 갱신
  useRealtimeFeatureFlags();

  if (!updateAvailable) return null;

  return (
    <button
      onClick={applyUpdate}
      className="fixed top-16 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium z-[90] shadow-lg active:scale-95 transition-transform"
    >
      새 버전이 있어요! 업데이트
    </button>
  );
}
