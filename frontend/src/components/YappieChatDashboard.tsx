"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight,
  ArrowUp,
  HeartHandshake, 
  Flag, 
  Ban, 
  User, 
  X, 
  Check, 
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  Plus,
  Smile,
  Mic,
  Search,
  MessageSquare,
  MessageCircle,
  Compass,
  Users,
  LogOut,
  Settings,
  GraduationCap,
  LockKeyhole
} from "lucide-react";
import { authFetch } from "@/lib/clientSession";
import { getSocket } from "@/lib/socketClient";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import type { ChatMessage, MatchMode, PublicUser, FriendListItem } from "@/types";
import { OnboardingForm } from "./OnboardingForm";
import { HubBackgroundDecor } from "./HubBackgroundDecor";

type MatchState = "idle" | "waiting" | "matched";

type ActiveChatTarget = 
  | { type: "mock"; id: string; name: string; college: string; avatarColor: string; messages: any[] }
  | { type: "friend"; friendId: string; friendUser: PublicUser }
  | { type: "match"; mode: MatchMode };

const MOCK_PEERS = [
  {
    id: "mock_orkun",
    name: "Orkun Kucuksevim",
    college: "Stanford University",
    major: "Computer Science",
    avatarColor: "bg-indigo-600 text-white shadow-layered-sm",
    lastMessage: "Let's stick with the jigsaws for now",
    time: "Yesterday",
    unread: false,
    messages: [
      { id: "m1", senderId: "peer", message: "Like a jigsaw puzzle or the wood and metal brain teasers?", timestamp: "11:20 AM" },
      { id: "m2", senderId: "me", message: "Oh! 🧠 I forgot that you collect all kinds of puzzles", timestamp: "11:21 AM" },
      { id: "m3", senderId: "peer", message: "Let's stick with the jigsaws for now", timestamp: "11:22 AM" },
      { id: "m4", senderId: "me", message: "Anytime, neighbor!", timestamp: "11:23 AM" },
      { id: "m5", senderId: "me", message: "I have the perfect puzzle for you to challenge the kids.", timestamp: "11:24 AM" },
      { id: "m6", senderId: "me", message: "But only if you carefully count all 1000 pieces before returning it 😜", timestamp: "11:26 AM" },
      { id: "m7", senderId: "peer", message: "Hmm. Maybe just a 500 piece one? 😂", timestamp: "11:28 AM" },
      { id: "m8", senderId: "peer", message: "Or I can just put the kids on one?", timestamp: "11:30 AM" },
      { id: "m9", senderId: "me", message: "Come by if you want them!", timestamp: "11:32 AM" },
      { id: "m10", senderId: "peer", message: "Thanks for the puzzles!", timestamp: "11:35 AM" }
    ]
  },
  {
    id: "mock_jasmine",
    name: "Jasmine Garcia",
    college: "MIT-WPU",
    major: "Mechanical Eng.",
    avatarColor: "bg-emerald-600 text-white shadow-layered-sm",
    lastMessage: "See you tomorrow at the lab!",
    time: "Saturday",
    unread: true,
    messages: [
      { id: "j1", senderId: "peer", message: "Are you ready for the engineering review?", timestamp: "3:40 PM" },
      { id: "j2", senderId: "me", message: "Almost done. Just refining the CAD models.", timestamp: "3:42 PM" },
      { id: "j3", senderId: "peer", message: "Awesome. I will review the calculations.", timestamp: "3:43 PM" },
      { id: "j4", senderId: "peer", message: "See you tomorrow at the lab!", timestamp: "3:45 PM" }
    ]
  }
];

const DIAGNOSTIC_MESSAGES = [
  "Locating active web tunnels...",
  "Initiating secure WebSocket handshake...",
  "Checking user block matrices...",
  "Scanning university campus pipeline...",
  "Running low-latency handshake protocols...",
  "Searching peer availability indices...",
  "Routing connection packets through SSL layer...",
  "Establishing socket connection nodes..."
];

function getAvatarGradient(username: string): string {
  if (!username) return "from-zinc-400 to-zinc-650";
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    "from-zinc-800 to-black",
    "from-zinc-700 to-zinc-900",
    "from-stone-800 to-black",
    "from-neutral-800 to-neutral-950",
    "from-gray-800 to-black",
    "from-zinc-900 to-black",
    "from-stone-900 to-black",
    "from-neutral-700 to-neutral-900",
    "from-gray-700 to-gray-900",
    "from-zinc-800 to-zinc-950"
  ];
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

const getDiagnosticLogs = (index: number) => {
  const logs: string[] = [];
  const now = new Date();
  for (let i = 0; i <= index; i++) {
    const timeString = new Date(now.getTime() - (index - i) * 2000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isLast = i === index;
    logs.push(`[${timeString}] ${DIAGNOSTIC_MESSAGES[i]}${isLast ? "..." : " -> OK"}`);
  }
  return logs.slice(-4);
};

export function YappieChatDashboard({
  initialFriendId,
  initialMode,
  chatOnly = false,
}: {
  initialFriendId?: string;
  initialMode?: MatchMode;
  chatOnly?: boolean;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, ready } = useAnonymousSession();
  // View state: activeTarget null = stream picker on the right
  const [diagnosticIndex, setDiagnosticIndex] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "info" | "error" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3000);
  }, []);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");

  // Sidebar controls
  const [activeTab, setActiveTab] = useState<"campus" | "global">("campus");
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Active chat target state
  const [activeTarget, setActiveTarget] = useState<ActiveChatTarget | null>(null);

  // Match / Active Chat states
  const [matchState, setMatchState] = useState<MatchState>("idle");
  const [roomId, setRoomId] = useState("");
  const [peer, setPeer] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // iOS-style Actions and real-time request states
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending_sent" | "pending_received" | "accepted">("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<{ friendshipId: string; sender: PublicUser } | null>(null);
  const [friendCelebration, setFriendCelebration] = useState(false);

  // Dynamic mobile view sizing & stack slide helper
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Global unread message count tracker
  const [unreadCounts, setUnreadCounts] = useState<{ [friendId: string]: number }>({});

  // Interactive Emojis & Menu React States
  const [activeReactMenuId, setActiveReactMenuId] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<{ [msgId: string]: string[] }>({});

  // Web Audio API pop synthesis chimes
  const playChatSound = useCallback((type: "send" | "receive") => {
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === "send") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(392, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(587, ctx.currentTime + 0.1);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(440, ctx.currentTime + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(659, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.22);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.22);
      }
    } catch (err) {
      console.warn("Audio context blocked or failed to initialize", err);
    }
  }, []);

  const toggleReaction = useCallback((msgId: string, emoji: string) => {
    setMessageReactions(prev => {
      const current = prev[msgId] ?? [];
      const next = current.includes(emoji) 
        ? current.filter(e => e !== emoji)
        : [...current, emoji];
      return { ...prev, [msgId]: next };
    });
    setActiveReactMenuId(null);
  }, []);

  const waitingCopy = useCallback((mode: MatchMode) => {
    if (mode === "campus") {
      return "No MIT-WPU people are online right now. Searching...";
    }
    return "Looking for a global peer...";
  }, []);

  const handleNextMatch = useCallback(() => {
    if (!session || activeTarget?.type !== "match") return;
    const socket = getSocket(session);
    socket.emit("match:next");
    socket.emit("match:start", { mode: activeTarget.mode });
    setMatchState("waiting");
    setPeer(null);
    setRoomId("");
    setMessages([]);
    setStatusText(waitingCopy(activeTarget.mode));
    setFriendshipStatus("none");
    setFriendshipId(null);
    setIncomingRequest(null);
    setFriendCelebration(false);
    setShowActionSheet(false);
  }, [session, activeTarget, waitingCopy]);

  // Detect mobile viewport on mount and resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard shortcut listener to skip matches on Escape keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeTarget?.type === "match" && matchState === "matched") {
        handleNextMatch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTarget, matchState, handleNextMatch]);

  // Rotate diagnostic logs during matchmaking
  useEffect(() => {
    if (matchState !== "waiting") return;
    setDiagnosticIndex(0);
    const interval = setInterval(() => {
      setDiagnosticIndex((prev) => (prev + 1) % DIAGNOSTIC_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [matchState]);

  const startMode = initialMode || searchParams.get("mode");
  const startFriendId = initialFriendId || searchParams.get("friendId");

  const loadFriends = useCallback(async () => {
    if (!session) return;
    try {
      const response = await authFetch("/api/friends");
      if (response.ok) {
        const data = (await response.json()) as { friends: FriendListItem[] };
        setFriends(data.friends ?? []);
      }
    } catch (err) {
      console.error("Failed to load friends:", err);
    } finally {
      setLoadingFriends(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      void loadFriends();
    }
  }, [loadFriends, session]);

  const pendingRequestsCount = useMemo(() => {
    return friends.filter((f) => f.status === "pending" && !f.requestedByMe).length;
  }, [friends]);

  const totalUnreadMessages = useMemo(() => {
    return Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  }, [unreadCounts]);

  const totalNotifications = pendingRequestsCount + totalUnreadMessages;

  useEffect(() => {
    if (!session) return;
    const socket = getSocket(session);

    const handleGlobalMessage = (incoming: ChatMessage) => {
      if (incoming.roomId.startsWith("friend:")) {
        const isFromMe = incoming.senderId === session.user.id;
        
        if (isFromMe) {
          const isChattingWithReceiver = activeTarget?.type === "friend" && activeTarget.friendId === incoming.receiverId;
          if (isChattingWithReceiver) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev;
              playChatSound("send");
              return [...prev, incoming];
            });
          }
          return;
        }

        const isChattingWithSender = activeTarget?.type === "friend" && activeTarget.friendId === incoming.senderId;

        if (isChattingWithSender) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            playChatSound("receive");
            return [...prev, incoming];
          });
        } else {
          setUnreadCounts((prev) => ({
            ...prev,
            [incoming.senderId]: (prev[incoming.senderId] || 0) + 1
          }));
          showToast("New message received on Friends console", "info");
        }
      }
    };

    const handleFriendRequest = (payload: { friendshipId: string; sender: PublicUser }) => {
      showToast(`Friend request from ${payload.sender.anonymousUsername}!`, "success");
      void loadFriends();
    };

    const handleFriendRequestAccepted = (payload: { friendshipId: string }) => {
      showToast("Friend request accepted!", "success");
      void loadFriends();
    };

    socket.on("chat:message", handleGlobalMessage);
    socket.on("friend:request:received", handleFriendRequest);
    socket.on("friend:request:accepted", handleFriendRequestAccepted);

    return () => {
      socket.off("chat:message", handleGlobalMessage);
      socket.off("friend:request:received", handleFriendRequest);
      socket.off("friend:request:accepted", handleFriendRequestAccepted);
    };
  }, [session, activeTarget, showToast, loadFriends, playChatSound]);

  useEffect(() => {
    if (activeTarget?.type === "friend") {
      setUnreadCounts((prev) => {
        if (prev[activeTarget.friendId]) {
          const next = { ...prev };
          delete next[activeTarget.friendId];
          return next;
        }
        return prev;
      });
    }
  }, [activeTarget]);

  useEffect(() => {
    if (ready && session) {
      if (startMode === "campus" || startMode === "random") {
        setActiveTarget({ type: "match", mode: startMode as MatchMode });
        setShowMobileChat(true);
      } else if (startFriendId) {
        const targetFriend = friends.find(f => f.friend.id === startFriendId);
        if (targetFriend) {
          setActiveTarget({ type: "friend", friendId: startFriendId, friendUser: targetFriend.friend });
          setShowMobileChat(true);
        }
      }
    }
  }, [ready, session, startMode, startFriendId, friends]);

  useEffect(() => {
    if (!session || !activeTarget || activeTarget.type !== "match") {
      return;
    }

    const socket = getSocket(session);
    const mode = activeTarget.mode;

    const handleWaiting = (payload: { message: string }) => {
      setMatchState("waiting");
      const cleanMsg = (payload.message || waitingCopy(mode))
        .replace(/students/g, "people")
        .replace(/student/g, "person");
      setStatusText(cleanMsg);
      setPeer(null);
      setRoomId("");
      setMessages([]);
      setFriendshipStatus("none");
      setFriendshipId(null);
      setIncomingRequest(null);
    };

    const handleFound = (payload: { roomId: string; peer: PublicUser }) => {
      setMatchState("matched");
      setRoomId(payload.roomId);
      setPeer(payload.peer);
      setStatusText("Connected");
      setMessages([]);
      setFriendshipStatus("none");
      setFriendshipId(null);
      setIncomingRequest(null);
    };

    const handleEnded = () => {
      setMatchState("idle");
      setStatusText("The conversation has ended.");
      setRoomId("");
      setPeer(null);
      setFriendshipStatus("none");
      setFriendshipId(null);
      setIncomingRequest(null);
    };

    const handleMessage = (incoming: ChatMessage) => {
      setMessages((current) => [...current, incoming]);
      const isFromMe = incoming.senderId === session.user.id;
      if (isFromMe) {
        playChatSound("send");
      } else {
        playChatSound("receive");
      }
    };

    const handleTyping = (payload: { isTyping: boolean }) => {
      setTyping(payload.isTyping);
    };

    const handleError = (payload: { message: string }) => {
      setStatusText(payload.message.replace(/students/g, "people"));
    };

    const handleFriendRequestReceived = (payload: { friendshipId: string; sender: PublicUser }) => {
      setFriendshipId(payload.friendshipId);
      setFriendshipStatus("pending_received");
      setIncomingRequest(payload);
    };

    const handleFriendRequestAccepted = (payload: { friendshipId: string }) => {
      setFriendshipStatus("accepted");
      setFriendshipId(payload.friendshipId);
      setIncomingRequest(null);
      setFriendCelebration(true);
      void loadFriends();
      setTimeout(() => setFriendCelebration(false), 4000);
    };

    socket.on("match:waiting", handleWaiting);
    socket.on("match:found", handleFound);
    socket.on("match:ended", handleEnded);
    socket.on("chat:message", handleMessage);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:error", handleError);
    socket.on("friend:request:received", handleFriendRequestReceived);
    socket.on("friend:request:accepted", handleFriendRequestAccepted);

    socket.emit("match:start", { mode });
    setMatchState("waiting");
    setStatusText(waitingCopy(mode));

    return () => {
      socket.off("match:waiting", handleWaiting);
      socket.off("match:found", handleFound);
      socket.off("match:ended", handleEnded);
      socket.off("chat:message", handleMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:error", handleError);
      socket.off("friend:request:received", handleFriendRequestReceived);
      socket.off("friend:request:accepted", handleFriendRequestAccepted);
      socket.emit("match:next");
    };
  }, [activeTarget, session, waitingCopy, loadFriends, playChatSound]);

  useEffect(() => {
    if (!session || !activeTarget || activeTarget.type !== "friend") {
      return;
    }

    const socket = getSocket(session);
    const friendId = activeTarget.friendId;

    const handleJoined = (payload: { roomId: string }) => {
      setRoomId(payload.roomId);
      setStatusText("Connected");
    };

    const handleTyping = (payload: { userId: string; isTyping: boolean }) => {
      if (payload.userId === friendId) {
        setTyping(payload.isTyping);
      }
    };

    const handleError = (payload: { message: string }) => {
      setStatusText(payload.message);
    };

    socket.on("friend:joined", handleJoined);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:error", handleError);

    socket.emit("friend:join", { friendId });

    return () => {
      socket.off("friend:joined", handleJoined);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:error", handleError);
    };
  }, [activeTarget, session]);

  useEffect(() => {
    if (!session || !activeTarget || activeTarget.type !== "friend") {
      return;
    }

    async function loadFriendHistory() {
      if (activeTarget && activeTarget.type === "friend") {
        try {
          const res = await authFetch(`/api/messages/friend/${activeTarget.friendId}`);
          if (res.ok) {
            const data = (await res.json()) as { messages: ChatMessage[] };
            setMessages(data.messages ?? []);
          }
        } catch (err) {
          console.error("Failed to load friend history:", err);
        }
      }
    }

    setMessages([]);
    void loadFriendHistory();
  }, [activeTarget, session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredFriends = useMemo(() => {
    return friends.filter(item => {
      if (item.status !== "accepted") return false;
      if (searchQuery.trim()) {
        return item.friend.anonymousUsername.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [friends, searchQuery]);

  const pendingFriendRequests = useMemo(
    () => friends.filter(f => f.status === "pending" && !f.requestedByMe),
    [friends]
  );

  const filteredMockPeers = useMemo(() => {
    return MOCK_PEERS.filter(peer => {
      if (searchQuery.trim()) {
        return peer.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [searchQuery]);

  function sendTypingIndicator(value: string) {
    setMessageText(value);

    if (session && roomId) {
      getSocket(session).emit("chat:typing", { roomId, isTyping: value.length > 0 });
    }
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !messageText.trim()) return;

    if (activeTarget?.type === "mock") {
      const newMsg = {
        id: `mock_${Date.now()}`,
        senderId: "me",
        message: messageText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(curr => [...curr, newMsg]);
      setMessageText("");
      playChatSound("send");

      setTimeout(() => {
        const replyMsg = {
          id: `mock_reply_${Date.now()}`,
          senderId: "peer",
          message: `Haha cool! Just running local simulations for Yappie. 🚀`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(curr => [...curr, replyMsg]);
        playChatSound("receive");
      }, 1500);

    } else if (activeTarget?.type === "friend") {
      getSocket(session).emit("friend:message", { friendId: activeTarget.friendId, message: messageText.trim() });
      setMessageText("");
    } else if (activeTarget?.type === "match" && roomId) {
      getSocket(session).emit("chat:message", { roomId, message: messageText.trim() });
      getSocket(session).emit("chat:typing", { roomId, isTyping: false });
      setMessageText("");
    }
  }

  async function handleAddFriend() {
    if (!peer || !session) return;
    try {
      const response = await authFetch("/api/friends", {
        method: "POST",
        body: JSON.stringify({ friendId: peer.id })
      });

      if (!response.ok) return;

      const data = (await response.json()) as { friendshipId: string; status: string };
      setFriendshipId(data.friendshipId);
      
      if (data.status === "accepted") {
        setFriendshipStatus("accepted");
        getSocket(session).emit("friend:request:accept", { roomId, friendshipId: data.friendshipId });
        void loadFriends();
      } else {
        setFriendshipStatus("pending_sent");
        getSocket(session).emit("friend:request:send", { roomId, friendshipId: data.friendshipId });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setShowActionSheet(false);
    }
  }

  async function handleAcceptRequest() {
    if (!incomingRequest || !session) return;
    const { friendshipId } = incomingRequest;

    try {
      const response = await authFetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" })
      });

      if (response.ok) {
        setFriendshipStatus("accepted");
        getSocket(session).emit("friend:request:accept", { roomId, friendshipId });
        setFriendCelebration(true);
        void loadFriends();
        setTimeout(() => setFriendCelebration(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIncomingRequest(null);
    }
  }

  async function handleRejectRequest() {
    if (!incomingRequest) return;
    const { friendshipId } = incomingRequest;

    try {
      await authFetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reject" })
      });
      setFriendshipStatus("none");
      setFriendshipId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIncomingRequest(null);
    }
  }

  function handleReportPeer() {
    if (!peer) return;
    setReportReason("");
    setShowReportModal(true);
    setShowActionSheet(false);
  }

  async function submitReportPeer() {
    if (!peer || !reportReason.trim()) return;

    try {
      const response = await authFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({ reportedUserId: peer.id, reason: reportReason.trim() })
      });
      if (response.ok) {
        showToast("Peer reported successfully.", "success");
      } else {
        showToast("Failed to submit report.", "error");
      }
    } catch {
      showToast("Error submitting report.", "error");
    } finally {
      setShowReportModal(false);
      setReportReason("");
    }
  }

  async function handleBlockPeer() {
    if (!peer || !session) return;

    await authFetch("/api/blocks", {
      method: "POST",
      body: JSON.stringify({ blockedUserId: peer.id })
    });
    getSocket(session).emit("user:block", { blockedUserId: peer.id });
    setPeer(null);
    setRoomId("");
    setMessages([]);
    setMatchState("idle");
    setFriendshipStatus("none");
    setFriendshipId(null);
    setIncomingRequest(null);
    setShowActionSheet(false);
    setActiveTarget(null);
    setShowMobileChat(false);
  }

  const needsOnboarding = useMemo(() => {
    if (!ready || !session) return false;
    return session.user.age === undefined || session.user.college === undefined;
  }, [session, ready]);

  if (!ready || !session) {
    return <div className="min-h-screen bg-[#0b0b16]" />;
  }

  if (needsOnboarding) {
    return <OnboardingForm />;
  }

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden relative bg-[#0b0b16] text-slate-100">
      <div className="radiant-mesh" />
      <div className="ambient-glow" />
      <HubBackgroundDecor />
      
      {/* 1. iOS TOP ALERT BANNER */}
      {incomingRequest && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[340px] bg-[#10111a]/95 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-layered-lg p-4 flex flex-col gap-3 animate-in slide-in-from-top-10 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-950/20 border border-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-black text-white truncate">Add Friend: {incomingRequest.sender.anonymousUsername}?</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider truncate">{incomingRequest.sender.college || "Other"}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full justify-end">
            <button onClick={handleRejectRequest} className="rounded-full border border-zinc-800 px-4 py-1.5 text-xs font-bold text-zinc-400 hover:text-white transition active:scale-95 bg-zinc-900/50 shadow-layered-sm">
              Ignore
            </button>
            <button onClick={handleAcceptRequest} className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-1.5 text-xs font-black text-white hover:from-indigo-500 hover:to-purple-500 transition active:scale-95 shadow-layered-sm">
              Accept
            </button>
          </div>
        </div>
      )}

      {/* 2. FRIEND CELEBRATION TOAST */}
      {friendCelebration && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[300px] bg-emerald-950/30 border border-emerald-800/50 rounded-full shadow-layered-md p-2.5 text-center animate-in zoom-in-95 duration-200">
          <p className="text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-1.5 leading-none">
            <span>🤝</span> You are now friends!
          </p>
        </div>
      )}

      {/* 2.5. GENERIC PREMIUM TOAST */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[320px] border px-4.5 py-3.5 rounded-2xl shadow-layered-lg flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-4 duration-300 ${
          toast.type === "success" 
            ? "bg-emerald-950/95 border-emerald-800/80 text-emerald-400" 
            : toast.type === "error"
            ? "bg-rose-950/95 border-rose-800/80 text-rose-400"
            : "bg-[#10111a]/95 border-zinc-800 text-white"
        }`}>
          {toast.type === "success" && <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
          {toast.type === "error" && <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
          {toast.type === "info" && <AlertCircle className="h-4 w-4 text-purple-400 flex-shrink-0" />}
          <p className="text-xs font-black tracking-wide leading-normal">{toast.message}</p>
        </div>
      )}

      {/* 2.6. CUSTOM REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[360px] bg-[#10111a] border border-zinc-800 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-250 text-left">
            
            <h3 className="text-base font-black text-white tracking-tight leading-none mb-1.5 font-heading">
              Report Anonymous Peer
            </h3>
            <p className="text-[11px] font-semibold text-zinc-400 leading-normal mb-5">
              Please select a reason for reporting this user. Yappie admins will review this session.
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {[
                "Harassment or Abuse",
                "Spam or Advertisement",
                "Inappropriate / NSFW content",
                "Hate speech or discrimination",
                "Other violations"
              ].map((reasonOpt) => (
                <button
                  key={reasonOpt}
                  type="button"
                  onClick={() => setReportReason(reasonOpt)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                    reportReason === reasonOpt
                      ? "border-purple-500 bg-purple-500/10 text-white"
                      : "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  <span>{reasonOpt}</span>
                  {reportReason === reasonOpt && <Check className="h-4 w-4 text-purple-400" />}
                </button>
              ))}
            </div>

            <div className="flex gap-3.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                }}
                className="flex-1 py-3 border border-zinc-800 hover:border-zinc-700 text-xs font-black text-zinc-400 hover:text-white rounded-2xl transition active:scale-95 shadow-sm bg-zinc-900/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReportPeer}
                disabled={!reportReason}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-40 text-xs font-black text-white rounded-2xl transition active:scale-95 shadow-sm"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN DASHBOARD — SPLIT LAYOUT */}
      <div className="relative z-10 flex h-full w-full overflow-hidden">
        <div
          className={`flex h-full ${chatOnly ? "w-full" : "w-[200vw] lg:w-full"} transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] lg:transform-none`}
          style={{
            transform: !chatOnly && isMobile && showMobileChat ? "translateX(-100vw)" : "translateX(0)",
          }}
        >
          {!chatOnly && (
          <aside className="dash-sidebar flex h-full w-[100vw] shrink-0 flex-col border-r border-white/10 bg-[#0d0e16]/75 backdrop-blur-xl lg:w-[340px] xl:w-[380px]">
            <div className="border-b border-white/8 px-4 py-4">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                  <MessageCircle className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <p className="font-heading text-base font-black text-white leading-none">
                    Yappie
                  </p>
                  <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-[0.28em] text-slate-400/70">
                    friends
                  </p>
                </div>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-xs font-semibold text-white placeholder-slate-500 outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {pendingFriendRequests.length > 0 && (
                <div className="mb-4 px-2">
                  <p className="mb-2 ml-1 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-rose-300/70">
                    friend requests
                  </p>
                  <div className="space-y-1.5">
                    {pendingFriendRequests.map((req) => (
                      <div
                        key={req.friendshipId}
                        className="rounded-2xl border border-rose-400/15 bg-rose-500/[0.06] p-3"
                      >
                        <div className="mb-2.5 flex items-center gap-2.5">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(req.friend.anonymousUsername)} text-[10px] font-black text-white`}>
                            {req.friend.anonymousUsername.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">{req.friend.anonymousUsername}</p>
                            <p className="truncate text-[9px] text-slate-400">{req.friend.college || "Campus"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await authFetch(`/api/friends/${req.friendshipId}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ action: "reject" }),
                                });
                                showToast("Request ignored.", "info");
                                void loadFriends();
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="flex-1 rounded-xl border border-white/10 py-1.5 text-[10px] font-bold text-slate-400 transition hover:text-white"
                          >
                            Ignore
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response = await authFetch(`/api/friends/${req.friendshipId}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ action: "accept" }),
                                });
                                if (response.ok) {
                                  showToast("Friend added!", "success");
                                  getSocket(session).emit("friend:request:accept", {
                                    roomId: `friend:${req.friendshipId}`,
                                    friendshipId: req.friendshipId,
                                  });
                                  setFriendCelebration(true);
                                  void loadFriends();
                                  setTimeout(() => setFriendCelebration(false), 4000);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-1.5 text-[10px] font-black text-white"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mb-2 ml-3 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                direct messages
              </p>
              <div className="space-y-0.5">
                  {filteredMockPeers.map(mockPeer => {
                    const isActive = activeTarget?.type === "mock" && activeTarget.id === mockPeer.id;
                    return (
                      <button
                        key={mockPeer.id}
                        onClick={() => {
                          setActiveTarget({ type: "mock", id: mockPeer.id, name: mockPeer.name, college: mockPeer.college, avatarColor: mockPeer.avatarColor, messages: mockPeer.messages });
                          setShowMobileChat(true);
                        }}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition duration-200 text-left relative ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                            : "hover:bg-zinc-900/45"
                        }`}
                      >
                        <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${getAvatarGradient(mockPeer.name)} flex items-center justify-center flex-shrink-0 font-black text-xs text-white shadow-inner`}>
                          {mockPeer.name.split(" ").map(n=>n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h4 className={`font-bold text-[12.5px] tracking-tight leading-none ${isActive ? "text-white" : "text-zinc-100"}`}>
                              {mockPeer.name}
                            </h4>
                            <span className={`text-[9px] font-semibold leading-none ${isActive ? "text-white/60" : "text-zinc-400"}`}>
                              {mockPeer.time}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1 leading-none">
                            <p className={`text-[10px] font-medium truncate ${isActive ? "text-white/80" : "text-[#94a3b8]"}`}>
                              {mockPeer.lastMessage}
                            </p>
                            {mockPeer.unread && !isActive && (
                              <div className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0 ml-1.5 animate-pulse" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* REAL CONNECTIONS */}
                  {filteredFriends.map(item => {
                    const isActive = activeTarget?.type === "friend" && activeTarget.friendId === item.friend.id;
                    return (
                      <button
                        key={item.friendshipId}
                        onClick={() => {
                          setActiveTarget({ type: "friend", friendId: item.friend.id, friendUser: item.friend });
                          setShowMobileChat(true);
                        }}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition duration-200 text-left relative ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                            : "hover:bg-zinc-900/45"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${getAvatarGradient(item.friend.anonymousUsername)} flex items-center justify-center font-black text-xs text-white shadow-inner`}>
                            {item.friend.anonymousUsername.slice(0,2).toUpperCase()}
                          </div>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0d0e16] ${
                            item.friend.online ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h4 className={`font-bold text-[12.5px] tracking-tight leading-none ${isActive ? "text-white" : "text-zinc-100"}`}>
                              {item.friend.anonymousUsername}
                            </h4>
                            <span className={`text-[9px] font-semibold leading-none ${isActive ? "text-white/60" : "text-zinc-400"}`}>
                              {item.friend.online ? "Online" : "Offline"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1 leading-none">
                            <p className={`text-[10px] font-medium truncate ${isActive ? "text-white/80" : "text-[#94a3b8]"}`}>
                              {item.friend.college}
                            </p>
                            {unreadCounts[item.friend.id] > 0 && !isActive && (
                              <div className="h-4.5 min-w-4.5 px-1.5 rounded-full bg-red-500 text-white font-extrabold text-[9.5px] flex items-center justify-center flex-shrink-0 ml-1.5 animate-bounce">
                                {unreadCounts[item.friend.id]}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredFriends.length === 0 && filteredMockPeers.length === 0 && !loadingFriends && (
                    <div className="px-4 py-12 text-center">
                      <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                      <p className="text-xs font-semibold leading-relaxed text-slate-500">
                        No messages yet. Match someone on the right — then add friends to chat here.
                      </p>
                    </div>
                  )}

              </div>
            </div>

            {/* Profile + settings footer */}
            <div className="dash-sidebar-footer border-t border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(session.user.anonymousUsername)} text-xs font-black text-white`}>
                  {session.user.anonymousUsername.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-black text-white">{session.user.anonymousUsername}</p>
                  <p className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {session.user.college || "Campus"}
                  </p>
                </div>
                <button
                  onClick={() => setShowSettings((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-white/20 hover:text-white"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const socket = getSocket(session);
                    socket.disconnect();
                    router.push("/");
                    setTimeout(() => window.location.reload(), 100);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-rose-400/30 hover:text-rose-300"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
              {showSettings && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left">
                  <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">account</p>
                  <p className="text-[11px] font-semibold text-slate-300">Anonymous mode is always on.</p>
                  <p className="mt-1 text-[10px] text-slate-500">Your real name and email are never shared in chat.</p>
                </div>
              )}
            </div>

          </aside>
          )}

          {/* ==================== RIGHT PANEL ==================== */}
          <section className={`flex h-full min-w-0 flex-col bg-[#07080d]/60 backdrop-blur-sm ${chatOnly ? "w-full" : "flex-1"}`}>
            
            {activeTarget ? (
              <>
                {/* iMESSAGE HEADER BAR */}
                <header className="flex items-center gap-3 px-4.5 py-3 border-b border-zinc-850 bg-[#0d0e16]/95 backdrop-blur-md sticky top-0 z-20">
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (chatOnly) {
                        router.push(initialFriendId ? "/friends" : "/");
                        return;
                      }
                      setActiveTarget(null);
                      setShowMobileChat(false);
                    }}
                    className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white active:scale-95 transition flex-shrink-0 ${chatOnly ? "" : "lg:hidden"}`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  {/* Header Title Tappable block */}
                  <div 
                    onClick={() => {
                      if (activeTarget.type === "match" && peer) {
                        setShowActionSheet(true);
                      }
                    }}
                    className={`flex items-center gap-2.5 ${activeTarget.type === "match" && peer ? "cursor-pointer hover:bg-zinc-900/40 rounded-xl px-3.5 py-1 transition" : "select-none"}`}
                  >
                    {activeTarget.type === "mock" ? (
                      <>
                        <div className={`h-9.5 w-9.5 rounded-full bg-gradient-to-br ${getAvatarGradient(activeTarget.name)} flex items-center justify-center font-black text-xs text-white shadow-inner flex-shrink-0`}>
                          {activeTarget.name.split(" ").map(n=>n[0]).join("")}
                        </div>
                        <div className="text-left">
                          <h3 className="text-xs font-bold tracking-tight text-white font-heading leading-none mb-1">
                            {activeTarget.name}
                          </h3>
                          <p className="text-[8.5px] font-extrabold text-purple-400 uppercase tracking-widest leading-none">
                            {activeTarget.college} · Demo Peer
                          </p>
                        </div>
                      </>
                    ) : activeTarget.type === "friend" ? (
                      <>
                        <div className="relative flex-shrink-0">
                          <div className={`h-9.5 w-9.5 rounded-full bg-gradient-to-br ${getAvatarGradient(activeTarget.friendUser.anonymousUsername)} flex items-center justify-center font-black text-xs text-white shadow-inner`}>
                            {activeTarget.friendUser.anonymousUsername.slice(0,2).toUpperCase()}
                          </div>
                          <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0e16] ${
                            activeTarget.friendUser.online ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
                          }`} />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xs font-bold tracking-tight text-white font-heading leading-none mb-1">
                            {activeTarget.friendUser.anonymousUsername}
                          </h3>
                          <p className="text-[8.5px] font-extrabold text-purple-400 uppercase tracking-widest leading-none">
                            {(activeTarget.friendUser.college || "Other").replace("Hub", "").trim()} Hub · Friends
                          </p>
                        </div>
                      </>
                    ) : (
                      /* Active Matching Header */
                      <>
                        <div className={`h-9.5 w-9.5 rounded-full bg-gradient-to-br ${peer ? getAvatarGradient(peer.anonymousUsername) : "from-[#6366f1] to-[#7c3aed]"} flex items-center justify-center font-black text-xs text-white shadow-inner flex-shrink-0`}>
                          {peer ? peer.anonymousUsername.slice(0,2).toUpperCase() : "?"}
                        </div>
                        <div className="text-left">
                          <h3 className="text-xs font-bold tracking-tight text-white font-heading leading-none mb-1">
                            {peer ? peer.anonymousUsername : matchState === "waiting" ? "Scanning Stream..." : "Match Room"}
                          </h3>
                          <p className="text-[8.5px] font-extrabold text-purple-400 uppercase tracking-widest leading-none">
                            {peer ? `${peer.age}y · ${peer.college || "Other"}` : statusText || "Searching pipeline"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Options / Action Buttons */}
                  <div className="flex items-center gap-2">
                    {activeTarget.type === "match" && peer ? (
                      <>
                        {/* Add Friend Status Button */}
                        {friendshipStatus === "accepted" ? (
                          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 font-extrabold text-[10.5px]">
                            <Check className="h-3.5 w-3.5 stroke-[3]" /> Connected
                          </div>
                        ) : friendshipStatus === "pending_sent" ? (
                          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-550 font-bold text-[10.5px]">
                            Pending...
                          </div>
                        ) : friendshipStatus === "pending_received" ? (
                          <button
                            onClick={handleAcceptRequest}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-[10.5px] transition active:scale-95 shadow-sm"
                          >
                            Accept Request
                          </button>
                        ) : (
                          <button
                            onClick={handleAddFriend}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-[#a78bfa] font-black text-[10.5px] transition active:scale-95"
                          >
                            Add Friend
                          </button>
                        )}
                        
                        {/* Report & Block Controls */}
                        <button
                          onClick={handleReportPeer}
                          className="hidden sm:flex h-8.5 px-3 items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-805 border border-zinc-800 text-zinc-400 hover:text-white transition active:scale-95 text-[10.5px] font-bold"
                          title="Report peer"
                        >
                          Report
                        </button>
                        
                        <button
                          onClick={handleBlockPeer}
                          className="h-8.5 px-3 flex items-center justify-center rounded-xl bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/30 text-rose-400 hover:text-rose-300 transition active:scale-95 text-[10.5px] font-black"
                          title="Block peer"
                        >
                          Block
                        </button>
                      </>
                    ) : (
                      <div className="w-8.5 h-8.5" />
                    )}
                  </div>

                </header>

                {/* CHAT SCENE WINDOW PANEL */}
                <div className="flex-1 overflow-y-auto px-4.5 py-6 flex flex-col bg-transparent min-h-0 relative">
                  
                  {activeTarget.type === "match" && matchState === "waiting" ? (
                    /* 200 IQ KINETIC GRAVITY ORB LOADER SCREEN */
                    <div className="flex h-full flex-col items-center justify-center text-center p-8 relative overflow-hidden select-none">
                      <div className="ambient-glow" />
                      
                      {/* Radar / Sonar System */}
                      <div className="relative w-56 h-56 flex items-center justify-center mb-6">
                        {/* Rotating Gradient Orb Layers */}
                        <div className="absolute w-52 h-52 rounded-full bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-purple-500/15 animate-spin duration-10000 orbit-1" />
                        <div className="absolute w-40 h-40 rounded-full bg-gradient-to-bl from-indigo-500/10 via-pink-500/5 to-cyan-500/10 animate-reverse duration-7000 orbit-2" />
                        <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-sky-500/15 to-violet-500/20 animate-spin duration-5000 orbit-3" />
                        
                        {/* Radar scan rings */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-48 h-48 rounded-full border border-blue-500/10 absolute cosmic-pulsar" />
                          <div className="w-36 h-36 rounded-full border border-indigo-500/15 absolute cosmic-pulsar" style={{ animationDelay: "1.5s" }} />
                          <div className="w-24 h-24 rounded-full border border-purple-500/20 absolute cosmic-pulsar" style={{ animationDelay: "3s" }} />
                        </div>
                        
                        {/* Scanning scanner line */}
                        <div className="scanner-line" />

                        {/* Floating Drifting Particles */}
                        <div className="particle" style={{ left: "20%", bottom: "20%", animationDelay: "0s", animationDuration: "5s" }} />
                        <div className="particle" style={{ left: "40%", bottom: "10%", animationDelay: "1.5s", animationDuration: "6s" }} />
                        <div className="particle" style={{ left: "60%", bottom: "25%", animationDelay: "3s", animationDuration: "4s" }} />
                        <div className="particle" style={{ left: "80%", bottom: "15%", animationDelay: "4.5s", animationDuration: "5.5s" }} />
                        
                        {/* Central Pulsing Glowing Core */}
                        <div className="h-16 w-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-white shadow-layered-lg z-20 relative hover:scale-105 transition duration-300">
                          <MessageCircle className="h-8 w-8 text-purple-400 animate-pulse" />
                        </div>
                      </div>

                      <h3 className="text-sm font-black tracking-wider text-white mb-1.5 shimmer-text uppercase">
                        {activeTarget.mode === "campus" ? "Scanning Campus Hub" : "Connecting Global Stream"}
                      </h3>
                      <div className="h-12 flex flex-col justify-center mb-6">
                        <p className="text-zinc-400 font-semibold text-[11px] max-w-[280px] leading-relaxed mb-2">
                          {activeTarget.mode === "campus"
                            ? "Looking for peers at your university..."
                            : "Establishing secure link to global strangers..."}
                        </p>
                      </div>

                      {/* Log console container */}
                      <div className="w-full max-w-sm bg-zinc-950/80 text-left rounded-xl p-3 border border-zinc-800/80 shadow-layered-md font-mono text-[9px] text-zinc-400 select-none mb-8">
                        <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2 mb-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="ml-1 text-[8.5px] font-black uppercase text-zinc-500 tracking-wider">Yappie Stream Console</span>
                        </div>
                        <div className="space-y-1">
                          {getDiagnosticLogs(diagnosticIndex).map((log, i) => (
                            <div key={i} className={i === getDiagnosticLogs(diagnosticIndex).length - 1 ? "text-blue-400 font-bold animate-pulse" : "text-zinc-500"}>
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTarget(null);
                          setShowMobileChat(false);
                        }}
                        className="rounded-full border border-zinc-800 bg-zinc-900/50 px-6 py-2.5 text-[11px] font-extrabold text-zinc-400 hover:text-white hover:border-zinc-700 transition active:scale-95 shadow-layered-sm"
                      >
                        Cancel Search
                      </button>
                    </div>
                  ) : (
                    /* CHAT MESSAGES STREAM */
                    <div className="flex flex-col">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-25 select-none mt-auto mb-auto">
                          <div className="h-11 w-11 rounded-full border border-zinc-800 flex items-center justify-center mb-3">
                            <MessageSquare className="h-5 w-5 text-zinc-450" />
                          </div>
                          <p className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-widest">
                            {activeTarget.type === "match" && !peer ? "Warming up connection..." : "No messages. Say hello!"}
                          </p>
                        </div>
                      ) : (
                        messages.map((item, index) => {
                          const isMe = item.senderId === "me" || item.senderId === session.user.id;
                          
                          // Look at surrounding messages to calculate grouping
                          const prevMsg = index > 0 ? messages[index - 1] : null;
                          const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                          
                          const isPrevSame = prevMsg && (prevMsg.senderId === item.senderId || (prevMsg.senderId === "me" && isMe) || (prevMsg.senderId === session.user.id && isMe));
                          const isNextSame = nextMsg && (nextMsg.senderId === item.senderId || (nextMsg.senderId === "me" && isMe) || (nextMsg.senderId === session.user.id && isMe));
                          
                          let bubbleRadius = "";
                          if (isMe) {
                            if (!isPrevSame && !isNextSame) {
                              // Single message
                              bubbleRadius = "rounded-[18px] rounded-br-[4px]";
                            } else if (!isPrevSame && isNextSame) {
                              // First in sequence
                              bubbleRadius = "rounded-t-[18px] rounded-l-[18px] rounded-br-[4px]";
                            } else if (isPrevSame && isNextSame) {
                              // Middle of sequence
                              bubbleRadius = "rounded-l-[18px] rounded-r-[4px]";
                            } else {
                              // Last in sequence
                              bubbleRadius = "rounded-b-[18px] rounded-l-[18px] rounded-br-[4px]";
                            }
                          } else {
                            if (!isPrevSame && !isNextSame) {
                              // Single message
                              bubbleRadius = "rounded-[18px] rounded-bl-[4px]";
                            } else if (!isPrevSame && isNextSame) {
                              // First in sequence
                              bubbleRadius = "rounded-t-[18px] rounded-r-[18px] rounded-bl-[4px]";
                            } else if (isPrevSame && isNextSame) {
                              // Middle of sequence
                              bubbleRadius = "rounded-r-[18px] rounded-l-[4px]";
                            } else {
                              // Last in sequence
                              bubbleRadius = "rounded-b-[18px] rounded-r-[18px] rounded-bl-[4px]";
                            }
                          }

                          // Spacing: tight if next is same sender, standard if different
                          const spacingClass = isNextSame ? "mb-[3px]" : "mb-[14px]";
                          const msgId = item.id ?? `msg_${index}`;
                          const reactions = messageReactions[msgId] ?? [];
                          const isMenuOpen = activeReactMenuId === msgId;

                          return (
                            <div
                              key={msgId}
                              className={`flex w-full ${isMe ? "justify-end" : "justify-start"} ${spacingClass} msg-spring relative group`}
                            >
                              <div className="relative max-w-[70%]">
                                {/* Emoji reaction bar popup */}
                                {isMenuOpen && (
                                  <div className={`absolute z-30 -top-11 ${isMe ? "right-0" : "left-0"} flex items-center gap-1 bg-[#10111a] border border-zinc-800 shadow-layered-md rounded-full px-2 py-1 emoji-reaction-bar`}>
                                    {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => toggleReaction(msgId, emoji)}
                                        className="text-base emoji-hover-scale p-0.5 active:scale-90"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Hover trigger button to open reaction bar manually */}
                                <button
                                  type="button"
                                  onClick={() => setActiveReactMenuId(isMenuOpen ? null : msgId)}
                                  className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-150 h-6 w-6 rounded-full bg-[#13141f] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 hover:scale-105 shadow-sm z-20 ${
                                    isMe ? "-left-8" : "-right-8"
                                  }`}
                                >
                                  <Smile className="h-3.5 w-3.5" />
                                </button>

                                {/* The bubble itself */}
                                <div 
                                  onClick={() => setActiveReactMenuId(isMenuOpen ? null : msgId)}
                                  className={`px-4 py-2.5 text-[13.5px] font-semibold leading-snug tracking-tight shadow-[0_1px_2px_rgba(0,0,0,0.015)] cursor-pointer select-none relative ${
                                    isMe 
                                      ? "bg-gradient-to-b from-[#6366f1] to-[#7c3aed] text-white self-end ml-auto shadow-layered-sm" 
                                      : "bg-[#181a25] text-slate-100 border border-white/5 mr-auto"
                                  } ${bubbleRadius} ${
                                    !isNextSame ? (isMe ? "bubble-tail-sender" : "bubble-tail-receiver") : ""
                                  }`}
                                >
                                  {item.message}

                                  {/* Reactions list aligned at bottom edge */}
                                  {reactions.length > 0 && (
                                    <div className={`absolute -bottom-2.5 ${isMe ? "left-3" : "right-3"} flex items-center gap-0.5 bg-[#10111a] border border-zinc-800 shadow-md rounded-full px-1.5 py-0.5 z-10 emoji-badge`}>
                                      {reactions.map((emoji, i) => (
                                        <span key={i} className="text-[10px] select-none">{emoji}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Typing indicator dots */}
                      {typing && (
                        <div className="flex w-full justify-start mt-2 msg-spring">
                          <div className="bg-[#181a25] border border-white/5 rounded-[18px] rounded-bl-[4px] px-4 py-3.5 flex items-center gap-1 shadow-layered-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 typing-dot [animation-delay:0s]" />
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 typing-dot [animation-delay:0.2s]" />
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 typing-dot [animation-delay:0.4s]" />
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* iMESSAGE STICKY BOTTOM INPUT PANEL (Pins via dynamic view height) */}
                {!(activeTarget.type === "match" && matchState === "waiting") && (
                  <footer className="p-3 border-t border-zinc-850 bg-[#0d0e16] pb-[dvh] lg:pb-3">
                    
                    <div className="flex items-center gap-3">
                      {/* Ergonomic Pill Skip Button (Only for active matching streams) */}
                      {activeTarget.type === "match" && (
                        <button
                          onClick={handleNextMatch}
                          className="flex-shrink-0 h-10 px-5 rounded-full border border-orange-950/40 bg-orange-950/20 hover:bg-orange-900/30 text-orange-400 hover:text-orange-350 font-extrabold text-[10.5px] tracking-wider uppercase transition active:scale-95 shadow-sm"
                          title="Skip peer (Esc)"
                        >
                          Skip
                        </button>
                      )}

                      {/* macOS iMessage capsule input bar */}
                      <form 
                        onSubmit={handleSendMessage} 
                        className="flex-1 flex items-center border border-zinc-800 bg-zinc-950 rounded-full p-1 shadow-inner focus-within:border-zinc-700 transition duration-150"
                      >
                        {/* Plus icon */}
                        <button
                          type="button"
                          onClick={() => showToast("Attachments feature is simulated for visual demonstration.", "info")}
                          className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-305 hover:scale-105 transition flex-shrink-0 hover:bg-zinc-905 rounded-full"
                          title="Attachments"
                        >
                          <Plus className="h-4.5 w-4.5" />
                        </button>

                        <input
                          type="text"
                          value={messageText}
                          onChange={(e) => sendTypingIndicator(e.target.value)}
                          disabled={activeTarget.type === "match" && !peer}
                          placeholder={
                            activeTarget.type === "match" && !peer
                              ? "Connecting..."
                              : "iMessage"
                          }
                          className="flex-1 bg-transparent px-2.5 py-1.5 text-white font-semibold placeholder-zinc-650 outline-none text-[13.5px] border-none focus:ring-0 focus:outline-none"
                        />

                        {/* Mic icon */}
                        <button
                          type="button"
                          onClick={() => showToast("Audio message feature is simulated for visual demonstration.", "info")}
                          className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-305 hover:scale-105 transition flex-shrink-0 hover:bg-zinc-905 rounded-full"
                          title="Dictation"
                        >
                          <Mic className="h-4.5 w-4.5" />
                        </button>

                        {/* Emoji icon */}
                        <button
                          type="button"
                          className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-305 hover:scale-105 transition flex-shrink-0 hover:bg-zinc-905 rounded-full mr-1"
                          title="Emojis"
                        >
                          <Smile className="h-4.5 w-4.5" />
                        </button>

                        {/* Send Arrow upward Circle send button */}
                        <button
                          type="submit"
                          disabled={!messageText.trim() || (activeTarget.type === "match" && !peer)}
                          className={`h-7.5 w-7.5 flex items-center justify-center rounded-full transition flex-shrink-0 text-white active:scale-95 ${
                            messageText.trim() && (activeTarget.type !== "match" || peer)
                              ? "bg-gradient-to-b from-[#6366f1] to-[#7c3aed] shadow-sm"
                              : "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                          }`}
                          title="Send"
                        >
                          <ArrowUp className="h-4 w-4 stroke-[3.2]" />
                        </button>

                      </form>
                    </div>

                  </footer>
                )}
              </>
            ) : chatOnly ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm font-semibold text-violet-300/60">Connecting...</p>
              </div>
            ) : (
              <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 sm:p-10">
                <div className="float-in mb-8 max-w-lg text-center">
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <LockKeyhole className="h-3.5 w-3.5 text-cyan-300/80" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-300/70">
                      choose a stream
                    </span>
                  </div>
                  <h2 className="mb-3 font-heading text-3xl font-black leading-tight text-white campus-glow-text sm:text-4xl">
                    Start a conversation
                  </h2>
                  <p className="text-sm font-semibold leading-relaxed text-slate-400/80">
                    Pick campus to talk to people at {session.user.college || "your college"}, or go global for a random stranger.
                  </p>
                </div>

                <div className="grid w-full max-w-2xl grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
                  <article className="hub-stream-card hub-stream-campus group">
                    <div className="hub-stream-glow hub-stream-glow-campus" aria-hidden="true" />
                    <div className="relative z-10 flex min-h-[260px] flex-col justify-between p-7 sm:min-h-[300px]">
                      <div>
                        <div className="mb-5 flex items-start justify-between">
                          <div className="hub-stream-icon hub-stream-icon-campus">
                            <GraduationCap className="h-6 w-6" strokeWidth={2} />
                          </div>
                          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-300/55">campus</span>
                        </div>
                        <h3 className="mb-2 font-heading text-xl font-black text-white sm:text-2xl">Chat with campus</h3>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/75">
                          {(session.user.college || "MIT-WPU").toUpperCase()}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-300/70">
                          Match with students at your college. Anonymous, instant, no real names.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab("campus");
                          setActiveTarget({ type: "match", mode: "campus" });
                          setShowMobileChat(true);
                        }}
                        className="hub-stream-cta hub-stream-cta-campus mt-6"
                      >
                        Enter campus chat
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </article>

                  <article className="hub-stream-card hub-stream-random group">
                    <div className="hub-stream-glow hub-stream-glow-random" aria-hidden="true" />
                    <div className="relative z-10 flex min-h-[260px] flex-col justify-between p-7 sm:min-h-[300px]">
                      <div>
                        <div className="mb-5 flex items-start justify-between">
                          <div className="hub-stream-icon hub-stream-icon-random">
                            <Compass className="h-6 w-6" strokeWidth={2} />
                          </div>
                          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-fuchsia-300/55">global</span>
                        </div>
                        <h3 className="mb-2 font-heading text-xl font-black text-white sm:text-2xl">Chat global</h3>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300/75">
                          random · worldwide
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-300/70">
                          Get paired with a stranger from anywhere. Open conversation, zero filters.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab("global");
                          setActiveTarget({ type: "match", mode: "random" });
                          setShowMobileChat(true);
                        }}
                        className="hub-stream-cta hub-stream-cta-random mt-6"
                      >
                        Enter global chat
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </article>
                </div>
              </div>
            )}

          </section>
        </div>
      </div>

      {/* ==================== iOS-STYLE ACTION SHEET MODAL ==================== */}
      {showActionSheet && peer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#07080d]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setShowActionSheet(false)} />
          
          <div className="w-full max-w-[360px] flex flex-col gap-2.5 z-10 animate-in slide-in-from-bottom-12 duration-200">
            <div className="bg-[#10111a]/95 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(124,58,237,0.15)] flex flex-col divide-y divide-zinc-800/70">
              
              <div className="p-4.5 text-center bg-[#131422]/60">
                <div className="mx-auto mb-2.5 h-12 w-12 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#7c3aed] border border-violet-500/30 flex items-center justify-center font-black text-xs text-white shadow-[0_0_10px_rgba(124,58,237,0.3)] select-none">
                  {peer.anonymousUsername.slice(0,2).toUpperCase()}
                </div>
                <h4 className="font-extrabold text-sm text-white font-heading leading-tight">{peer.anonymousUsername}</h4>
                <p className="text-[9px] font-extrabold text-purple-400 mt-1 uppercase tracking-widest">{peer.college || "Other"}</p>
              </div>

              {friendshipStatus === "accepted" ? (
                <div className="w-full py-3.5 text-center text-emerald-400 font-extrabold text-xs flex items-center justify-center gap-1.5 select-none bg-emerald-950/20">
                  <Check className="h-4 w-4 stroke-[3]" /> Added as Friends
                </div>
              ) : friendshipStatus === "pending_sent" ? (
                <div className="w-full py-3.5 text-center text-zinc-500 font-bold text-xs select-none bg-[#10111a]/20">
                  Friend Request Pending...
                </div>
              ) : friendshipStatus === "pending_received" ? (
                <button
                  onClick={handleAcceptRequest}
                  className="w-full py-3.5 text-center text-violet-400 hover:bg-[#151624] font-black text-xs transition active:bg-[#18192a] flex items-center justify-center gap-1.5"
                >
                  <HeartHandshake className="h-4 w-4 text-violet-400" /> Accept Friend Request
                </button>
              ) : (
                <button
                  onClick={handleAddFriend}
                  className="w-full py-3.5 text-center text-zinc-300 hover:bg-[#151624] font-black text-xs transition active:bg-[#18192a] flex items-center justify-center gap-1.5"
                >
                  <HeartHandshake className="h-4 w-4 text-zinc-400" /> Add as Friend
                </button>
              )}

              <button
                onClick={handleReportPeer}
                className="w-full py-3.5 text-center text-zinc-400 hover:bg-[#151624] font-bold text-xs transition active:bg-[#18192a] flex items-center justify-center gap-1.5"
              >
                <Flag className="h-4 w-4 text-zinc-500" /> Report Peer
              </button>

              <button
                onClick={handleBlockPeer}
                className="w-full py-3.5 text-center text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 font-black text-xs transition active:bg-rose-900/30 flex items-center justify-center gap-1.5"
              >
                <Ban className="h-4 w-4 text-rose-400" /> Block Peer
              </button>

            </div>

            <button
              onClick={() => setShowActionSheet(false)}
              className="w-full bg-[#10111a]/95 border border-zinc-800/80 rounded-2xl py-3.5 text-center font-extrabold text-white text-xs shadow-layered-md hover:bg-[#151624] transition active:scale-[0.99] select-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
