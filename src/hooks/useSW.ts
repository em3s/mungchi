"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Service Worker 업데이트 감지.
 * 피쳐플래그 변경은 useRealtimeFlags (Supabase Realtime)가 담당.
 */
export function useSW() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let interval: ReturnType<typeof setInterval>;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      if (reg.waiting) {
        waitingRef.current = reg.waiting;
        setUpdateAvailable(true);
        return;
      }

      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            waitingRef.current = newSW;
            setUpdateAvailable(true);
          }
        });
      });

      // 60초마다 새 SW 체크 (iPad PWA 대응)
      interval = setInterval(() => reg.update(), 60_000);
    }).catch((err) => {
      console.error("[SW] registration failed:", err);
    });

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingRef.current) {
      waitingRef.current.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }, []);

  return { updateAvailable, applyUpdate };
}
