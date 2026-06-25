"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  MessageCircle,
  Search,
  UserPlus,
  X,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { authFetch } from "@/lib/clientSession";
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
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadFriends = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/friends");
      if (res.ok) {
        const data = await res.json() as { friends: FriendListItem[] };
        setFriends(data.friends ?? []);
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

  const onlineFriends = acceptedFriends.filter(f => f.friend.online);
  const offlineFriends = acceptedFriends.filter(f => !f.friend.online);

  useEffect(() => {
    if (pendingRequests.length > 0) setShowRequests(true);
  }, [pendingRequests.length]);

  if (!ready || !session) return <div className="yappie-app yappie-loading" />;
  if (session.user.age === undefined || session.user.college === undefined) {
    return <OnboardingForm />;
  }

  async function acceptRequest(friendshipId: string) {
    setActionLoading(friendshipId + "-accept");
    try {
      const res = await authFetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      });
      if (res.ok) {
        // Reload friends list immediately
        await loadFriends();
        if (pendingRequests.length <= 1) setShowRequests(false);
      }
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  }

  async function rejectRequest(friendshipId: string) {
    setActionLoading(friendshipId + "-reject");
    try {
      await authFetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reject" }),
      });
      await loadFriends();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
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
                {onlineFriends.length > 0 && (
                  <span className="fh-online-badge"> · {onlineFriends.length} online</span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowRequests(v => !v)}
              className={`fh-req-btn ${showRequests ? "fh-req-btn-active" : ""}`}
            >
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>Requests</span>
              {pendingRequests.length > 0 && (
                <span className="fh-req-badge">{pendingRequests.length > 9 ? "9+" : pendingRequests.length}</span>
              )}
            </button>
          </div>
        </div>

        <div className="yappie-header-inner mt-4">
          <DashboardTabs active="friends" requestCount={pendingRequests.length} />
        </div>
      </header>

      <main className="yappie-main yappie-main-scroll">

        {/* ── REQUESTS PANEL ── */}
        {showRequests && (
          <div className="fh-req-panel">
            <div className="fh-req-panel-header">
              <span className="fh-section-label">Friend Requests</span>
              <button type="button" onClick={() => setShowRequests(false)} className="fh-close-btn">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="fh-req-list">
              {pendingRequests.length === 0 ? (
                <div className="fh-req-empty">
                  <span>✓</span>
                  <p>No pending friend requests</p>
                </div>
              ) : pendingRequests.map((req, i) => (
                <div key={req.friendshipId} className="fh-req-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="fh-req-card-left">
                    <Avatar username={req.friend.anonymousUsername} size={46} />
                    <div className="fh-req-info">
                      <p className="fh-req-name">@{req.friend.anonymousUsername.toLowerCase()}</p>
                      <p className="fh-req-college">{req.friend.college || "Student"}</p>
                    </div>
                  </div>
                  <div className="fh-req-actions">
                    <button
                      type="button"
                      onClick={() => void rejectRequest(req.friendshipId)}
                      disabled={actionLoading !== null}
                      className="fh-btn-decline"
                    >
                      {actionLoading === req.friendshipId + "-reject" ? "..." : "Decline"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void acceptRequest(req.friendshipId)}
                      disabled={actionLoading !== null}
                      className="fh-btn-accept"
                    >
                      {actionLoading === req.friendshipId + "-accept" ? (
                        <span className="fh-spinner" />
                      ) : (
                        <><Check className="h-3.5 w-3.5" />Accept</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                <MessageCircle className="h-4 w-4" />
                Start matching
              </Link>
            )}
          </div>
        ) : (
          <div className="fh-friend-list">
            {/* Online section */}
            {onlineFriends.length > 0 && (
              <>
                <div className="fh-section-header">
                  <Wifi className="h-3 w-3" />
                  <span>Online now · {onlineFriends.length}</span>
                </div>
                {onlineFriends.map((item, i) => (
                  <FriendRow key={item.friendshipId} item={item} index={i} />
                ))}
              </>
            )}

            {/* Offline section */}
            {offlineFriends.length > 0 && (
              <>
                <div className="fh-section-header fh-section-header-muted" style={{ marginTop: onlineFriends.length > 0 ? "1rem" : 0 }}>
                  <WifiOff className="h-3 w-3" />
                  <span>Offline · {offlineFriends.length}</span>
                </div>
                {offlineFriends.map((item, i) => (
                  <FriendRow key={item.friendshipId} item={item} index={i} />
                ))}
              </>
            )}
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
        {item.friend.online && <span className="fh-active-pill">active</span>}
        <ChevronRight className="h-4 w-4 fh-chevron" />
      </div>
    </Link>
  );
}
