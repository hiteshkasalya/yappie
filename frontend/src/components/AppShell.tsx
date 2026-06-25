"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut, UserRound, UsersRound } from "lucide-react";
import clsx from "clsx";
import { clearStoredSession } from "@/lib/clientSession";
import { disconnectSocket } from "@/lib/socketClient";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/friends", label: "Friends", icon: UsersRound }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAnonymousSession();

  function signOut() {
    disconnectSocket();
    clearStoredSession();
    router.push("/");
  }

  return (
    <main className="min-h-screen">
      <div className="radiant-mesh" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-28 pt-8 sm:px-6 lg:pb-8">
        <header className="sticky top-6 z-40 mb-10 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur-md p-3 shadow-sm">
          <Link href="/" className="flex items-center gap-3.5 ml-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-base font-black text-white shadow-sm">
              S
            </span>
            <div className="hidden sm:block text-left">
              <p className="text-base font-extrabold tracking-tight text-zinc-950 font-heading">Yappie</p>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Campus Chat</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                    isActive
                      ? "bg-zinc-950 text-white shadow-sm"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {session ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 px-3.5 py-1.5 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="max-w-36 text-left">
                  <p className="truncate font-mono text-xs font-bold text-zinc-950">{session.user.anonymousUsername}</p>
                  <p className="truncate text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">{session.user.college || "Other"}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-zinc-200 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-950 shadow-sm active:scale-95"
                title="Sign Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : (
             <div className="h-10 w-10" />
          )}
        </header>

        <section className="min-w-0 flex-1">{children}</section>

        {/* Mobile Nav */}
        <nav className="fixed inset-x-6 bottom-6 z-50 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-lg md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-[9.5px] font-extrabold uppercase tracking-widest transition",
                  isActive ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-800"
                )}
              >
                <Icon className="h-4.5 w-4.5 mb-0.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
