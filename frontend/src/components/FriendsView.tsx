"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Check, MessageCircle, Trash2, X, Users, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { authFetch } from "@/lib/clientSession";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import type { FriendListItem } from "@/types";

export function FriendsView() {
  const { session, ready } = useAnonymousSession();
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFriends = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    const response = await authFetch("/api/friends");
    const data = (await response.json()) as { friends: FriendListItem[] };
    setFriends(data.friends ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session) {
      void loadFriends();
    }
  }, [loadFriends, session]);

  async function updateFriendship(friendshipId: string, action: "accept" | "reject") {
    await authFetch(`/api/friends/${friendshipId}`, {
      method: "PATCH",
      body: JSON.stringify({ action })
    });
    await loadFriends();
  }

  async function removeFriend(friendshipId: string) {
    await authFetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    await loadFriends();
  }

  if (!ready || !session) {
    return <div className="min-h-screen bg-zinc-50" />;
  }

  const accepted = friends.filter((item) => item.status === "accepted");
  const requests = friends.filter((item) => item.status === "pending");

  return (
    <AppShell>
      <div className="py-4 lg:py-0 max-w-4xl mx-auto w-full">
        {/* Monochromatic Header Box */}
        <header className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200/50 mb-3.5">
            <Users className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[10px] font-extrabold tracking-widest text-zinc-500 uppercase">
              Connections
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 font-heading leading-none mb-2">Friends</h1>
          <p className="text-xs font-semibold leading-relaxed text-zinc-400">
            Keep conversations going securely without sharing emails or outside profiles.
          </p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-400 text-sm font-semibold shadow-sm text-left">
            Loading connections...
          </div>
        ) : (
          <div className="space-y-6 text-left">
            
            {/* Pending Requests */}
            {requests.length > 0 && (
              <section>
                <h2 className="mb-3.5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 ml-1">
                  <UserPlus className="h-3.5 w-3.5" /> Pending Requests
                </h2>
                <div className="grid gap-3.5">
                  {requests.map((item) => (
                    <FriendRow
                      key={item.friendshipId}
                      item={item}
                      actions={
                        item.requestedByMe ? (
                          <button
                            onClick={() => removeFriend(item.friendshipId)}
                            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-extrabold text-zinc-500 hover:text-zinc-950 hover:border-zinc-350 transition active:scale-95 bg-white shadow-sm"
                          >
                            Cancel Request
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateFriendship(item.friendshipId, "accept")}
                              className="rounded-xl bg-zinc-950 p-2.5 text-white hover:bg-zinc-800 transition active:scale-95 shadow-sm"
                              title="Accept Request"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateFriendship(item.friendshipId, "reject")}
                              className="rounded-xl border border-zinc-200 p-2.5 text-zinc-400 hover:text-zinc-950 hover:border-zinc-350 transition active:scale-95 bg-white shadow-sm"
                              title="Reject Request"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Active Connections */}
            <section>
              <h2 className="mb-3.5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 ml-1">
                <Users className="h-3.5 w-3.5" /> Direct Connections
              </h2>
              {accepted.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-xs font-semibold leading-relaxed text-zinc-400 shadow-sm">
                  Verified connections will appear here. Invite people to lock handles and message them directly anytime.
                </div>
              ) : (
                <div className="grid gap-3.5">
                  {accepted.map((item) => (
                    <FriendRow
                      key={item.friendshipId}
                      item={item}
                      actions={
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/friends/${item.friend.id}`}
                            className="rounded-xl bg-zinc-950 p-2.5 text-white hover:bg-zinc-800 transition active:scale-95 shadow-sm flex items-center justify-center"
                            title="Open Chat"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => removeFriend(item.friendshipId)}
                            className="rounded-xl border border-zinc-200 p-2.5 text-zinc-400 hover:text-rose-600 hover:border-rose-200 transition active:scale-95 bg-white shadow-sm"
                            title="Remove Connection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FriendRow({ item, actions }: { item: FriendListItem; actions: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4.5 sm:flex-row sm:items-center sm:justify-between shadow-sm hover:border-zinc-300 transition duration-200">
      <div className="min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${item.friend.online ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`} />
          <h3 className="truncate font-mono font-bold text-sm text-zinc-950 tracking-tight">{item.friend.anonymousUsername}</h3>
        </div>
        <p className="mt-1 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">{(item.friend.college || "Other").replace("Hub", "").trim()} Hub</p>
        <p className="mt-1 text-[10px] font-bold text-zinc-400">{item.friend.online ? "Online" : "Offline"}</p>
      </div>
      <div className="flex gap-2 justify-end">{actions}</div>
    </div>
  );
}
