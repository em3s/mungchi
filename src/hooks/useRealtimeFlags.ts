"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";

/**
 * Feature flag Realtime 구독.
 * DB 변경 시 SWR "feature_flags" 캐시를 자동 무효화.
 * 앱 루트(layout 또는 dashboard)에서 한 번 호출.
 */
export function useRealtimeFlags() {
  useEffect(() => {
    const channel = supabase
      .channel("feature_flags_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        () => {
          mutate("feature_flags");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
