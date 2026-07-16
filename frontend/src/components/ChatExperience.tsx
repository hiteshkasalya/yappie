"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Flag,
  ArrowLeft,
  Check,
  Send
} from "lucide-react";
import { authFetch } from "@/lib/clientSession";
import { getSocket, whenSocketReady } from "@/lib/socketClient";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import type { ChatMessage, MatchMode, PublicUser } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { COLLEGES } from "./CollegeSelectorModal";

type MatchState = "idle" | "waiting" | "matched";

/* ─── Web Audio Synthesizer ──────────────────────────────── */
function playSound(type: "join" | "leave") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (type === "join") {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.10, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.28);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.28);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.10, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    }
  } catch { /* safari may block */ }
}

/* ─── System message helper ──────────────────────────────── */
function sysMsg(text: string, roomId = ""): ChatMessage {
  return {
    id: `sys-${Date.now()}-${Math.random()}`,
    senderId: "system",
    receiverId: "system",
    message: text,
    timestamp: new Date().toISOString(),
    roomId,
  };
}

/* ─── Main Component ─────────────────────────────────────── */
export function ChatExperience({ mode, friendId }: { mode?: MatchMode; friendId?: string }) {
  const router = useRouter();
  const { session, ready } = useAnonymousSession();

  // Stable session ref so socket listeners never close over stale session
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const [state, setState] = useState<MatchState>("idle");
  const [roomId, setRoomId] = useState("");
  const [peer, setPeer] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [typing, setTyping] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<
    "none" | "pending_sent" | "pending_received" | "accepted"
  >("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<{
    friendshipId: string; sender: PublicUser;
  } | null>(null);
  const [showRequestMenu, setShowRequestMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false); // tracks whether THIS mount is alive
  const chatStartTimestampRef = useRef<number | null>(null);

  // Refs so socket listeners always read latest values without re-subscribing
  const peerRef = useRef<PublicUser | null>(null);
  const stateRef = useRef<MatchState>("idle");
  const roomIdRef = useRef<string>("");

  useEffect(() => { peerRef.current = peer; }, [peer]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  const waitingCopy = useMemo(() =>
    mode ? (mode === "campus" ? "Finding someone from your campus..." : "Searching for a stranger...") : "",
    [mode]);

  /* ── iOS Visual Viewport fix ─────────────────────────── */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !rootRef.current) return;
    const adjust = () => {
      if (!rootRef.current) return;
      rootRef.current.style.height = `${vv.height}px`;
      rootRef.current.style.top = `${vv.offsetTop}px`;
    };
    vv.addEventListener("resize", adjust);
    vv.addEventListener("scroll", adjust);
    adjust();
    return () => {
      vv.removeEventListener("resize", adjust);
      vv.removeEventListener("scroll", adjust);
    };
  }, []);

  /* ── Redirect if no session ──────────────────────────── */
  useEffect(() => {
    if (ready && !session) router.push("/");
  }, [ready, router, session]);

  /* ── Auto-scroll on new messages ────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Friend Chat loading logic ────────────────────────── */
  useEffect(() => {
    if (!friendId || !session) return;

    let active = true;

    async function loadFriendChat() {
      try {
        // Try to load friend details from session storage cache first
        let currentFriend: any = null;
        if (typeof window !== "undefined") {
          try {
            const cached = sessionStorage.getItem("yappie_friends_list");
            if (cached) {
              const cachedFriends = JSON.parse(cached) as any[];
              currentFriend = cachedFriends.find(
                (item: any) => item.friend.id === friendId && item.status === "accepted"
              );
            }
          } catch (e) {
            console.error("Error reading friends cache:", e);
          }
        }

        // If found in cache, set peer immediately so user sees the header and input bar instantly!
        if (currentFriend && active) {
          setPeer(currentFriend.friend);
          setFriendshipStatus("accepted");
          setFriendshipId(currentFriend.friendshipId);
        }

        // Fetch friend details from network (if not in cache or to refresh status) and history in parallel
        const [friendsRes, historyRes] = await Promise.all([
          !currentFriend ? authFetch(`/api/friends?friendId=${friendId}`) : Promise.resolve(null),
          authFetch(`/api/messages/friend/${friendId}`)
        ]);

        if (friendsRes && friendsRes.ok && active) {
          const friendsData = await friendsRes.json() as { friends: any[] };
          const networkFriend = friendsData.friends.find(
            (item: any) => item.friend.id === friendId && item.status === "accepted"
          );
          if (networkFriend) {
            setPeer(networkFriend.friend);
            setFriendshipStatus("accepted");
            setFriendshipId(networkFriend.friendshipId);
          } else if (!currentFriend) {
            setStatus("Friend chat is not available.");
            return;
          }
        } else if (!friendsRes && !currentFriend && active) {
          setStatus("Friend chat is not available.");
          return;
        }

        if (historyRes && historyRes.ok && active) {
          const historyData = await historyRes.json() as { messages: ChatMessage[] };
          setMessages(historyData.messages ?? []);
        }

        // Connect socket and join friend room
        const socket = getSocket(session!);
        socket.emit("friend:join", { friendId });
      } catch (err) {
        console.error("Failed to load friend chat:", err);
      }
    }

    void loadFriendChat();

    return () => {
      active = false;
    };
  }, [friendId, session]);

  /* ── Friend Chat socket events effect ────────────────── */
  useEffect(() => {
    if (!friendId || !session) return;

    const socket = getSocket(session);

    const onJoined = (payload: { roomId: string }) => {
      setRoomId(payload.roomId);
      setState("matched");
      setStatus("");
      chatStartTimestampRef.current = Date.now();
      trackEvent("chat_connected", { chat_mode: "friend", college: sessionRef.current?.user?.college });
      trackEvent("chat_started", { chat_mode: "friend", college: sessionRef.current?.user?.college });
    };

    const onMessage = (incoming: ChatMessage) => {
      const friendRoomId = friendId ? `friend:${[sessionRef.current?.user.id || "", friendId].sort().join(":")}` : "";
      const isExpectedRoom = roomIdRef.current
        ? incoming.roomId === roomIdRef.current
        : (friendId && incoming.roomId === friendRoomId);

      if (isExpectedRoom) {
        setMessages(cur => {
          if (incoming.senderId === sessionRef.current?.user.id) {
            const idx = cur.findIndex(m => m.senderId === incoming.senderId && m.status === "sending" && m.message === incoming.message);
            if (idx !== -1) {
              const updated = [...cur];
              updated[idx] = incoming;
              return updated;
            }
          }
          if (cur.some(m => m.id === incoming.id)) {
            return cur;
          }
          return [...cur, incoming];
        });
      }
    };

    const onTyping = (payload: { userId: string; isTyping: boolean }) => {
      if (payload.userId === friendId) {
        setTyping(payload.isTyping);
      }
    };

    const onError = (payload: { message: string }) => {
      setStatus(payload.message);
    };

    socket.on("friend:joined", onJoined);
    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    socket.on("chat:error", onError);

    return () => {
      socket.off("friend:joined", onJoined);
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("chat:error", onError);
    };
  }, [friendId, session]);

  /* ── Core Socket Effect ──────────────────────────────── */
  useEffect(() => {
    if (friendId) return; // Skip matching logic in friend mode
    if (!session) return;

    // Mark this mount as active; cleanup will flip this to false
    mountedRef.current = true;

    const socket = getSocket(session);

    // Cancel any leftover cleanup timer from a previous (Strict Mode) mount
    if ((socket as any)._cleanupTimer) {
      clearTimeout((socket as any)._cleanupTimer);
      (socket as any)._cleanupTimer = null;
    }

    /* ─ Socket event handlers ─ */

    const onWaiting = (payload: { message: string }) => {
      setState("waiting");
      setStatus((payload.message || waitingCopy)
        .replace(/students/g, "people").replace(/student/g, "person"));
      setPeer(null); setRoomId(""); setIsChatEnded(false);
      setFriendshipStatus("none"); setFriendshipId(null); setIncomingRequest(null);
      setMessages([]);
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    };

    const onFound = (payload: { roomId: string; peer: PublicUser }) => {
      playSound("join");
      setState("matched");
      setRoomId(payload.roomId);
      setPeer(payload.peer);
      setStatus("");
      setIsChatEnded(false);
      setFriendshipStatus("none"); setFriendshipId(null); setIncomingRequest(null);
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      setMessages([sysMsg(`@${payload.peer.anonymousUsername.toLowerCase()} joined the chat`, payload.roomId)]);

      chatStartTimestampRef.current = Date.now();
      trackEvent("chat_connected", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college, peer_college: payload.peer.college });
      trackEvent("chat_started", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college, peer_college: payload.peer.college });
    };

    const onEnded = () => {
      playSound("leave");
      const name = peerRef.current?.anonymousUsername.toLowerCase() ?? "peer";
      setMessages(prev => [...prev, sysMsg(`@${name} left the chat`)]);
      setIsChatEnded(true);
      setPeer(null);

      const duration = chatStartTimestampRef.current
        ? Math.round((Date.now() - chatStartTimestampRef.current) / 1000)
        : 0;
      chatStartTimestampRef.current = null;
      trackEvent("chat_completed", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college, duration_seconds: duration, end_reason: "peer_left" });

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return; // component unmounted, do nothing
        setMessages([]);
        setRoomId(""); setIsChatEnded(false);
        setFriendshipStatus("none"); setFriendshipId(null); setIncomingRequest(null);
        setState("waiting");
        setStatus("finding someone new...");
        socket.emit("match:start", { mode });
        trackEvent("queue_joined", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college });
      }, 2000);
    };

    const onMessage = (incoming: ChatMessage) => {
      if (roomIdRef.current && incoming.roomId === roomIdRef.current) {
        setMessages(cur => {
          if (incoming.senderId === sessionRef.current?.user.id) {
            const idx = cur.findIndex(m => m.senderId === incoming.senderId && m.status === "sending" && m.message === incoming.message);
            if (idx !== -1) {
              const updated = [...cur];
              updated[idx] = incoming;
              return updated;
            }
          }
          if (cur.some(m => m.id === incoming.id)) {
            return cur;
          }
          return [...cur, incoming];
        });
      }
    };

    const onTyping = (payload: { userId: string; isTyping: boolean }) => {
      setTyping(payload.isTyping);
    };

    const onError = (payload: { message: string }) => {
      setStatus(payload.message.replace(/students/g, "people"));
    };

    const onFriendReceived = (payload: { friendshipId: string; sender: PublicUser }) => {
      setFriendshipId(payload.friendshipId);
      setFriendshipStatus("pending_received");
      setIncomingRequest(payload);
    };

    const onFriendAccepted = (payload: { friendshipId: string }) => {
      setFriendshipStatus("accepted");
      setFriendshipId(payload.friendshipId);
      setIncomingRequest(null);
    };

    const onReconnect = () => {
      // Re-queue after an established connection drops
      if (stateRef.current !== "matched" && mode && mountedRef.current) {
        socket.emit("match:start", { mode });
        trackEvent("queue_joined", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college });
      }
    };

    socket.on("match:waiting", onWaiting);
    socket.on("match:found", onFound);
    socket.on("match:ended", onEnded);
    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    socket.on("chat:error", onError);
    socket.on("friend:request:received", onFriendReceived);
    socket.on("friend:request:accepted", onFriendAccepted);
    socket.io.on("reconnect", onReconnect);

    // Initial match queue — wait for socket to be fully connected first
    if (mode) {
      setState("waiting");
      setStatus(waitingCopy);
      whenSocketReady(session).then((sock) => {
        if (mountedRef.current && stateRef.current !== "matched") {
          sock.emit("match:start", { mode });
          trackEvent("queue_joined", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college });
        }
      });
    }

    return () => {
      // Mark this mount as dead BEFORE scheduling any async work
      mountedRef.current = false;

      if (stateRef.current === "waiting" && !friendId) {
        trackEvent("queue_abandoned", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college });
      } else if (stateRef.current === "matched") {
        const duration = chatStartTimestampRef.current
          ? Math.round((Date.now() - chatStartTimestampRef.current) / 1000)
          : 0;
        chatStartTimestampRef.current = null;
        trackEvent("chat_completed", { chat_mode: friendId ? "friend" : (mode === "random" ? "global" : mode), college: sessionRef.current?.user?.college, duration_seconds: duration, end_reason: "unmounted" });
      }

      socket.off("match:waiting", onWaiting);
      socket.off("match:found", onFound);
      socket.off("match:ended", onEnded);
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("chat:error", onError);
      socket.off("friend:request:received", onFriendReceived);
      socket.off("friend:request:accepted", onFriendAccepted);
      socket.io.off("reconnect", onReconnect);

      // Only emit match:next if this was a real unmount (not Strict Mode double-mount)
      // Use a short timer; if the component remounts within 100ms, it cancels this
      (socket as any)._cleanupTimer = setTimeout(() => {
        (socket as any)._cleanupTimer = null;
        // Only leave the room if not in an active match
        if (stateRef.current !== "matched" && !friendId) {
          socket.emit("match:next");
        }
      }, 100);

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, session]); // intentionally minimal — waitingCopy is stable

  /* ── nextStranger ────────────────────────────────────── */
  const nextStranger = useCallback(() => {
    if (friendId) return; // Skip next match in friend mode
    const sess = sessionRef.current;
    if (!sess) return;
    const socket = getSocket(sess);

    const duration = chatStartTimestampRef.current
      ? Math.round((Date.now() - chatStartTimestampRef.current) / 1000)
      : 0;
    chatStartTimestampRef.current = null;
    if (stateRef.current === "matched") {
      trackEvent("chat_completed", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college, duration_seconds: duration, end_reason: "skipped" });
    }

    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    socket.emit("match:next");
    if (mode) {
      socket.emit("match:start", { mode });
      trackEvent("queue_joined", { chat_mode: mode === "random" ? "global" : mode, college: sessionRef.current?.user?.college });
    }
    setState("waiting"); setPeer(null); setRoomId(""); setMessages([]);
    setStatus(waitingCopy); setFriendshipStatus("none"); setFriendshipId(null);
    setIncomingRequest(null); setShowRequestMenu(false); setIsChatEnded(false);
  }, [mode, waitingCopy, friendId]);

  /* ── sendMessage ─────────────────────────────────────── */
  const sendMessage = useCallback((e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const sess = sessionRef.current;
    const rid = roomIdRef.current;
    const msgText = message.trim();
    if (!sess || !msgText) return;
    const socket = getSocket(sess);

    // Create optimistic message
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      roomId: rid || (friendId ? `friend:${[sess.user.id, friendId].sort().join(":")}` : ""),
      senderId: sess.user.id,
      receiverId: friendId || peerRef.current?.id || "",
      message: msgText,
      timestamp: new Date().toISOString(),
      status: "sending"
    };

    setMessages(current => [...current, tempMsg]);

    if (friendId) {
      socket.emit("friend:message", { friendId, message: msgText });
      if (rid) socket.emit("chat:typing", { roomId: rid, isTyping: false });
    } else if (rid) {
      socket.emit("chat:message", { roomId: rid, message: msgText });
      socket.emit("chat:typing", { roomId: rid, isTyping: false });
    }
    setMessage("");
    // keep focus on input on mobile
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [message, friendId]);

  const sendTyping = useCallback((value: string) => {
    setMessage(value);
    const sess = sessionRef.current;
    const rid = roomIdRef.current;
    if (!sess || !rid) return;
    getSocket(sess).emit("chat:typing", { roomId: rid, isTyping: value.length > 0 });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  /* ── Friend actions ──────────────────────────────────── */
  async function addFriend() {
    if (!peer || !session) return;
    const rid = roomIdRef.current;
    // Optimistic UI: update instantly, then fire HTTP + socket in parallel
    setFriendshipStatus("pending_sent");
    try {
      const res = await authFetch("/api/friends", { method: "POST", body: JSON.stringify({ friendId: peer.id }) });
      if (!res.ok) { setFriendshipStatus("none"); setStatus("Could not send request."); return; }
      const data = await res.json() as { friendshipId: string; status: string };
      setFriendshipId(data.friendshipId);
      if (data.status === "accepted") {
        // Already friends (both sent requests) — emit accept
        setFriendshipStatus("accepted");
        getSocket(session).emit("friend:request:accept", { roomId: rid, friendshipId: data.friendshipId });
      } else {
        // Normal pending — notify peer via socket
        getSocket(session).emit("friend:request:send", { roomId: rid, friendshipId: data.friendshipId });
      }
    } catch { setFriendshipStatus("none"); setStatus("Error sending request."); }
  }

  async function handleAcceptRequest() {
    if (!session || !incomingRequest) return;
    const rid = roomIdRef.current;
    // Optimistic accept
    setFriendshipStatus("accepted");
    setShowRequestMenu(false);
    try {
      const res = await authFetch("/api/friends/accept", { method: "POST", body: JSON.stringify({ friendshipId: incomingRequest.friendshipId }) });
      if (res.ok) {
        // Tell the other user (who is still in the same room) that the request was accepted
        getSocket(session).emit("friend:request:accept", { roomId: rid, friendshipId: incomingRequest.friendshipId });
      } else {
        setFriendshipStatus("pending_received"); // revert on failure
      }
    } catch { setStatus("Error accepting request."); setFriendshipStatus("pending_received"); }
  }

  async function handleDenyRequest() {
    if (!session || !incomingRequest) return;
    // Optimistic deny
    setFriendshipStatus("none"); setIncomingRequest(null); setShowRequestMenu(false);
    try {
      await authFetch("/api/friends/reject", { method: "POST", body: JSON.stringify({ friendshipId: incomingRequest.friendshipId }) });
    } catch { setStatus("Error denying request."); }
  }

  async function reportPeer() {
    if (!peer) return;
    const reason = window.prompt("Reason for reporting?");
    if (!reason) return;
    const res = await authFetch("/api/reports", { method: "POST", body: JSON.stringify({ reportedUserId: peer.id, reason }) });
    if (res.ok) {
      setStatus("Report submitted.");
      trackEvent("report_user", { reported_user_id: peer.id, reason });
    } else {
      setStatus("Could not submit report.");
    }
  }

  /* ── Loading guard ───────────────────────────────────── */
  if (!ready || !session) {
    return <div style={{ position: "fixed", inset: 0, background: "#000" }} />;
  }

  const formatTime = (ts: string) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="sc-root" ref={rootRef}>
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="sc-ambient-bg">
        <div className="sc-orb sc-orb-1" />
        <div className="sc-orb sc-orb-2" />
      </div>

      {/* ── HEADER ── */}
      <header className="sc-header">
        <div className="sc-header-left">
          <button onClick={() => router.push(friendId ? "/friends" : "/")} className="sc-header-icon" title="back">
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div className="sc-header-peer-info">
            <span className="sc-header-peer">
              {peer ? `@${peer.anonymousUsername.toLowerCase()}` : friendId ? "@loading..." : "@searching..."}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              {peer && (
                <span className={peer.online ? "sc-header-online" : "sc-header-offline"} style={{ fontSize: "0.7rem", color: peer.online ? "#4ade80" : "rgba(255,255,255,0.45)", display: "inline-flex", alignItems: "center" }}>
                  ● {peer.online ? "online" : "offline"}
                </span>
              )}
              {peer && peer.college && (
                <>
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)" }}>•</span>
                  <span className="sc-header-college" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                    {COLLEGES.find(c => c.id === peer.college)?.name || peer.college}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {!friendId && (
          <div className="sc-header-right">
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  if (friendshipStatus === "pending_received") setShowRequestMenu(!showRequestMenu);
                  else if (friendshipStatus === "none" && peer) addFriend();
                }}
                className={`sc-header-icon ${!peer || isChatEnded ? "sc-icon-disabled" : ""}`}
                title={friendshipStatus === "pending_received" ? "friend request" : "add friend"}
                disabled={!peer || isChatEnded || (friendshipStatus !== "none" && friendshipStatus !== "pending_received")}
              >
                {friendshipStatus === "pending_sent" || friendshipStatus === "accepted"
                  ? <Check size={20} strokeWidth={2.5} />
                  : <UserPlus size={20} strokeWidth={2} />}
                {friendshipStatus === "pending_received" && <span className="sc-red-dot" />}
              </button>

              {showRequestMenu && friendshipStatus === "pending_received" && (
                <div className="sc-request-menu">
                  <div className="sc-request-menu-title">Friend Request</div>
                  <div className="sc-request-menu-actions">
                    <button onClick={handleAcceptRequest} className="sc-btn-accept">accept</button>
                    <button onClick={handleDenyRequest} className="sc-btn-deny">deny</button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={peer && !isChatEnded ? reportPeer : undefined}
              className={`sc-header-icon ${!peer || isChatEnded ? "sc-icon-disabled" : ""}`}
              title="report" disabled={!peer || isChatEnded}
            >
              <Flag size={20} strokeWidth={2} />
            </button>
          </div>
        )}
      </header>

      {/* ── MAIN ── */}
      <main className="sc-main">
        {state === "waiting" ? (
          <div className="sc-waiting">
            <div className="sc-elegant-loader">
              <div className="sc-elegant-orb" />
              <div className="sc-elegant-ring" />
            </div>
            <h2 className="sc-waiting-title">
              {mode === "campus" ? "connecting to campus" : "connecting to a peer"}
            </h2>
            <p className="sc-waiting-sub">{status.toLowerCase()}</p>
          </div>
        ) : (
          <div className="sc-chat-area">
            <div className="sc-messages" id="sc-messages-scroll">
              {messages.map((item, i) => {
                if (item.senderId === "system") {
                  return (
                    <div key={item.id ?? i} className="sc-system-pill">
                      {item.message}
                    </div>
                  );
                }
                const mine = item.senderId === session.user.id;
                return (
                  <div key={item.id ?? i} className={`sc-bubble-row ${mine ? "sc-mine" : "sc-theirs"}`}>
                    {!mine && (
                      <div className="sc-avatar">
                        {(peer?.anonymousUsername ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`sc-bubble ${mine ? "sc-bubble-mine" : "sc-bubble-theirs"}`}>
                      <span className="sc-bubble-text">{item.message}</span>
                      <span className="sc-bubble-time">{formatTime(item.timestamp)}</span>
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="sc-bubble-row sc-theirs">
                  <div className="sc-avatar">
                    {(peer?.anonymousUsername ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="sc-bubble sc-bubble-theirs sc-typing-bubble">
                    <span className="sc-typing-dot" />
                    <span className="sc-typing-dot" style={{ animationDelay: "0.18s" }} />
                    <span className="sc-typing-dot" style={{ animationDelay: "0.36s" }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="sc-footer">
        {!friendId && (
          <button onClick={nextStranger} className="sc-skip-btn" type="button">
            skip
          </button>
        )}

        <form onSubmit={sendMessage} className="sc-input-form">
          <input
            ref={inputRef}
            value={message}
            onChange={e => sendTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={(!friendId && !peer) || isChatEnded}
            maxLength={700}
            placeholder={isChatEnded ? "chat ended..." : peer ? "message..." : friendId ? "connecting..." : "waiting for match..."}
            className="sc-input-field"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={(!friendId && !peer) || isChatEnded || !message.trim()}
            className="sc-send-btn"
          >
            <Send size={18} strokeWidth={2.5} />
          </button>
        </form>
      </footer>
    </div>
  );
}
