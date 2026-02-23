"use client";

import { useState, useEffect, useCallback } from "react";

const EVENT_NAME = "mungchi_theme_change";

function storageKey(userId: string) {
  return `mungchi_theme_${userId}`;
}

export function useThemeOverride(userId: string) {
  const [override, setOverride] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOverride(localStorage.getItem(storageKey(userId)));
    setLoaded(true);
  }, [userId]);

  // 같은 탭 내 다른 인스턴스가 테마 변경 시 동기화
  useEffect(() => {
    function handleChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail.userId === userId) {
        setOverride(detail.presetId);
      }
    }
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, [userId]);

  const setTheme = useCallback(
    (presetId: string | null) => {
      if (presetId) {
        localStorage.setItem(storageKey(userId), presetId);
      } else {
        localStorage.removeItem(storageKey(userId));
      }
      setOverride(presetId);
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: { userId, presetId } }),
      );
    },
    [userId],
  );

  return { override, loaded, setTheme };
}
