import { useEffect, useRef, useState } from "react";

const THRESHOLD = 70;
const MAX_PULL = 120;
const DAMPING = 0.5;

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  enabled = true,
) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      setPullDistance(0);
      return;
    }
    let startY: number | null = null;
    let currentDist = 0;
    let isRefreshing = false;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || isRefreshing) return;
      startY = e.touches[0].clientY;
      currentDist = 0;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY === null || isRefreshing) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 0 && window.scrollY === 0) {
        currentDist = Math.min(MAX_PULL, diff * DAMPING);
        setPullDistance(currentDist);
        if (e.cancelable) e.preventDefault();
      }
    }

    async function onTouchEnd() {
      if (startY === null) return;
      const finalDist = currentDist;
      startY = null;
      currentDist = 0;

      if (finalDist >= THRESHOLD && !isRefreshing) {
        isRefreshing = true;
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        try {
          await onRefreshRef.current();
        } finally {
          isRefreshing = false;
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled]);

  return { pullDistance, refreshing, threshold: THRESHOLD };
}
