"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

export function useSW() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  // --- SW 업데이트 감지 ---
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
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    return () => clearInterval(interval);
  }, []);

  // --- 피쳐플래그 변경 감지 ---
  useEffect(() => {
    let initial: string | null = null;
    let interval: ReturnType<typeof setInterval>;

    async function fetchFlags(): Promise<string> {
      const { data } = await supabase.from("feature_flags").select("*");
      return JSON.stringify(data ?? []);
    }

    fetchFlags().then((snap) => {
      initial = snap;

      interval = setInterval(async () => {
        const current = await fetchFlags();
        if (initial && current !== initial) {
          setUpdateAvailable(true);
          clearInterval(interval);
        }
      }, 60_000); // 60초마다 체크
    });

    return () => clearInterval(interval);
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingRef.current) {
      waitingRef.current.postMessage({ type: "SKIP_WAITING" });
      // controllerchange가 reload 처리
    } else {
      window.location.reload();
    }
  }, []);

  return { updateAvailable, applyUpdate };
}
