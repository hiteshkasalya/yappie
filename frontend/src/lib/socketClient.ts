"use client";

import { io, Socket } from "socket.io-client";
import type { StoredSession } from "@/types";

let socket: Socket | null = null;
let activeSessionId: string | null = null;

export function getSocket(session: StoredSession) {
  if (socket && activeSessionId === session.user.id) {
    return socket;
  }

  socket?.disconnect();
  activeSessionId = session.user.id;
  socket = io(process.env.NEXT_PUBLIC_API_URL || "https://yappie-72iy.onrender.com", {
    path: "/socket.io",
    auth: {
      userId: session.user.id,
      token: session.token
    },
    transports: ["websocket", "polling"]
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  activeSessionId = null;
}
