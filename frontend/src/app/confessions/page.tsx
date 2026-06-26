"use client";

import { Suspense } from "react";
import { ConfessionsFeed } from "@/components/ConfessionsFeed";

export default function ConfessionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C0C0E]" />}>
      <ConfessionsFeed />
    </Suspense>
  );
}
