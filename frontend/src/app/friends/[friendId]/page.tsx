import { Suspense } from "react";
import { ChatExperience } from "@/components/ChatExperience";

export default async function FriendChatPage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = await params;
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0C0C0E" }} />}>
      <ChatExperience friendId={friendId} />
    </Suspense>
  );
}
