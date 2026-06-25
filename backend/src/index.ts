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
    lastMessageTime?: number;
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

async function getBlockedIds(userId: string) {
  const blocks = await Block.find({
    $or: [{ blockerId: userId }, { blockedUserId: userId }]
  });
  return new Set(blocks.flatMap((b: any) => [String(b.blockerId), String(b.blockedUserId)]));
}

function findMatch(user: WaitingUser, queue: Set<WaitingUser>) {
  if (queue.size === 0) return null;
  for (const candidate of queue) {
    if (user.userId === candidate.userId) continue;
    if (user.blockedIds.has(candidate.userId)) continue;
    if (candidate.blockedIds.has(user.userId)) continue;
    const userSkipped = user.skippedPeers || [];
    const candidateSkipped = candidate.skippedPeers || [];
    if (userSkipped.includes(candidate.userId) || candidateSkipped.includes(user.userId)) continue;
    queue.delete(candidate);
    return candidate;
  }
  for (const candidate of queue) {
    if (user.userId === candidate.userId) continue;
    if (user.blockedIds.has(candidate.userId)) continue;
    if (candidate.blockedIds.has(user.userId)) continue;
    queue.delete(candidate);
    return candidate;
  }
  return null;
}

function addUserSocket(userId: string, socketId: string) {
  const sockets = socketsByUserId.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  socketsByUserId.set(userId, sockets);
  runtimeStats.onlineUserIds.add(userId);
}

function removeUserSocket(userId: string, socketId: string) {
  const sockets = socketsByUserId.get(userId);
  sockets?.delete(socketId);
  if (!sockets || sockets.size === 0) {
    socketsByUserId.delete(userId);
    runtimeStats.onlineUserIds.delete(userId);
    void User.updateOne({ _id: userId }, { isOnline: false, lastSeenAt: new Date() });
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
    const savedMessage = await Message.create({
      senderId: socket.data.user._id,
      receiverId,
      roomId,
      chatType,
      message
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

connectToDatabase().then(async () => {
  console.log("[Database] Connected. Resetting online statuses...");
  await User.updateMany({}, { isOnline: false });
}).catch(console.error);


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "558841127533-v0gpcqrn1f45ru62rknkm79fk73odoa9.apps.googleusercontent.com");

// Route: Verify Direct Google SDK Token
expressApp.post('/api/auth/google', async (req, res) => {
  try {
    const { token: idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Missing token' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID || "558841127533-v0gpcqrn1f45ru62rknkm79fk73odoa9.apps.googleusercontent.com"
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new Error("Invalid Google token payload");

    let user = await User.findOne({ email: payload.email });
    if (user && !user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    } else if (!user) {
      const generatedUsername = `User${Math.floor(Math.random() * 10000)}`;
      user = await User.create({
        googleId: payload.sub,
        email: payload.email,
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
  await User.updateOne({ _id: userId }, { isOnline: true, lastSeenAt: new Date() });
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

      let queue = mode === "random" ? waitingRandom : waitingCampus.get(waitingUser.college);
      if (!queue) {
        queue = new Set();
        if (mode === "campus") waitingCampus.set(waitingUser.college, queue);
      }
      
      const candidate = findMatch(waitingUser, queue);

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
        socket.emit("match:waiting", { mode, message: "Looking for someone online..." });
        queue.add(waitingUser);
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
    const friendship = await Friendship.findOne({ pairKey, status: "accepted" });
    if (!friendship) {
      socket.emit("chat:error", { message: "Friend chat is not available." });
      return;
    }
    socket.join(roomId);
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
    setTimeout(() => {
      const sockets = socketsByUserId.get(userId);
      if (!sockets || sockets.size === 0) {
        leaveActiveRoom(io, socket, true);
        removeFromQueues(userId);
      }
    }, 5000);
  });
});

setInterval(() => {
  const url = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
  fetch(url).catch(() => {});
}, 8 * 60 * 1000);

server.listen(port, hostname, () => {
  console.log(`Yappie is running on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
});
