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
    let pressed = false;

    function onDown(e: PointerEvent) {
      if (window.scrollY > 0 || isRefreshing) return;
      pressed = true;
      startY = e.clientY;
      currentDist = 0;
    }

    function onMove(e: PointerEvent) {
      if (!pressed || startY === null || isRefreshing) return;
      const diff = e.clientY - startY;
      if (diff > 0 && window.scrollY === 0) {
        currentDist = Math.min(MAX_PULL, diff * DAMPING);
        setPullDistance(currentDist);
        if (e.cancelable && e.pointerType === "touch") e.preventDefault();
      } else if (diff <= 0 && currentDist > 0) {
        currentDist = 0;
        setPullDistance(0);
      }
    }

    async function finish() {
      if (!pressed) return;
      pressed = false;
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

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [enabled]);

  return { pullDistance, refreshing, threshold: THRESHOLD };
}
