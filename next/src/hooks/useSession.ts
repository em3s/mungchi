"use client";

import { useState, useEffect, useCallback } from "react";

const SESSION_KEY = "mungchi_session";

export function useSession() {
  const [childId, setChildId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setChildId(localStorage.getItem(SESSION_KEY));
    setLoaded(true);
  }, []);

  const login = useCallback((id: string) => {
    localStorage.setItem(SESSION_KEY, id);
    setChildId(id);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setChildId(null);
  }, []);

  return { childId, loaded, login, logout };
}
