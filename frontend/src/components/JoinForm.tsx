"use client";

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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden bg-[#07080a] text-slate-100 selection:bg-cyan-400 selection:text-slate-950">
      
      {/* High-Precision Grid Background */}
      <div className="yappie-grid-bg" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[360px] px-6 py-12 flex flex-col items-center">
        
        {/* Glowing Chat Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#0f1115] shadow-[0_4px_20px_rgba(0,0,0,0.5)] yappie-logo-glow mb-6">
          <MessageCircle className="h-6 w-6 text-cyan-400" />
        </div>

        {/* Brand & Titles */}
        <div className="text-center mb-8">
          <h1 className="select-none font-heading text-4xl font-extrabold tracking-tight text-white mb-2">
            Enter Yappie
          </h1>
          <p className="text-sm font-medium text-slate-400">
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
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "558841127533-v0gpcqrn1f45ru62rknkm79fk73odoa9.apps.googleusercontent.com"}>
            <GoogleLoginButton 
              onSuccess={handleGoogleSuccess} 
              onError={() => setError("Google Login failed.")} 
              loading={loading}
            />
          </GoogleOAuthProvider>
        </div>

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
