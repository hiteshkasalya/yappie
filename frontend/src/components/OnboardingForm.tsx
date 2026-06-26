"use client";

import { FormEvent, useState } from "react";
import { authFetch, getStoredSession, saveStoredSession, clearStoredSession } from "@/lib/clientSession";
import { ArrowRight, ChevronDown, Calendar, GraduationCap, ShieldCheck, MessageCircle } from "lucide-react";
import { DashboardShell } from "./DashboardShell";
import { trackEvent } from "@/lib/analytics";
import { CollegeSelectorModal, COLLEGES } from "./CollegeSelectorModal";

export function OnboardingForm() {
  const [age, setAge] = useState("");
  const [college, setCollege] = useState("MIT WPU");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleOnboardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 17 || ageNum > 80) {
      setError("Please enter a valid age between 17 and 80.");
      setLoading(false);
      return;
    }

    try {
      const response = await authFetch("/api/auth/onboard", {
        method: "POST",
        body: JSON.stringify({ age: ageNum, college }),
      });

      const data = await response.json().catch(() => null);
      setLoading(false);

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredSession();
          window.location.href = "/";
          return;
        }
        setError(data?.error || "Failed to update profile.");
        return;
      }

      const session = getStoredSession();
      if (session && data.user) {
        session.user = data.user;
        saveStoredSession(session);
      }

      trackEvent("sign_up", { method: "Google" });
      trackEvent("profile_completed", { age: ageNum, college });

      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setError("Unable to connect. Please try again.");
      setLoading(false);
    }
  }

  const selectedCollege = COLLEGES.find((c) => c.id === college);

  return (
    <DashboardShell>
      <header className="yappie-header">
        <div className="yappie-header-inner">
          <div className="yappie-brand">
            <div className="yappie-brand-mark">
              <MessageCircle className="h-[18px] w-[18px] text-[#0C0C0E]" />
            </div>
            <span className="yappie-brand-name">
              yappie
            </span>
          </div>
        </div>
      </header>

      <div className="yappie-onboard">
        <div className="yappie-onboard-panel">
          <div className="yappie-onboard-header">
            <p className="yappie-auth-eyebrow">One last step</p>
            <h2 className="yappie-auth-title">Profile details</h2>
            <p className="yappie-auth-desc">
              Set your age and campus so we can match you with the right stream.
            </p>
          </div>

          <form onSubmit={handleOnboardSubmit} className="yappie-auth-form">
            <div className="yappie-field">
              <label className="yappie-field-label" htmlFor="onboard-age">
                Your age
              </label>
              <div className="yappie-input-wrap">
                <Calendar className="yappie-input-icon h-4 w-4" />
                <input
                  id="onboard-age"
                  required
                  type="number"
                  min={17}
                  max={80}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="yappie-input"
                  placeholder="Enter your age"
                />
              </div>
            </div>

            <div className="yappie-field">
              <label className="yappie-field-label">College / university</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(true)}
                  className="yappie-select-trigger"
                >
                  <div className="yappie-select-trigger-inner">
                    <GraduationCap className="h-4 w-4 shrink-0 text-[var(--text-3)]" />
                    <span className="font-sans font-extrabold text-[13px] text-white tracking-normal leading-normal">
                      {selectedCollege?.name}
                    </span>
                  </div>
                  <ChevronDown className="h-4.5 w-4.5 shrink-0 text-[var(--text-3)]" />
                </button>

                <CollegeSelectorModal
                  isOpen={dropdownOpen}
                  onClose={() => setDropdownOpen(false)}
                  selectedValue={college}
                  onChange={(val) => setCollege(val)}
                />
              </div>
            </div>

            {error && <div className="yappie-auth-error">{error}</div>}

            <button disabled={loading} type="submit" className="yappie-auth-submit">
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg)]/20 border-t-[var(--bg)]" />
                  Connecting...
                </>
              ) : (
                <>
                  Enter campus stream
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="yappie-auth-footer">
            <ShieldCheck className="h-3.5 w-3.5" />
            Identity strictly anonymized
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
