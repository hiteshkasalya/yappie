"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { saveStoredSession } from "@/lib/clientSession";
import type { StoredSession } from "@/types";
import { 
  MessageCircle,
  ShieldCheck,
  LockKeyhole
} from "lucide-react";


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





  return (
    <div className="relative min-h-screen w-full isolate flex flex-col overflow-x-hidden text-slate-100 selection:bg-cyan-400 selection:text-slate-950">
      
      {/* Background Dot Grid Mesh */}
      <div className="radiant-mesh" />
      <div className="ambient-glow" />

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
            Unfiltered campus chat. Connect or text chat with other MIT-WPU people instantly and anonymously.
          </p>
        </div>

        {/* Right Embedded Form Column */}
        <div id="auth-card" className="relative z-20 flex w-full items-center justify-center lg:col-span-6 lg:justify-end">
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "558841127533-v0gpcqrn1f45ru62rknkm79fk73odoa9.apps.googleusercontent.com"}>
          
          <div className="relative w-full max-w-[420px]">
            {/* Ambient Background Glows */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 blur-2xl opacity-50" />
            
            {/* Main Premium Card */}
            <div className="relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0e15]/80 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all hover:border-white/20">
              
              {/* Inner Decorative Elements */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
              
              {/* Titles */}
              <div className="relative mb-10 text-center">
                <h2 className="mb-3 font-heading text-4xl font-black tracking-tight text-white drop-shadow-md">
                  Join Yappie
                </h2>
                <p className="text-sm font-semibold text-slate-400 leading-relaxed">
                  The exclusive anonymous network.<br />Connect instantly with MIT-WPU peers.
                </p>
                {error && (
                  <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400">
                    {error}
                  </div>
                )}
              </div>

              {/* Google Authentication Button */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      setLoading(true);
                      const res = await fetch("/api/auth/google", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token: credentialResponse.credential })
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
                  }}
                  onError={() => setError("Google Login failed.")}
                  theme="outline"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="320"
                />
              </div>

            </div>
          </div>
          </GoogleOAuthProvider>
        </div>

      </main>
    </div>
  );
}
