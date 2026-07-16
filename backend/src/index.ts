import { createServer } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import crypto from "crypto";
import { Server, Socket } from "socket.io";
import { createPairKey } from "./lib/pairKey";
import { cleanMessage, isMessageTooLong, isTextOnlyPayload } from "./lib/safety";
import { connectToDatabase } from "./lib/mongodb";
import { runtimeStats } from "./lib/runtimeStats";
import { toPublicUser } from "./lib/publicUser";
import Block from "./models/Block";
import Friendship from "./models/Friendship";
import Message from "./models/Message";
import User, { UserDocument } from "./models/User";
import type { MatchMode, PublicUser } from "./types";

type AuthedSocket = Socket & {
  data: {
    user: UserDocument;
    currentRoom?: string;
    currentMode?: MatchMode;
    skippedPeers?: string[];
    blockedIds: Set<string>;
  };
};

type WaitingUser = {
  userId: string;
  socketId: string;
  college: string;
  skippedPeers: string[];
  blockedIds: Set<string>;
};

type ActiveRoom = {
  roomId: string;
  mode: MatchMode;
  users: [string, string];
};

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 5000);

// Supabase Init (For Magic Links Only - optional, not required for Google auth)
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
let supabase: ReturnType<typeof createClient> | null = null;
try {
  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("your-project")) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (e) {
  console.warn("[Supabase] Could not initialize client, Supabase features disabled.");
}


const JWT_SECRET = "super_secret_jwt_key_for_yappie";

const waitingRandom = new Set<WaitingUser>();
const waitingCampus = new Map<string, Set<WaitingUser>>();
const activeRooms = new Map<string, ActiveRoom>();
const socketsByUserId = new Map<string, Set<string>>();

function removeFromQueues(userId: string) {
  for (const user of waitingRandom) {
    if (user.userId === userId) {
      waitingRandom.delete(user);
    }
  }
  for (const [college, queue] of waitingCampus) {
    for (const user of queue) {
      if (user.userId === userId) {
        queue.delete(user);
      }
    }
    if (queue.size === 0) {
      waitingCampus.delete(college);
    }
  }
}

// Remove entries from queues whose sockets are no longer connected (stale entries)
function purgeStaleQueueEntries(io: Server) {
  for (const user of waitingRandom) {
    if (!io.sockets.sockets.has(user.socketId)) {
      waitingRandom.delete(user);
    }
  }
  for (const [college, queue] of waitingCampus) {
    for (const user of queue) {
      if (!io.sockets.sockets.has(user.socketId)) {
        queue.delete(user);
      }
    }
    if (queue.size === 0) {
      waitingCampus.delete(college);
    }
  }
}

async function getBlockedIds(userId: string) {
  const blocks = await Block.find({
    $or: [{ blockerId: userId }, { blockedUserId: userId }]
  });
  return new Set(blocks.flatMap((b: any) => [String(b.blockerId), String(b.blockedUserId)]));
}

function findMatch(io: Server, user: WaitingUser, queue: Set<WaitingUser>) {
  if (queue.size === 0) return null;
  for (const candidate of queue) {
    // Skip same user
    if (user.userId === candidate.userId) continue;
    // Skip blocked users
    if (user.blockedIds.has(candidate.userId)) continue;
    if (candidate.blockedIds.has(user.userId)) continue;
    // Skip previously skipped peers
    const userSkipped = user.skippedPeers || [];
    const candidateSkipped = candidate.skippedPeers || [];
    if (userSkipped.includes(candidate.userId) || candidateSkipped.includes(user.userId)) continue;
    // Skip stale sockets (disconnected without cleanup)
    if (!io.sockets.sockets.has(candidate.socketId)) {
      queue.delete(candidate);
      continue;
    }
    queue.delete(candidate);
    return candidate;
  }
  return null;
}

function addUserSocket(userId: string, socketId: string) {
  const sockets = socketsByUserId.get(userId) ?? new Set<string>();
  const isFirst = sockets.size === 0;
  sockets.add(socketId);
  socketsByUserId.set(userId, sockets);
  runtimeStats.onlineUserIds.add(userId);
  if (isFirst) {
    void User.updateOne({ _id: userId }, { isOnline: true, lastSeenAt: new Date() }).then(() => {
      void broadcastPresence(userId, true);
    });
  }
}

function removeUserSocket(userId: string, socketId: string) {
  const sockets = socketsByUserId.get(userId);
  sockets?.delete(socketId);
  if (!sockets || sockets.size === 0) {
    socketsByUserId.delete(userId);
    runtimeStats.onlineUserIds.delete(userId);
    void User.updateOne({ _id: userId }, { isOnline: false, lastSeenAt: new Date() }).then(() => {
      void broadcastPresence(userId, false);
    });
  }
}

async function broadcastPresence(userId: string, online: boolean) {
  try {
    const friendships = await Friendship.find({
      $or: [{ userId }, { friendId: userId }],
      status: "accepted"
    });
    for (const friendship of friendships) {
      const friendId = String(friendship.userId) === String(userId) ? String(friendship.friendId) : String(friendship.userId);
      emitToUser(io, friendId, "friend:presence", { friendId: userId, online });
    }
  } catch (err) {
    console.error("Error broadcasting presence:", err);
  }
}

async function getPublicUser(userId: string) {
  const user = await User.findById(userId);
  return user ? toPublicUser(user) : null;
}

function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  for (const socketId of socketsByUserId.get(userId) ?? []) {
    io.to(socketId).emit(event, payload);
  }
}

function leaveActiveRoom(io: Server, socket: AuthedSocket, notifyPeer: boolean) {
  const roomId = socket.data.currentRoom;
  if (!roomId) return;
  const room = activeRooms.get(roomId);
  socket.leave(roomId);
  socket.data.currentRoom = undefined;
  socket.data.currentMode = undefined;
  if (room) {
    activeRooms.delete(roomId);
    runtimeStats.activeChats = Math.max(0, runtimeStats.activeChats - 1);
    if (notifyPeer) {
      const peerId = room.users.find((id) => id !== String(socket.data.user._id));
      if (peerId) {
        emitToUser(io, peerId, "match:ended", { roomId });
      }
      io.in(roomId).socketsLeave(roomId);
    }
  }
}

async function saveAndEmitMessage(
  io: Server,
  socket: AuthedSocket,
  roomId: string,
  receiverId: string,
  chatType: "random" | "campus" | "friend",
  rawMessage: unknown
) {
  if (!isTextOnlyPayload(rawMessage)) {
    socket.emit("chat:error", { message: "Only text messages are allowed." });
    return;
  }
  if (isMessageTooLong(rawMessage)) {
    socket.emit("chat:error", { message: "Message is too long." });
    return;
  }

  const message = cleanMessage(rawMessage);
  let savedMessageId = crypto.randomBytes(6).toString("hex");
  let timestamp = new Date().toISOString();

  if (chatType === "friend") {
    // Check if the receiver is currently inside the active chat room
    const receiverSocketIds = socketsByUserId.get(receiverId) ?? new Set<string>();
    let receiverInRoom = false;
    for (const sid of receiverSocketIds) {
      const s = io.sockets.sockets.get(sid);
      if (s && s.rooms.has(roomId)) {
        receiverInRoom = true;
        break;
      }
    }

    const savedMessage = await Message.create({
      senderId: socket.data.user._id,
      receiverId,
      roomId,
      chatType,
      message,
      isRead: receiverInRoom
    });
    savedMessageId = String(savedMessage._id);
    timestamp = savedMessage.timestamp.toISOString();
  }

  const payload = {
    id: savedMessageId,
    roomId,
    senderId: String(socket.data.user._id),
    receiverId,
    message,
    timestamp
  };

  if (chatType === "friend") {
    emitToUser(io, String(socket.data.user._id), "chat:message", payload);
    emitToUser(io, receiverId, "chat:message", payload);
  } else {
    io.to(roomId).emit("chat:message", payload);
  }
}

const expressApp = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000"
].filter(Boolean) as string[];

expressApp.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(null, origin); // Mirror origin for dynamic frontend deployments (e.g., Vercel previews)
    }
  }, 
  credentials: true 
}));
expressApp.use(express.json());
expressApp.use(cookieParser());

expressApp.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

connectToDatabase().then(async () => {
  console.log("[Database] Connected. Resetting online statuses...");
  await User.updateMany({}, { isOnline: false });
}).catch(console.error);


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "558841127533-v0gpcqrn1f45ru62rknkm79fk73odoa9.apps.googleusercontent.com");

// Route: Verify Direct Google SDK Token
expressApp.post('/api/auth/google', async (req, res) => {
  try {
    const { token: idToken, access_token } = req.body;
    if (!idToken && !access_token) {
      return res.status(400).json({ error: 'Missing token or access_token' });
    }

    let email: string | undefined;
    let googleId: string | undefined;

    if (idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID || "558841127533-v0gpcqrn1f45ru62rknkm79fk73odoa9.apps.googleusercontent.com"
      });
      const payload = ticket.getPayload();
      if (payload) {
        email = payload.email;
        googleId = payload.sub;
      }
    } else if (access_token) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (response.ok) {
        const payload = await response.json() as { email?: string; sub?: string };
        email = payload.email;
        googleId = payload.sub;
      } else {
        throw new Error("Failed to verify access token with Google");
      }
    }

    if (!email || !googleId) {
      return res.status(400).json({ error: 'Invalid Google authentication details' });
    }

    let user = await User.findOne({ email });
    if (user && !user.googleId) {
      user.googleId = googleId;
      await user.save();
    } else if (!user) {
      const generatedUsername = `User${Math.floor(Math.random() * 10000)}`;
      user = await User.create({
        googleId,
        email,
        anonymousUsername: generatedUsername
      });
    }

    const token = jwt.sign({ internalId: String(user._id) }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('yappie_jwt', token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
    
    res.json({
      user: toPublicUser(user),
      token
    });
  } catch (error: any) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});
// Route: Verify Client-Side Supabase Session & Mint Custom JWT
expressApp.post('/api/auth/session', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Missing token' });

    // 1. Securely verify token with Supabase server client
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { data: { user: sbUser }, error } = await supabase.auth.getUser(access_token);
    if (error || !sbUser) throw error || new Error("Invalid session token");


    // 2. Link or create the MongoDB anonymous record
    let user = await User.findOne({ email: sbUser.email });
    if (user && !user.supabaseId) {
      user.supabaseId = sbUser.id;
      await user.save();
    } else if (!user) {
      const generatedUsername = `User${Math.floor(Math.random() * 10000)}`;
      user = await User.create({
        supabaseId: sbUser.id,
        email: sbUser.email,
        anonymousUsername: generatedUsername
      });
    }

    // 3. Strip everything and issue ONLY our abstract MongoDB ID in the JWT
    const token = jwt.sign({ internalId: String(user._id) }, JWT_SECRET, { expiresIn: '7d' });
    
    // Send cookie for WebSockets
    res.cookie('yappie_jwt', token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
    
    // Send standard session payload back to frontend for the 'Identity Created' modal
    res.json({
      user: toPublicUser(user),
      token
    });

  } catch (error: any) {
    console.error("Auth Session Error:", error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});




// Next.js routing removed since this is purely a backend server

const server = createServer(expressApp);

const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(null, origin);
      }
    },
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// Socket Middleware: Validate internal JWT
io.use(async (socket, nextMiddleware) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return nextMiddleware(new Error("Authentication token is missing"));

    const decoded = jwt.verify(token, JWT_SECRET) as { internalId: string };
    
    await connectToDatabase();
    const user = await User.findById(decoded.internalId);
    if (!user) return nextMiddleware(new Error("User not found"));

    socket.data.user = user;
    socket.data.blockedIds = await getBlockedIds(String(user._id));
    nextMiddleware();
  } catch (error) {
    nextMiddleware(new Error("Socket authentication failed"));
  }
});

io.on("connection", async (baseSocket) => {
  const socket = baseSocket as AuthedSocket;
  const userId = String(socket.data.user._id);

  addUserSocket(userId, socket.id);
  socket.emit("session:ready", { user: toPublicUser(socket.data.user) });

  socket.on("match:start", async ({ mode }: { mode: MatchMode }) => {
    try {
      if (mode !== "random" && mode !== "campus") {
        socket.emit("match:error", { message: "Unknown chat mode." });
        return;
      }
      leaveActiveRoom(io, socket, true);
      removeFromQueues(userId);

      const waitingUser: WaitingUser = {
        userId,
        socketId: socket.id,
        college: socket.data.user.normalizedCollege || "Unknown",
        skippedPeers: socket.data.skippedPeers || [],
        blockedIds: socket.data.blockedIds
      };

      // Purge stale disconnected entries before matching
      purgeStaleQueueEntries(io);

      let queue = mode === "random" ? waitingRandom : waitingCampus.get(waitingUser.college);
      if (!queue) {
        queue = new Set();
        if (mode === "campus") waitingCampus.set(waitingUser.college, queue);
      }
      
      const candidate = findMatch(io, waitingUser, queue);

      if (!candidate) {
        queue.add(waitingUser);
        socket.emit("match:waiting", {
          mode,
          message: mode === "campus" ? "No one from your college is online right now." : "Looking for a stranger..."
        });
        return;
      }

      const candidateSocket = io.sockets.sockets.get(candidate.socketId) as AuthedSocket | undefined;
      const peer = await getPublicUser(candidate.userId);
      const currentUser = await getPublicUser(userId);

      if (!candidateSocket || !peer || !currentUser) {
        // Candidate socket disappeared between findMatch and here — put current user in queue
        queue.add(waitingUser);
        socket.emit("match:waiting", {
          mode,
          message: mode === "campus" ? "No one from your college is online right now." : "Looking for a stranger..."
        });
        return;
      }

      const roomId = `sonder:${mode}:${crypto.randomUUID()}`;
      const room: ActiveRoom = { roomId, mode, users: [userId, candidate.userId] };
      activeRooms.set(roomId, room);
      runtimeStats.activeChats += 1;

      socket.join(roomId);
      candidateSocket.join(roomId);
      socket.data.currentRoom = roomId;
      socket.data.currentMode = mode;
      candidateSocket.data.currentRoom = roomId;
      candidateSocket.data.currentMode = mode;

      socket.emit("match:found", { roomId, peer, mode });
      candidateSocket.emit("match:found", { roomId, peer: currentUser, mode });
    } catch (err) {
      console.error("Error in match:start:", err);
      socket.emit("match:error", { message: "An error occurred while finding a match." });
    }
  });

  socket.on("chat:typing", ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
    if (socket.data.currentRoom === roomId) {
      socket.to(roomId).emit("chat:typing", { userId, isTyping: Boolean(isTyping) });
    } else if (roomId.startsWith("friend:")) {
      const parts = roomId.replace("friend:", "").split(":");
      const receiverId = parts.find((id) => id !== userId);
      if (receiverId) {
        emitToUser(io, receiverId, "chat:typing", { roomId, userId, isTyping: Boolean(isTyping) });
      }
    }
  });

  socket.on("chat:message", async ({ roomId, message }: { roomId: string; message: unknown }) => {
    const room = activeRooms.get(roomId);
    if (!room || socket.data.currentRoom !== roomId) {
      socket.emit("chat:error", { message: "Chat room is no longer active." });
      return;
    }
    const receiverId = room.users.find((id) => id !== userId);
    if (!receiverId) {
      socket.emit("chat:error", { message: "No receiver found for this room." });
      return;
    }
    await saveAndEmitMessage(io, socket, roomId, receiverId, room.mode, message);
  });

  socket.on("match:next", () => {
    const roomId = socket.data.currentRoom;
    if (roomId) {
      const room = activeRooms.get(roomId);
      if (room) {
        const peerId = room.users.find((id) => id !== userId);
        if (peerId) {
          socket.data.skippedPeers = socket.data.skippedPeers || [];
          if (!socket.data.skippedPeers.includes(peerId)) {
            socket.data.skippedPeers.push(peerId);
          }
        }
      }
    }
    leaveActiveRoom(io, socket, true);
    removeFromQueues(userId);
    socket.emit("match:idle");
  });

  socket.on("match:leave", () => {
    leaveActiveRoom(io, socket, true);
    removeFromQueues(userId);
    socket.emit("match:idle");
  });

  socket.on("friend:request:send", async ({ roomId, friendshipId }: { roomId: string; friendshipId: string }) => {
    const room = activeRooms.get(roomId);
    if (!room || socket.data.currentRoom !== roomId) return;
    const receiverId = room.users.find((id) => id !== userId);
    if (!receiverId) return;
    const currentUser = await getPublicUser(userId);
    if (!currentUser) return;
    emitToUser(io, receiverId, "friend:request:received", { friendshipId, sender: currentUser });
  });

  socket.on("friend:request:accept", async ({ roomId, friendshipId }: { roomId: string; friendshipId: string }) => {
    const room = activeRooms.get(roomId);
    if (room && socket.data.currentRoom === roomId) {
      io.to(roomId).emit("friend:request:accepted", { friendshipId });
      return;
    }
    try {
      const friendship = await Friendship.findById(friendshipId);
      if (friendship) {
        const peerId = String(friendship.userId) === String(userId) ? String(friendship.friendId) : String(friendship.userId);
        emitToUser(io, peerId, "friend:request:accepted", { friendshipId });
      }
    } catch (err) {
      console.error("Error in friend:request:accept socket handler:", err);
    }
  });

  socket.on("friend:join", async ({ friendId }: { friendId: string }) => {
    const pairKey = createPairKey(userId, friendId);
    const friendship = await Friendship.findOne({ pairKey, status: "accepted" });
    if (!friendship) {
      socket.emit("chat:error", { message: "Friend chat is not available." });
      return;
    }
    const roomId = `friend:${pairKey}`;
    socket.join(roomId);
    socket.emit("friend:joined", { roomId });
  });

  socket.on("friend:message", async ({ friendId, message }: { friendId: string; message: unknown }) => {
    const pairKey = createPairKey(userId, friendId);
    const roomId = `friend:${pairKey}`;
    if (!socket.rooms.has(roomId)) {
      const friendship = await Friendship.findOne({ pairKey, status: "accepted" });
      if (!friendship) {
        socket.emit("chat:error", { message: "Friend chat is not available." });
        return;
      }
      socket.join(roomId);
    }
    await saveAndEmitMessage(io, socket, roomId, friendId, "friend", message);
  });

  socket.on("user:block", async ({ blockedUserId }: { blockedUserId: string }) => {
    if (!blockedUserId || blockedUserId === userId) return;
    socket.data.blockedIds.add(blockedUserId);
    await Block.updateOne(
      { pairKey: `${userId}:${blockedUserId}` },
      { $setOnInsert: { blockerId: userId, blockedUserId, pairKey: `${userId}:${blockedUserId}` } },
      { upsert: true }
    );
    await Friendship.deleteOne({ pairKey: createPairKey(userId, blockedUserId) });
    leaveActiveRoom(io, socket, true);
  });

  socket.on("disconnect", () => {
    removeUserSocket(userId, socket.id);
    // Short grace period for quick reconnects (e.g., WebSocket upgrade)
    setTimeout(() => {
      const sockets = socketsByUserId.get(userId);
      if (!sockets || sockets.size === 0) {
        leaveActiveRoom(io, socket, true);
        removeFromQueues(userId);
      }
      // Also purge any other stale queue entries
      purgeStaleQueueEntries(io);
    }, 1000);
  });
});

// Periodic stale-socket purge (catches any zombies missed by disconnect handlers)
setInterval(() => {
  purgeStaleQueueEntries(io);
}, 30 * 1000);

setInterval(() => {
  const url = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
  fetch(url).catch(() => {});
}, 8 * 60 * 1000);

server.listen(port, hostname, () => {
  console.log(`Yappie is running on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
});
