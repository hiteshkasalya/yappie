import { Suspense } from "react";
import { ConfessionDetail } from "@/components/ConfessionDetail";

export default async function ConfessionDetailPage({ params }: { params: Promise<{ confessionId: string }> }) {
  const { confessionId } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C0C0E]" />}>
      <ConfessionDetail confessionId={confessionId} />
    </Suspense>
  );
}
