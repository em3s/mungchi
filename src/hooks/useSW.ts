"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export function useSW() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // 이미 waiting 중인 SW 감지 (앱 재진입 시)
      if (reg.waiting) {
        waitingRef.current = reg.waiting;
        setUpdateAvailable(true);
        return;
      }

      // 새 SW 설치 감지
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            // 새 SW가 설치 완료 → 업데이트 가능
            waitingRef.current = newSW;
            setUpdateAvailable(true);
          }
        });
      });
    });

    // controllerchange 시 페이지 리로드
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingRef.current) {
      waitingRef.current.postMessage({ type: "SKIP_WAITING" });
    }
  }, []);

  return { updateAvailable, applyUpdate };
}
