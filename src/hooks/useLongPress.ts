"use client";

import { useRef, useMemo } from "react";

export function useLongPress(callback: () => void, ms = 800) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  return useMemo(() => {
    function start() {
      timerRef.current = setTimeout(() => callbackRef.current(), ms);
    }
    function cancel() {
      clearTimeout(timerRef.current);
    }
    return {
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
      onTouchMove: cancel,
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
    };
  }, [ms]);
}
