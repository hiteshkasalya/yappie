"use client";

import { Suspense } from "react";
import { FriendsHub } from "@/components/FriendsHub";

export default function FriendsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0b16]" />}>
      <FriendsHub />
    </Suspense>
  );
}
