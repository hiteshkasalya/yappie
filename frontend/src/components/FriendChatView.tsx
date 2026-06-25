"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { authFetch } from "@/lib/clientSession";
import { getSocket } from "@/lib/socketClient";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import type { ChatMessage, FriendListItem, PublicUser } from "@/types";

export function FriendChatView({ friendId }: { friendId: string }) {
  const router = useRouter();
  const { session, ready } = useAnonymousSession();
  const [friend, setFriend] = useState<PublicUser | null>(null);
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ready && !session) {
      router.push("/");
    }
  }, [ready, router, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const currentSession = session;

    async function load() {
      const friendsResponse = await authFetch("/api/friends");
      const friendsData = (await friendsResponse.json()) as { friends: FriendListItem[] };
      const currentFriend = friendsData.friends.find((item) => item.friend.id === friendId && item.status === "accepted");

      if (!currentFriend) {
        setStatus("Friend chat is not available.");
        return;
      }

      setFriend(currentFriend.friend);
      const historyResponse = await authFetch(`/api/messages/friend/${friendId}`);
      const history = (await historyResponse.json()) as { messages: ChatMessage[] };
      setMessages(history.messages ?? []);

      const socket = getSocket(currentSession);
      socket.emit("friend:join", { friendId });
    }

    void load();
  }, [friendId, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const socket = getSocket(session);

    const handleJoined = (payload: { roomId: string }) => {
      setRoomId(payload.roomId);
      setStatus("Connected");
    };

    const handleMessage = (incoming: ChatMessage) => {
      if (incoming.roomId.includes(friendId)) {
        setMessages((current) => [...current, incoming]);
      }
    };

    const handleTyping = (payload: { userId: string; isTyping: boolean }) => {
      if (payload.userId === friendId) {
        setTyping(payload.isTyping);
      }
    };

    const handleError = (payload: { message: string }) => {
      setStatus(payload.message);
    };

    socket.on("friend:joined", handleJoined);
    socket.on("chat:message", handleMessage);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:error", handleError);

    return () => {
      socket.off("friend:joined", handleJoined);
      socket.off("chat:message", handleMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:error", handleError);
    };
  }, [friendId, session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function updateMessage(value: string) {
    setMessage(value);

    if (session && roomId) {
      getSocket(session).emit("chat:typing", { roomId, isTyping: value.length > 0 });
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !friend || !message.trim()) {
      return;
    }

    getSocket(session).emit("friend:message", { friendId: friend.id, message });
    setMessage("");
  }

  if (!ready || !session) {
    return <div className="min-h-screen bg-zinc-50" />;
  }

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex-col py-2 max-w-2xl mx-auto w-full px-2">
        
        {/* Apple iMessage Style Header */}
        <header className="sticky top-0 z-30 mb-3.5 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-md p-3.5 shadow-sm">
          <Link 
            href="/friends" 
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-950 transition active:scale-95"
            title="Back to Friends"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>

          <div className="flex items-center gap-2.5 text-center select-none">
            <div className="h-9 w-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shadow-inner flex-shrink-0 text-zinc-600 font-extrabold text-xs">
              {friend ? friend.anonymousUsername.slice(0, 2).toUpperCase() : "??"}
            </div>
            <div className="text-left">
              <h1 className="text-sm font-black tracking-tight text-zinc-950 font-heading leading-none">
                {friend?.anonymousUsername ?? "Friend Chat"}
              </h1>
              <p className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest mt-0.5 leading-none">
                {friend ? `${(friend.college || "Other").replace("Hub", "").trim()} Hub · ${friend.online ? "Online" : "Offline"}` : status}
              </p>
            </div>
          </div>

          <div className="h-9 w-9" /> {/* Visual Balance Spacer */}
        </header>

        {/* Apple iOS iMessage Chat Container */}
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          
          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto px-4.5 py-5 space-y-3.5 scroll-smooth bg-zinc-50/15">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-25 select-none">
                <p className="text-[10px] font-extrabold tracking-widest text-zinc-500 uppercase">
                  {status || "Conversations stay anonymous inside Yappie."}
                </p>
              </div>
            ) : (
              messages.map((item, index) => {
                const mine = item.senderId === session.user.id;
                
                // iOS Bubble Border Radius Logic
                const bubbleStyle = mine 
                  ? "bg-[#007aff] text-white rounded-[18px] rounded-br-[4px] self-end ml-auto" 
                  : "bg-[#e5e5ea] text-zinc-900 rounded-[18px] rounded-bl-[4px] mr-auto";

                return (
                  <div key={item.id ?? index} className={`flex w-full ${mine ? "justify-end" : "justify-start"} float-in`}>
                    <div className={`max-w-[72%] px-4 py-2 text-sm font-semibold leading-snug tracking-tight shadow-sm font-sans ${bubbleStyle}`}>
                      {item.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator and Input Area */}
          <div className="p-3 border-t border-zinc-150 bg-white">
            {typing && (
              <div className="px-3 pb-2 flex items-center gap-1.5">
                <div className="flex gap-0.8">
                  <div className="typing-dot bg-[#8e8e93]" />
                  <div className="typing-dot bg-[#8e8e93] [animation-delay:0.2s]" />
                  <div className="typing-dot bg-[#8e8e93] [animation-delay:0.4s]" />
                </div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#8e8e93]">Friend typing</span>
              </div>
            )}
            
            {/* iOS Rounded Input Capsule (Full Width for Friend Chat) */}
            <div className="w-full flex items-center">
              <form onSubmit={sendMessage} className="flex-1 flex items-center border border-zinc-250 bg-white rounded-full p-1 shadow-sm focus-within:border-zinc-400 transition-colors">
                <input
                  value={message}
                  onChange={(event) => updateMessage(event.target.value)}
                  disabled={!friend}
                  maxLength={700}
                  placeholder="iMessage"
                  className="flex-1 bg-transparent px-3.5 py-1.5 text-zinc-900 font-semibold placeholder-zinc-300 outline-none text-[13.5px] border-none focus:ring-0 focus:outline-none"
                />
                <button
                  disabled={!friend || !message.trim()}
                  className="flex-shrink-0 h-8.5 w-8.5 items-center justify-center rounded-full bg-[#007aff] hover:bg-[#0066d6] text-white transition disabled:opacity-20 active:scale-95 flex"
                  title="Send Message"
                >
                  <ArrowUp className="h-4.5 w-4.5 stroke-[2.5]" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
