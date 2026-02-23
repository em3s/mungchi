"use client";

import { useState, useEffect, useCallback } from "react";

const EVENT_NAME = "mungchi_emoji_change";

function storageKey(userId: string) {
  return `mungchi_emoji_${userId}`;
}

export function useEmojiOverride(userId: string) {
  const [override, setOverride] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOverride(localStorage.getItem(storageKey(userId)));
    setLoaded(true);
  }, [userId]);

  // 같은 탭 내 다른 인스턴스가 이모지 변경 시 동기화
  useEffect(() => {
    function handleChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail.userId === userId) {
        setOverride(detail.emoji);
      }
    }
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, [userId]);

  const setEmoji = useCallback(
    (emoji: string | null) => {
      if (emoji) {
        localStorage.setItem(storageKey(userId), emoji);
      } else {
        localStorage.removeItem(storageKey(userId));
      }
      setOverride(emoji);
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: { userId, emoji } }),
      );
    },
    [userId],
  );

  return { override, loaded, setEmoji };
}
