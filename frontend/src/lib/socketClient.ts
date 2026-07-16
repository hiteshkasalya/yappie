"use client";

import { io, Socket } from "socket.io-client";
import type { StoredSession } from "@/types";

let socket: Socket | null = null;
let activeSessionId: string | null = null;

export function getSocket(session: StoredSession): Socket {
  // Return existing socket if same user is already connected
  if (socket && activeSessionId === session.user.id) {
    return socket;
  }

  // Disconnect old socket for different user
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  activeSessionId = session.user.id;
  socket = io(process.env.NEXT_PUBLIC_API_URL || "https://yappie-72iy.onrender.com", {
    path: "/socket.io",
    auth: {
      userId: session.user.id,
      token: session.token
    },
    // WebSocket first — skips HTTP polling upgrade race condition
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 20000
  });

  return socket;
}

/**
 * Returns a promise that resolves when the socket is connected.
 * If already connected, resolves immediately.
 */
export function whenSocketReady(session: StoredSession): Promise<Socket> {
  const sock = getSocket(session);
  if (sock.connected) {
    return Promise.resolve(sock);
  }
  return new Promise((resolve) => {
    const onConnect = () => {
      sock.off("connect", onConnect);
      resolve(sock);
    };
    sock.on("connect", onConnect);
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  activeSessionId = null;
}
