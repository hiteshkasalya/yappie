"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { saveStoredSession } from "@/lib/clientSession";
import { MessageCircle } from "lucide-react";

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
