import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatExperience } from "@/components/ChatExperience";
import type { MatchMode } from "@/types";

export default async function ChatPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;

  if (mode !== "random" && mode !== "campus") {
    notFound();
  }

  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0C0C0E" }} />}>
      <ChatExperience mode={mode as MatchMode} />
    </Suspense>
  );
}
