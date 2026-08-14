"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AuthSession,
  clearSession,
  readSession,
  SESSION_EXPIRED_EVENT,
  tokenExpirationMs,
} from "./auth";

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

  useEffect(() => {
    const handleExpiredSession = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession);

    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const remaining = tokenExpirationMs(session.token) - Date.now();

    const timer = window.setTimeout(() => {
      clearSession();
      setSession(null);
    }, Math.max(0, Math.min(remaining, 2_147_483_647)));

    return () => window.clearTimeout(timer);
  }, [session]);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return { session, isReady, logout };
}
