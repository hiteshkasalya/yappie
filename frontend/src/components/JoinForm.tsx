"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { saveStoredSession } from "@/lib/clientSession";
import type { StoredSession } from "@/types";
import { 
  MessageCircle
} from "lucide-react";


const CAMPUS_WHISPERS = [
  { text: "Anyone down for pizza at the food court? 🍕", category: "Campus Life", time: "Just now" },
  { text: "That physics pop quiz was an absolute nightmare...", category: "Academics", time: "2m ago" },
  { text: "Matched with my hostel neighbor anonymously, this is wild 😂", category: "Crushes", time: "5m ago" },
  { text: "To the person playing electric guitar at 3 AM: please stop.", category: "Hostel", time: "8m ago" },
  { text: "Does anyone have the notes for stats lecture 4?", category: "Academics", time: "12m ago" },
  { text: "Met my current best friend here 3 weeks ago! Absolute vibes.", category: "Matches", time: "15m ago" },
  { text: "Who left a black thermos in room 302?", category: "Lost & Found", time: "20m ago" },
  { text: "Honest review: the library is way too cold today 🥶", category: "Campus Life", time: "25m ago" }
];

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
    <div className="relative min-h-screen w-full isolate flex flex-col justify-between overflow-x-hidden text-slate-100 selection:bg-cyan-400 selection:text-slate-950">
      
      {/* Background Dot Grid Mesh */}
      <div className="radiant-mesh" />
      <div className="ambient-glow" />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col">
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
          
          {/* Left Pitch content & Scrolling whispers */}
          <div className="float-in flex flex-col items-start text-left lg:col-span-6">
            <h1 className="mb-6 font-heading text-5xl font-black leading-[0.98] tracking-tight text-white campus-glow-text sm:text-6xl lg:text-7xl">
              Talk to strangers,<br />
              <span className="campus-gradient-text">Make friends!</span>
            </h1>

            <p className="mb-8 max-w-lg text-base font-bold leading-8 text-slate-200/75 lg:text-lg">
              Unfiltered campus chat. Connect and text chat with other students from your college instantly and anonymously.
            </p>

            {/* Vertical scrolling live whispers preview (Desktop Only) */}
            <div className="hidden lg:block w-full max-w-lg mt-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Live Campus Whispers</span>
              </div>
              
              <div className="yappie-feed-container border border-white/5 bg-[#0d0e15]/40 backdrop-blur-xl">
                <div className="yappie-feed-scroll p-4">
                  {[...CAMPUS_WHISPERS, ...CAMPUS_WHISPERS].map((whisper, idx) => (
                    <div key={idx} className="gossip-card flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-cyan-400/80">
                        <span className="uppercase tracking-wider">#{whisper.category}</span>
                        <span className="text-slate-400/60 font-medium">{whisper.time}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                        {whisper.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Embedded Form Column */}
          <div id="auth-card" className="relative z-20 flex w-full items-center justify-center lg:col-span-6 lg:justify-end">
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "558841127533-v0gpcqrn1f45ru62rknkm79fk73odoa9.apps.googleusercontent.com"}>
              
              <div className="relative w-full max-w-[400px]">
                
                {/* Floating Match Card Preview - Desktop Only */}
                <div className="hidden xl:block absolute -left-28 -bottom-12 w-64 gossip-card transform -rotate-6 z-20 pointer-events-none scale-90 border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Campus Match</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <div className="self-start bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-3 py-1.5 max-w-[85%] text-xs text-slate-300">
                      hey! what major are you?
                    </div>
                    <div className="self-end bg-cyan-500/10 border border-cyan-500/20 rounded-2xl rounded-tr-none px-3 py-1.5 max-w-[85%] text-xs text-cyan-200">
                      CSE sophomore. dying in coding lab right now 💀
                    </div>
                    <div className="self-start bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-3 py-1.5 max-w-[85%] text-xs text-slate-300 font-medium italic">
                      typing...
                    </div>
                  </div>
                </div>

                {/* Floating Stats Card Preview - Desktop Only */}
                <div className="hidden xl:block absolute -right-24 -top-10 w-56 gossip-card transform rotate-6 z-20 pointer-events-none scale-95 border-fuchsia-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matches Today</span>
                    <span className="text-[10px] font-extrabold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-full">LIVE</span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">4,812+</div>
                  <div className="text-[10px] text-slate-400 font-medium">Students matched in the last 24h</div>
                </div>

                {/* Premium Wrapper with Rotating Border */}
                <div className="yappie-premium-card-wrapper">
                  
                  {/* Premium Inner Card */}
                  <div className="yappie-premium-card-inner p-8 sm:p-10 relative overflow-hidden">
                    
                    {/* Decorative Glowing Elements */}
                    <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-500/15 blur-2xl animate-pulse" />
                    <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-fuchsia-500/15 blur-2xl animate-pulse" />

                    {/* Exclusivity Badge */}
                    <div className="flex justify-center mb-6">
                      <div className="inline-flex items-center gap-1.5 rounded-full premium-glow-badge px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 select-none">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
                        </span>
                        Campus Student Network
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="relative mb-8 text-center">
                      <h2 className="mb-3 font-heading text-4xl font-black tracking-tight text-white drop-shadow-md">
                        Enter <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-500">Yappie</span>
                      </h2>
                      <p className="text-sm font-semibold text-slate-300 leading-relaxed max-w-xs mx-auto">
                        The verified anonymous network.<br />Gossip, chat, and make real friends.
                      </p>
                      {error && (
                        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400">
                          {error}
                        </div>
                      )}
                    </div>

                    {/* Google Authentication Button */}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                      <GoogleLoginButton 
                        onSuccess={handleGoogleSuccess} 
                        onError={() => setError("Google Login failed.")} 
                        loading={loading}
                      />
                    </div>

                  </div>
                </div>

              </div>

            </GoogleOAuthProvider>
          </div>

        </main>
      </div>

      {/* Bottom Horizontal Ticker of Gossip (Visible on Desktop & Mobile) */}
      <footer className="relative z-40 w-full border-t border-white/5 bg-[#07080d]/60 py-3.5 backdrop-blur-md overflow-hidden">
        <div className="flex select-none gap-4">
          <div className="animate-marquee flex whitespace-nowrap gap-10 text-xs font-semibold text-slate-400 shrink-0">
            {CAMPUS_WHISPERS.map((w, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <span className="text-cyan-300 font-extrabold uppercase tracking-wider text-[10px]">{w.category}:</span>
                <span className="text-slate-200">&ldquo;{w.text}&rdquo;</span>
              </span>
            ))}
          </div>
          {/* Duplicate for seamless infinite loop */}
          <div className="animate-marquee flex whitespace-nowrap gap-10 text-xs font-semibold text-slate-400 shrink-0" aria-hidden="true">
            {CAMPUS_WHISPERS.map((w, i) => (
              <span key={i + 100} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <span className="text-cyan-300 font-extrabold uppercase tracking-wider text-[10px]">{w.category}:</span>
                <span className="text-slate-200">&ldquo;{w.text}&rdquo;</span>
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// Inner helper component to call useGoogleLogin inside GoogleOAuthProvider context
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
      className="yappie-google-btn"
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
