"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  LogOut,
  Settings,
  Shield,
  MessageCircle,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { getSocket } from "@/lib/socketClient";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import { authFetch, getStoredSession, saveStoredSession } from "@/lib/clientSession";
import { OnboardingForm } from "./OnboardingForm";
import { DashboardShell } from "./DashboardShell";
import { DashboardTabs } from "./DashboardTabs";
import { trackEvent } from "@/lib/analytics";
import { CollegeSelectorModal, COLLEGES } from "./CollegeSelectorModal";

function avatarHue(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export function DashboardHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, ready } = useAnonymousSession();
  const [showSettings, setShowSettings] = useState(false);

  const [editAge, setEditAge] = useState("");
  const [editCollege, setEditCollege] = useState<string>("MIT WPU");
  const [collegeModalOpen, setCollegeModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const showProfile = searchParams.get("tab") === "profile";

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);

    const ageNum = parseInt(editAge, 10);
    if (isNaN(ageNum) || ageNum < 17 || ageNum > 80) {
      setEditError("Age must be between 17 and 80.");
      setEditLoading(false);
      return;
    }

    try {
      const response = await authFetch("/api/auth/onboard", {
        method: "POST",
        body: JSON.stringify({ age: ageNum, college: editCollege })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setEditError(data?.error || "Failed to update profile.");
        setEditLoading(false);
        return;
      }

      const stored = getStoredSession();
      if (stored && data.user) {
        stored.user = data.user;
        saveStoredSession(stored);
      }
      setShowSettings(false);
    } catch (err) {
      setEditError("Unable to connect to the server.");
    } finally {
      setEditLoading(false);
    }
  }

  useEffect(() => {
    if (ready && !session) router.replace("/");
  }, [ready, session, router]);

  if (!ready || !session) return <div className="yappie-app yappie-loading" />;

  if (session.user.age === undefined || session.user.college === undefined) {
    return <OnboardingForm />;
  }

  function signOut() {
    getSocket(session!).disconnect();
    router.push("/");
    setTimeout(() => window.location.reload(), 100);
  }

  const hue = avatarHue(session.user.anonymousUsername);

  return (
    <DashboardShell>
      <header className="yappie-header">
        <div className="yappie-header-inner flex items-center justify-between">
          <div className="yappie-brand">
            <div className="yappie-brand-mark">
              <MessageCircle className="h-[18px] w-[18px] text-[#0C0C0E]" />
            </div>
            <span className="yappie-brand-name">
              yappie
            </span>
          </div>
          <Link 
            href="/about" 
            className="font-sans text-xs font-extrabold text-zinc-500 hover:text-white transition-colors duration-200 lowercase tracking-tight"
          >
            about
          </Link>
        </div>

        <div className="yappie-header-inner mt-5">
          <DashboardTabs
            active={showProfile ? "profile" : "home"}
            onProfileClick={() => router.push("/?tab=profile")}
          />
        </div>
      </header>

      <main className="yappie-main yappie-main-scroll">
        {!showProfile ? (
          <>
            <div className="yappie-hero">
              <p className="yappie-eyebrow">Welcome back</p>
              <h1 className="yappie-title">
                Hey, <span className="yappie-title-accent">{session.user.anonymousUsername}</span>
              </h1>
              <p className="yappie-subtitle">
                Choose where you want to talk. Nobody sees your real name.
              </p>
            </div>

            <div className="yappie-cards">
              {session.user.college && session.user.college !== "Other" && (
                <Link
                  href="/chat/campus"
                  className="yappie-card yappie-card-campus"
                >
                  <div className="yappie-card-accent" />
                  <div className="yappie-card-body">
                    <div className="yappie-card-text">
                      <h2 className="yappie-card-title">Chat With Campus</h2>
                      <p className="yappie-card-tag">{session.user.college}</p>
                      <p className="yappie-card-desc">Students at your university. Anonymous.</p>
                    </div>
                    <div className="yappie-card-arrow">
                      <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </div>
                  </div>
                </Link>
              )}

              <Link
                href="/chat/random"
                className="yappie-card yappie-card-global"
              >
                <div className="yappie-card-accent yappie-card-accent-global" />
                <div className="yappie-card-body">
                  <div className="yappie-card-text">
                    <h2 className="yappie-card-title">Chat With Global</h2>
                    <p className="yappie-card-tag">Random · Worldwide</p>
                    <p className="yappie-card-desc">A stranger from anywhere. No filters.</p>
                  </div>
                  <div className="yappie-card-arrow yappie-card-arrow-global">
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </div>
                </div>
              </Link>

              <Link
                href="/confessions"
                className="yappie-card yappie-card-confessions"
              >
                <div className="yappie-card-accent yappie-card-accent-confessions" />
                <div className="yappie-card-body">
                  <div className="yappie-card-text">
                    <h2 className="yappie-card-title">Confessions Feed</h2>
                    <p className="yappie-card-tag">Anonymous · 7 Days TTL</p>
                    <p className="yappie-card-desc">Share and read anonymous campus secrets.</p>
                  </div>
                  <div className="yappie-card-arrow yappie-card-arrow-global">
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </div>
                </div>
              </Link>
            </div>

            <p className="yappie-footer-note">Encrypted anonymous session</p>
          </>
        ) : (
          <div className="yappie-profile">
            <div className="yappie-profile-hero">
              <div
                className="yappie-avatar"
                style={{
                  background: `linear-gradient(135deg, hsl(0, 0%, ${25 + (hue % 15)}%), hsl(0, 0%, ${10 + (hue % 10)}%))`,
                }}
              >
                {session.user.anonymousUsername.slice(0, 2).toUpperCase()}
              </div>
              <h1 className="yappie-profile-name">{session.user.anonymousUsername}</h1>
              <p className="yappie-profile-meta">{session.user.college || "Campus"}</p>
            </div>

            <div className="yappie-profile-list">
              <div className="yappie-list-row">
                <Shield className="h-[18px] w-[18px] text-[#a855f7]" strokeWidth={2} />
                <div>
                  <p className="yappie-list-title">Anonymous mode</p>
                  <p className="yappie-list-sub">Real identity never shown</p>
                </div>
              </div>

              <button type="button" onClick={() => {
                if (!showSettings && session) {
                  setEditAge(session.user.age?.toString() || "");
                  setEditCollege((session.user.college as any) || "MIT WPU");
                  setEditError("");
                }
                setShowSettings((v) => !v);
              }} className="yappie-list-row yappie-list-btn">
                <Settings className="h-[18px] w-[18px] text-[#a855f7]" strokeWidth={2} />
                <span className="yappie-list-title flex-1 text-left">Settings</span>
                <ArrowRight className={`h-4 w-4 text-zinc-600 transition ${showSettings ? "rotate-90" : ""}`} />
              </button>

              {showSettings && (
                <div className="yappie-settings-panel pt-3">
                  <p className="mb-5 text-[11px] opacity-70">Your session is encrypted. Email and real name stay private in every chat.</p>
                  
                  <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Age</label>
                      <input
                        type="number"
                        min={17}
                        max={80}
                        required
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                        className="rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">College Hub</label>
                      <button
                        type="button"
                        onClick={() => setCollegeModalOpen(true)}
                        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                        className="rounded-lg px-3 py-2 text-sm flex items-center justify-between text-left transition-colors active:scale-[0.99]"
                      >
                        <span className="font-sans font-bold text-xs truncate max-w-[220px]">
                          {COLLEGES.find(c => c.id === editCollege)?.name || editCollege}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                      </button>

                      <CollegeSelectorModal
                        isOpen={collegeModalOpen}
                        onClose={() => setCollegeModalOpen(false)}
                        selectedValue={editCollege}
                        onChange={(val) => setEditCollege(val)}
                      />
                    </div>
                    {editError && <p className="text-[11px] text-red-500 mt-1">{editError}</p>}
                    <button
                      type="submit"
                      disabled={editLoading}
                      style={{ background: 'var(--text-1)', color: 'var(--bg)' }}
                      className="mt-2 rounded-lg py-2.5 text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {editLoading ? "Updating..." : "Save Changes"}
                    </button>
                  </form>
                </div>
              )}

              <button type="button" onClick={signOut} className="yappie-list-row yappie-list-btn yappie-list-danger">
                <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
                <span className="yappie-list-title">Sign out</span>
              </button>
            </div>

            <button type="button" onClick={() => router.push("/")} className="yappie-back-link">
              ← Back to streams
            </button>
          </div>
        )}
      </main>
    </DashboardShell>
  );
}
