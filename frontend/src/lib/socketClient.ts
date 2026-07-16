"use client";

import { io, Socket } from "socket.io-client";
import type { StoredSession } from "@/types";

let socket: Socket | null = null;
let activeSessionId: string | null = null;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://yappie-72iy.onrender.com";

export function getSocket(session: StoredSession): Socket {
  if (socket && activeSessionId === session.user.id) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  activeSessionId = session.user.id;
  socket = io(BACKEND_URL, {
    path: "/socket.io",
    auth: {
      userId: session.user.id,
      token: session.token
    },
    // WebSocket first — no HTTP polling upgrade race
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 30000,  // Long timeout for Render cold start (can take 30-60s)
    forceNew: false
  });

  return socket;
}

/**
 * Returns a promise that resolves when the socket is connected.
 * Handles Render cold-start: keeps retrying even after connect_error.
 * Also notifies caller of connection attempt status via onStatus callback.
 */
export function whenSocketReady(
  session: StoredSession,
  onStatus?: (msg: string) => void
): Promise<Socket> {
  const sock = getSocket(session);

  if (sock.connected) {
    return Promise.resolve(sock);
  }

  return new Promise((resolve, reject) => {
    let resolved = false;

    const onConnect = () => {
      if (resolved) return;
      resolved = true;
      sock.off("connect", onConnect);
      sock.off("connect_error", onError);
      resolve(sock);
    };

    const onError = (err: Error) => {
      const isAuthError = 
        err.message.toLowerCase().includes("auth") || 
        err.message.toLowerCase().includes("token") || 
        err.message.toLowerCase().includes("user not found");

      if (isAuthError) {
        if (resolved) return;
        resolved = true;
        sock.off("connect", onConnect);
        sock.off("connect_error", onError);
        reject(new Error(err.message));
        return;
      }

      // Render cold start — backend is waking up, keep waiting
      if (onStatus) {
        onStatus("Waking up server... please wait a moment");
      }
      console.warn("[socket] connect_error:", err.message, "— retrying...");
      // socket.io will auto-retry, we just wait for the next connect event
    };

    sock.on("connect", onConnect);
    sock.on("connect_error", onError);
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  activeSessionId = null;
}
