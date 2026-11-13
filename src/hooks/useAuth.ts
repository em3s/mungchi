"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_EXPIRED_EVENT } from "@/lib/vocab";

/** 서버 세션(쿠키)으로 로그인 여부를 확인한다. API 가 401 을 주면 다시 PIN 을 띄운다. */
export function useAuth() {
  const [authed, setAuthed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pin", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAuthed(d?.authed === true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    const expire = () => setAuthed(false);
    window.addEventListener(AUTH_EXPIRED_EVENT, expire);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
    };
  }, []);

  const onPinSuccess = useCallback(() => setAuthed(true), []);
  return { authed, loaded, onPinSuccess };
}
