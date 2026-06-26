"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { saveStoredSession } from "@/lib/clientSession";
import { MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function JoinForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        try {
          const res = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: session.access_token }),
          });
          const data = await res.json();
          if (res.ok && data.user) {
            saveStoredSession(data);
          }
        } catch (err) {
          console.error("Session sync failed:", err);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSuccess = async (accessToken: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        saveStoredSession(data);
        trackEvent("login", { method: "Google" });
        window.location.href = "/";
      } else {
        setError(data.error || "Google Login failed.");
      }
    } catch (err) {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#07080a] text-slate-100 selection:bg-cyan-400 selection:text-slate-950">
      
      {/* High-Precision Grid Background */}
      <div className="yappie-grid-bg" />

      {/* Main content wrapper */}
      <div className="relative z-10 flex-grow flex flex-col">
        {/* ==================== 1. TOP HEADER NAVIGATION ==================== */}
        <header className="relative z-40 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-layered-md backdrop-blur-xl">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300" />
            </div>
            <span className="select-none font-heading text-lg sm:text-xl font-black tracking-tight text-white campus-glow-text">
              Yappie
            </span>
          </div>

          {/* Responsive Navbar Middle Links */}
          <nav className="campus-chip flex items-center gap-1 rounded-full p-1 text-[10px] sm:text-xs font-black text-white/60">
            <Link href="/" className="rounded-full px-3 py-2 sm:px-4 sm:py-2.5 text-white transition duration-200 hover:bg-white/10">Home</Link>
            <Link
              href="/about"
              className="group relative rounded-full px-3 py-2 sm:px-4 sm:py-2.5 transition duration-200 hover:bg-white/10 hover:text-white"
            >
              <span className="relative z-10 font-black">About</span>
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/0 via-cyan-400/10 to-violet-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
          </nav>
        </header>

        {/* ==================== 2. MAIN HERO SECTION ==================== */}
        <main className="relative z-30 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-5 py-8 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:py-14">
          
          {/* Left Pitch content */}
          <div className="float-in flex flex-col items-start text-left lg:col-span-6">
            <h1 className="mb-6 font-heading text-5xl font-black leading-[0.98] tracking-tight text-white campus-glow-text sm:text-6xl lg:text-7xl">
              Talk to strangers,<br />
              <span className="campus-gradient-text">Make friends!</span>
            </h1>

            <p className="mb-8 max-w-lg text-base font-bold leading-8 text-slate-200/70 lg:text-lg">
              Unfiltered campus chat. Connect and text chat with other students from your college instantly and anonymously.
            </p>
          </div>

          {/* Right Embedded Form Column */}
          <div id="auth-card" className="relative z-20 flex w-full items-center justify-center lg:col-span-6 lg:justify-end">
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "558841127533-v0gpcqrn1f45ru62rknkm79fk73odoa9.apps.googleusercontent.com"}>
              
              {/* Clean Minimalist Card Wrapper */}
              <div className="w-full max-w-[360px] p-8 bg-[#0c0d12]/40 border border-white/5 rounded-2xl backdrop-blur-2xl flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                
                {/* Glowing Chat Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#0f1115] shadow-[0_4px_20px_rgba(0,0,0,0.5)] yappie-logo-glow mb-6">
                  <MessageCircle className="h-6 w-6 text-cyan-400" />
                </div>

                {/* Card Titles */}
                <div className="mb-8">
                  <h2 className="select-none font-heading text-3xl font-extrabold tracking-tight text-white mb-2">
                    Enter Yappie
                  </h2>
                  <p className="text-sm font-semibold text-slate-400">
                    The anonymous college network.
                  </p>
                  {error && (
                    <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-400">
                      {error}
                    </div>
                  )}
                </div>

                {/* Google Authentication Button */}
                <div className="w-full">
                  <GoogleLoginButton 
                    onSuccess={handleGoogleSuccess} 
                    onError={() => setError("Google Login failed.")} 
                    loading={loading}
                  />
                </div>

              </div>

            </GoogleOAuthProvider>
          </div>

        </main>

        {/* ==================== 3. FEATURES & SEO DETAILS ==================== */}
        <section className="relative z-30 w-full max-w-7xl mx-auto px-5 py-16 sm:px-6 border-t border-white/5 mt-10" aria-label="Yappie Core Features">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-4xl sm:text-5xl font-black tracking-tight text-white mb-4 campus-glow-text">
              The Ultimate Anonymous College Network
            </h2>
            <p className="text-slate-400 text-lg font-medium">
              Yappie is designed specifically for students to share, chat, and connect without judgment or compromises on identity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1: Campus Chat / College Chat */}
            <div className="group relative rounded-2xl border border-white/5 bg-[#0c0d12]/40 p-8 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-3">Campus Chat & College Chat</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Join exclusive rooms scoped entirely to your college. Verify your domain and exchange thoughts, schedule study meets, or gossip with peers in a private <strong>Campus Chat</strong> space.
                </p>
              </div>
            </div>

            {/* Feature 2: Anonymous Confessions */}
            <div className="group relative rounded-2xl border border-white/5 bg-[#0c0d12]/40 p-8 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-3">Anonymous Confessions</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Got a secret you can&apos;t share on public feeds? Post to the <strong>Anonymous Confessions</strong> board for your college. Anonymity is guaranteed by stripping all personal records and IDs from our database.
                </p>
              </div>
            </div>

            {/* Feature 3: Anonymous Chat & Stranger Chat */}
            <div className="group relative rounded-2xl border border-white/5 bg-[#0c0d12]/40 p-8 backdrop-blur-xl transition-all duration-300 hover:border-fuchsia-500/30 hover:shadow-[0_0_30px_rgba(217,70,239,0.1)]">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-3">Anonymous Chat & Stranger Chat</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Start an <strong>Anonymous Chat</strong> session instantly. Connect with a random peer or <strong>Stranger Chat</strong> user to make friends without disclosing your profile or personal details.
                </p>
              </div>
            </div>

          </div>

          {/* Quick FAQ / Detail section for AI Search Engines */}
          <div className="mt-20 border-t border-white/5 pt-16">
            <h2 className="font-heading text-3xl font-bold text-white mb-8 text-center campus-glow-text">
              How Yappie Works for College Students
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto text-left">
              <div>
                <h4 className="font-heading text-lg font-bold text-cyan-300 mb-2">Is Yappie really anonymous?</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Yes. Yappie assigns you a random username (like @user882) upon entry. All database entries are sanitized. Real IDs are stripped from API payloads, meaning inspect elements cannot reveal your true account credentials.
                </p>
              </div>
              <div>
                <h4 className="font-heading text-lg font-bold text-violet-300 mb-2">Can I chat with students from other colleges?</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Yappie offers both global room options for meeting students across different regions (like COEP, MIT-WPU, PICT, etc.) and exclusive private rooms reserved strictly for your campus members.
                </p>
              </div>
              <div>
                <h4 className="font-heading text-lg font-bold text-fuchsia-300 mb-2">Do I need to sign up?</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  To ensure authentic student interactions and deter bots, we require a quick, one-click Google Sign-in. Your email domain is only used to assign you to your correct college page.
                </p>
              </div>
              <div>
                <h4 className="font-heading text-lg font-bold text-emerald-300 mb-2">What is the Anonymous Confessions feed?</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  It is a digital wall for your university. You can read, write, and comment on campus gossip and secrets anonymously. Posts are strictly separated by college so you only see what is relevant to your campus.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== 4. FOOTER ==================== */}
        <footer className="relative z-30 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 border-t border-white/5 text-center sm:flex sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Yappie. All rights reserved. Built anonymously for college students.
          </p>
          <nav className="mt-4 sm:mt-0 flex justify-center gap-6 text-xs text-slate-400 font-semibold" aria-label="Footer Navigation">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/about" className="hover:text-white transition">About</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}

function GoogleLoginButton({
  onSuccess,
  onError,
  loading
}: {
  onSuccess: (accessToken: string) => void;
  onError: () => void;
  loading: boolean;
}) {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => onSuccess(tokenResponse.access_token),
    onError: () => onError()
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={loading}
      className="yappie-minimal-btn"
    >
      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          fill="#EA4335"
        />
      </svg>
      <span>{loading ? "Connecting..." : "Continue with Google"}</span>
    </button>
  );
}
