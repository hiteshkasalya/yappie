"use client";

import { Suspense } from "react";
import { FriendRequestsView } from "@/components/FriendRequestsView";

export default function FriendRequestsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0b16]" />}>
      <FriendRequestsView />
    </Suspense>
  );
}
