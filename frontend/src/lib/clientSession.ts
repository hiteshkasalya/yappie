"use client";

import type { StoredSession } from "@/types";

const sessionKey = "yappie.session";

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(sessionKey);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as StoredSession;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function saveStoredSession(session: StoredSession) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  window.dispatchEvent(new Event("yappie-session-changed"));
}

export function clearStoredSession() {
  window.localStorage.removeItem(sessionKey);
  window.dispatchEvent(new Event("yappie-session-changed"));
}

export function authHeaders(session: StoredSession) {
  return {
    "Content-Type": "application/json",
    "x-user-id": session.user.id,
    "x-session-token": session.token
  };
}

export async function authFetch(path: string, init: RequestInit = {}) {
  const session = getStoredSession();

  if (!session) {
    throw new Error("Anonymous session is missing");
  }

  return fetch(path, {
    ...init,
    headers: {
      ...authHeaders(session),
      ...(init.headers ?? {})
    }
  });
}
