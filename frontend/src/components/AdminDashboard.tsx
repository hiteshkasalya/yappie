"use client";

import { FormEvent, useState } from "react";
import { Activity, AlertTriangle, Radio, UsersRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import type { AdminStats } from "@/types";

const statCards = [
  { key: "totalUsers", label: "Total Users", icon: UsersRound },
  { key: "onlineUsers", label: "Online Users", icon: Radio },
  { key: "activeChats", label: "Active Chats", icon: Activity },
  { key: "reports", label: "Reports", icon: AlertTriangle }
] as const;

export function AdminDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  async function loadStats(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");

    const response = await fetch("/api/admin/stats", {
      headers: adminKey ? { "x-admin-key": adminKey } : undefined
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not load admin stats.");
      return;
    }

    setStats(data as AdminStats);
  }

  return (
    <AppShell>
      <div className="py-4 lg:py-0">
        <header className="mb-5 rounded-lg border border-line bg-panel/90 p-5">
          <p className="text-sm font-semibold text-mint">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-white">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Monitor platform health, online activity, active chats, and safety reports.</p>
        </header>

        <form onSubmit={loadStats} className="mb-5 flex flex-col gap-3 rounded-lg border border-line bg-panel p-4 sm:flex-row">
          <input
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Admin API key"
            className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-4 py-3 text-white outline-none focus:border-mint"
          />
          <button className="rounded-lg bg-mint px-5 py-3 font-black text-ink">Load Stats</button>
        </form>

        {error ? <p className="mb-5 rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.key} className="rounded-lg border border-line bg-panel p-5">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-mint/15 text-mint">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-sm font-semibold text-zinc-400">{card.label}</p>
                <p className="mt-2 text-4xl font-black tracking-normal text-white">{stats ? stats[card.key] : "-"}</p>
              </div>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
