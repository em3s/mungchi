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
    let mousePressed = false;

    function tryStart(y: number) {
      if (window.scrollY > 0 || isRefreshing) return;
      startY = y;
      currentDist = 0;
    }

    function tryMove(
      y: number,
      e?: { cancelable: boolean; preventDefault: () => void },
    ) {
      if (startY === null || isRefreshing) return;
      const diff = y - startY;
      if (diff > 0 && window.scrollY === 0) {
        currentDist = Math.min(MAX_PULL, diff * DAMPING);
        setPullDistance(currentDist);
        if (e?.cancelable) e.preventDefault();
      } else if (diff <= 0 && currentDist > 0) {
        currentDist = 0;
        setPullDistance(0);
      }
    }

    async function tryEnd() {
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

    function onTouchStart(e: TouchEvent) {
      tryStart(e.touches[0].clientY);
    }
    function onTouchMove(e: TouchEvent) {
      tryMove(e.touches[0].clientY, e);
    }
    function onTouchEnd() {
      tryEnd();
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      mousePressed = true;
      tryStart(e.clientY);
    }
    function onMouseMove(e: MouseEvent) {
      if (!mousePressed) return;
      tryMove(e.clientY);
    }
    function onMouseUp() {
      if (!mousePressed) return;
      mousePressed = false;
      tryEnd();
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [enabled]);

  return { pullDistance, refreshing, threshold: THRESHOLD };
}
