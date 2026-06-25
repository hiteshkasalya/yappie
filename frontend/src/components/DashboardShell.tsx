"use client";

import { HubBackgroundDecor } from "./HubBackgroundDecor";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="yappie-app fixed inset-0 flex min-h-[100dvh] w-screen flex-col overflow-hidden">
      <div className="yappie-bg" aria-hidden="true">
        <div className="yappie-bg-aurora" />
        <div className="yappie-bg-noise" />
        <HubBackgroundDecor />
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
