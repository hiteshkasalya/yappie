"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Search,
  UserPlus,
  X,
  Users,
} from "lucide-react";
import { authFetch } from "@/lib/clientSession";
import { getSocket } from "@/lib/socketClient";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import type { FriendListItem } from "@/types";
import { OnboardingForm } from "./OnboardingForm";
import { DashboardShell } from "./DashboardShell";
import { DashboardTabs } from "./DashboardTabs";

function avatarHue(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function Avatar({ username, size = 44 }: { username: string; size?: number }) {
  const hue = avatarHue(username);
  return (
    <div
      className="fh-avatar"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, hsl(${hue},60%,42%), hsl(${(hue + 40) % 360},45%,28%))`,
        fontSize: size < 40 ? "0.7rem" : "0.8rem",
      }}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function FriendsHub() {
  const router = useRouter();
  const { session, ready } = useAnonymousSession();
  const [friends, setFriends] = useState<FriendListItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("yappie_friends_list");
        if (cached) {
          return JSON.parse(cached) as FriendListItem[];
        }
      } catch (e) {
        console.error("Failed to load friends from cache", e);
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("yappie_friends_list");
        if (cached) return false;
      } catch {}
    }
    return true;
  });
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const loadFriends = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/friends");
      if (res.ok) {
        const data = await res.json() as { friends: FriendListItem[] };
        const friendsList = data.friends ?? [];
        setFriends(friendsList);
        sessionStorage.setItem("yappie_friends_list", JSON.stringify(friendsList));
      }
    } catch (err) {
      console.error("Failed to load friends:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (ready && !session) { router.replace("/"); return; }
    if (session) void loadFriends();
  }, [ready, session, router, loadFriends]);

  // Real-time socket status updates
  useEffect(() => {
    if (!session) return;
    const socket = getSocket(session);

    const onPresence = (payload: { friendId: string; online: boolean }) => {
      setFriends((current) =>
        current.map((item) => {
          if (item.friend.id === payload.friendId) {
            return {
              ...item,
              friend: { ...item.friend, online: payload.online }
            };
          }
          return item;
        })
      );
    };

    const onMessage = (payload: any) => {
      setFriends((current) =>
        current.map((item) => {
          if (item.friend.id === payload.senderId) {
            return {
              ...item,
              unreadCount: (item.unreadCount || 0) + 1
            };
          }
          return item;
        })
      );
    };

    socket.on("friend:presence", onPresence);
    socket.on("chat:message", onMessage);

    return () => {
      socket.off("friend:presence", onPresence);
      socket.off("chat:message", onMessage);
    };
  }, [session]);

  const pendingRequests = useMemo(
    () => friends.filter(f => f.status === "pending" && !f.requestedByMe),
    [friends]
  );

  const acceptedFriends = useMemo(() =>
    friends.filter(f => {
      if (f.status !== "accepted") return false;
      if (!search.trim()) return true;
      return f.friend.anonymousUsername.toLowerCase().includes(search.toLowerCase());
    }),
    [friends, search]
  );

  // Unified list: online friends first, offline friends second
  const sortedFriends = useMemo(() => {
    return [...acceptedFriends].sort((a, b) => {
      if (a.friend.online && !b.friend.online) return -1;
      if (!a.friend.online && b.friend.online) return 1;
      return 0;
    });
  }, [acceptedFriends]);

  if (!ready || !session) return <div className="yappie-app yappie-loading" />;
  if (session.user.age === undefined || session.user.college === undefined) {
    return <OnboardingForm />;
  }

  return (
    <DashboardShell>
      {/* ── HEADER ── */}
      <header className="yappie-header">
        <div className="yappie-header-inner">
          <div className="fh-header-row">
            <Link href="/" className="yappie-icon-btn" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="fh-header-title-wrap">
              <h1 className="fh-title">Friends</h1>
              <span className="fh-sub">
                {acceptedFriends.length} friend{acceptedFriends.length !== 1 ? "s" : ""}
                {acceptedFriends.filter(f => f.friend.online).length > 0 && (
                  <span className="fh-online-badge"> · {acceptedFriends.filter(f => f.friend.online).length} online</span>
                )}
              </span>
            </div>

            <Link
              href="/friends/requests"
              className="fh-req-btn"
            >
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>Requests</span>
              {pendingRequests.length > 0 && (
                <span className="fh-req-badge">{pendingRequests.length > 9 ? "9+" : pendingRequests.length}</span>
              )}
            </Link>
          </div>
        </div>

        <div className="yappie-header-inner mt-4">
          <DashboardTabs active="friends" requestCount={pendingRequests.length} />
        </div>
      </header>

      <main className="yappie-main yappie-main-scroll">
        {/* ── SEARCH ── */}
        <div className="fh-search-wrap">
          <Search className="fh-search-icon" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search friends..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="fh-search"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="fh-search-clear">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="fh-loading">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="fh-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : acceptedFriends.length === 0 ? (
          <div className="fh-empty">
            <div className="fh-empty-art">
              <div className="fh-empty-ring fh-empty-ring-1" />
              <div className="fh-empty-ring fh-empty-ring-2" />
              <div className="fh-empty-center">
                <Users className="h-7 w-7" strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="fh-empty-title">No friends yet</h2>
            <p className="fh-empty-sub">
              {search ? `No results for "${search}"` : "Match on campus or global, connect with people you vibe with."}
            </p>
            {!search && (
              <Link href="/" className="fh-start-btn">
                Start matching
              </Link>
            )}
          </div>
        ) : (
          <div className="fh-friend-list">
            {sortedFriends.map((item, i) => (
              <FriendRow key={item.friendshipId} item={item} index={i} />
            ))}
          </div>
        )}
      </main>
    </DashboardShell>
  );
}

function FriendRow({ item, index }: { item: FriendListItem; index: number }) {
  return (
    <Link
      href={`/friends/${item.friend.id}`}
      className="fh-friend-row"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="fh-friend-avatar-wrap">
        <Avatar username={item.friend.anonymousUsername} size={46} />
        <span className={`fh-presence ${item.friend.online ? "fh-presence-online" : "fh-presence-offline"}`} />
      </div>
      <div className="fh-friend-meta">
        <p className="fh-friend-name">@{item.friend.anonymousUsername.toLowerCase()}</p>
        <p className="fh-friend-college">{item.friend.college || "Student"}</p>
      </div>
      <div className="fh-friend-right">
        {item.unreadCount && item.unreadCount > 0 ? (
          <span className="fh-unread-badge">{item.unreadCount}</span>
        ) : item.friend.online ? (
          <span className="fh-active-pill">active</span>
        ) : null}
        <ChevronRight className="h-4 w-4 fh-chevron" />
      </div>
    </Link>
  );
}
