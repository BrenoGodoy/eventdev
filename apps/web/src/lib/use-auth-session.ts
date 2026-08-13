"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthSession, clearSession, readSession } from "./auth";

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      setSession(readSession());
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return { session, isReady, logout };
}
