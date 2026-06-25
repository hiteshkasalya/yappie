"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "@/lib/clientSession";
import type { StoredSession } from "@/types";

export function useAnonymousSession() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      setSession(getStoredSession());
      setReady(true);
    };

    syncSession();
    window.addEventListener("yappie-session-changed", syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener("yappie-session-changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  return { session, ready };
}
