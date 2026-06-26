"use client";

import { Suspense } from "react";
import { JoinForm } from "@/components/JoinForm";
import { DashboardHome } from "@/components/DashboardHome";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";

export function HomeClient() {
  const { session, ready } = useAnonymousSession();

  if (!ready) {
    return <div className="min-h-screen bg-[#0b0b16]" />;
  }

  if (!session) {
    return <JoinForm />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0b16]" />}>
      <DashboardHome />
    </Suspense>
  );
}
