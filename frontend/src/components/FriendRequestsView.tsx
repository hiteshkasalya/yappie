"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useMemo } from "react";
import { ArrowLeft, Check, Users, X } from "lucide-react";
import { authFetch } from "@/lib/clientSession";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import type { FriendListItem } from "@/types";
import { OnboardingForm } from "./OnboardingForm";
import { DashboardShell } from "./DashboardShell";

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

export function FriendRequestsView() {
  const router = useRouter();
  const { session, ready } = useAnonymousSession();
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
        await loadFriends();
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
            <Link href="/friends" className="yappie-icon-btn" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="fh-header-title-wrap">
              <h1 className="fh-title">Friend Requests</h1>
              <span className="fh-sub">
                {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="yappie-main yappie-main-scroll">
        <div className="fh-req-list" style={{ marginTop: "1rem", padding: "0 0.5rem" }}>
          {loading ? (
            <div className="fh-loading">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="fh-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="fh-empty" style={{ minHeight: "50dvh" }}>
              <div className="fh-empty-art">
                <div className="fh-empty-ring fh-empty-ring-1" />
                <div className="fh-empty-ring fh-empty-ring-2" />
                <div className="fh-empty-center">
                  <Users className="h-7 w-7" strokeWidth={1.5} />
                </div>
              </div>
              <h2 className="fh-empty-title">All caught up!</h2>
              <p className="fh-empty-sub">No pending friend requests at the moment.</p>
              <Link href="/friends" className="fh-start-btn">
                Back to Friends
              </Link>
            </div>
          ) : (
            pendingRequests.map((req, i) => (
              <div key={req.friendshipId} className="fh-req-card" style={{ animationDelay: `${i * 0.05}s`, background: "var(--surface-1)", border: "1px solid var(--border)", padding: "1rem", borderRadius: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div className="fh-req-card-left" style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <Avatar username={req.friend.anonymousUsername} size={46} />
                  <div className="fh-req-info">
                    <p className="fh-req-name" style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>@{req.friend.anonymousUsername.toLowerCase()}</p>
                    <p className="fh-req-college" style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-2)" }}>{req.friend.college || "Student"}</p>
                  </div>
                </div>
                <div className="fh-req-actions" style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => void rejectRequest(req.friendshipId)}
                    disabled={actionLoading !== null}
                    className="fh-btn-decline"
                    style={{ background: "transparent", border: "1px solid var(--border-hi)", color: "var(--text-2)", padding: "0.5rem 1rem", borderRadius: "0.75rem", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }}
                  >
                    {actionLoading === req.friendshipId + "-reject" ? "..." : "Decline"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void acceptRequest(req.friendshipId)}
                    disabled={actionLoading !== null}
                    className="fh-btn-accept"
                    style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "0.75rem", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", transition: "all 0.2s" }}
                  >
                    {actionLoading === req.friendshipId + "-accept" ? (
                      <span className="fh-spinner" />
                    ) : (
                      <><Check className="h-3.5 w-3.5" />Accept</>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </DashboardShell>
  );
}
