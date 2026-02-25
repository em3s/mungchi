"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
import { loadFeatureFlags } from "@/lib/features";

/**
 * Supabase Realtime으로 feature_flags 변경 구독.
 * 변경 감지 시 SWR "feature_flags" 캐시를 무효화하여 모든 useFeatureGuard 자동 갱신.
 * 앱 루트(UpdateButton)에서 한 번만 호출.
 */
export function useRealtimeFeatureFlags() {
  useEffect(() => {
    const channel = supabase
      .channel("feature_flags_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        () => {
          // flagsSnapshot도 갱신하기 위해 loadFeatureFlags를 fetcher로 전달
          mutate("feature_flags", loadFeatureFlags());
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
