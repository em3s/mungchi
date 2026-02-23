"use client";

import { useState, useEffect, useCallback } from "react";

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

  const setTheme = useCallback(
    (presetId: string | null) => {
      if (presetId) {
        localStorage.setItem(storageKey(userId), presetId);
      } else {
        localStorage.removeItem(storageKey(userId));
      }
      setOverride(presetId);
    },
    [userId],
  );

  return { override, loaded, setTheme };
}
