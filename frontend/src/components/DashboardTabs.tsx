"use client";

import Link from "next/link";
import { User, Users } from "lucide-react";

export function DashboardTabs({
  active,
  onProfileClick,
  requestCount = 0,
}: {
  active: "home" | "friends" | "profile";
  onProfileClick?: () => void;
  requestCount?: number;
}) {
  return (
    <nav className="yappie-tabs" aria-label="Dashboard navigation">
      <Link
        href="/friends"
        className={`yappie-tab ${active === "friends" ? "yappie-tab-on" : ""}`}
      >
        <Users className="h-[15px] w-[15px]" strokeWidth={2.2} />
        <span>Friends</span>
        {requestCount > 0 && active !== "friends" && (
          <span className="yappie-tab-badge">{requestCount > 9 ? "9+" : requestCount}</span>
        )}
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
