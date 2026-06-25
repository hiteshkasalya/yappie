"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { User, Users } from "lucide-react";
import { authFetch } from "@/lib/clientSession";

export function DashboardTabs({
  active,
  onProfileClick,
  requestCount = 0,
}: {
  active: "home" | "friends" | "profile";
  onProfileClick?: () => void;
  requestCount?: number;
}) {
  const [counts, setCounts] = useState({ pendingRequests: requestCount, unreadMessages: 0 });

  useEffect(() => {
    let mounted = true;
    async function loadBadges() {
      try {
        const res = await authFetch("/api/friends/badges");
        if (res.ok && mounted) {
          const data = await res.json() as { pendingRequests: number; unreadMessages: number };
          setCounts({
            pendingRequests: data.pendingRequests ?? 0,
            unreadMessages: data.unreadMessages ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to load badges:", err);
      }
    }
    void loadBadges();
    const interval = setInterval(loadBadges, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const hasAlert = counts.pendingRequests > 0 || counts.unreadMessages > 0;

  return (
    <nav className="yappie-tabs" aria-label="Dashboard navigation">
      <Link
        href="/friends"
        className={`yappie-tab ${active === "friends" ? "yappie-tab-on" : ""}`}
      >
        <span className="relative flex items-center gap-1.5">
          <Users className="h-[15px] w-[15px]" strokeWidth={2.2} />
          <span>Friends</span>
          {hasAlert && active !== "friends" && (
            <span className="absolute -top-1 -right-2 h-2.5 w-2.5 rounded-full bg-[#ef4444] border-2 border-[#0C0C0E] shadow-[0_0_8px_#ef4444]" />
          )}
        </span>
      </Link>
      {onProfileClick ? (
        <button
          type="button"
          onClick={onProfileClick}
          className={`yappie-tab ${active === "profile" ? "yappie-tab-on" : ""}`}
        >
          <User className="h-[15px] w-[15px]" strokeWidth={2.2} />
          <span>Profile</span>
        </button>
      ) : (
        <Link href="/?tab=profile" className={`yappie-tab ${active === "profile" ? "yappie-tab-on" : ""}`}>
          <User className="h-[15px] w-[15px]" strokeWidth={2.2} />
          <span>Profile</span>
        </Link>
      )}
    </nav>
  );
}
