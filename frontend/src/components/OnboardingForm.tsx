"use client";

import { FormEvent, useState } from "react";
import { authFetch, getStoredSession, saveStoredSession, clearStoredSession } from "@/lib/clientSession";
import { DashboardShell } from "./DashboardShell";
import { trackEvent } from "@/lib/analytics";
import { CollegeSelectorModal, COLLEGES } from "./CollegeSelectorModal";
import { ChevronDown } from "lucide-react";

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
      setError("Enter a valid age between 17 and 80.");
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

      if (typeof window !== "undefined" && !localStorage.getItem("yappie_signup_tracked")) {
        trackEvent("sign_up", { method: "Google", college });
        localStorage.setItem("yappie_signup_tracked", "true");
      }

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
      <div className="ob2-root">
        <div className="ob2-center">
          {/* Logo */}
          <div className="ob2-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>yappie</span>
          </div>

          {/* Card */}
          <div className="ob2-card">
            <div className="ob2-heading">
              <h1 className="ob2-title">One quick step</h1>
              <p className="ob2-sub">So we can put you in the right campus stream.</p>
            </div>

            <form onSubmit={handleOnboardSubmit} className="ob2-form">
              <div className="ob2-field">
                <label className="ob2-label" htmlFor="ob-age">Age</label>
                <input
                  id="ob-age"
                  required
                  type="number"
                  min={17}
                  max={80}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="ob2-input"
                  placeholder="20"
                  autoComplete="off"
                />
              </div>

              <div className="ob2-field">
                <label className="ob2-label">College</label>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(true)}
                  className="ob2-select"
                >
                  <span>{selectedCollege?.name ?? "Select college"}</span>
                  <ChevronDown className="ob2-chevron" />
                </button>
                <CollegeSelectorModal
                  isOpen={dropdownOpen}
                  onClose={() => setDropdownOpen(false)}
                  selectedValue={college}
                  onChange={(val) => setCollege(val)}
                />
              </div>

              {error && <p className="ob2-error">{error}</p>}

              <button disabled={loading} type="submit" className="ob2-btn">
                {loading ? <span className="ob2-spin" /> : "Continue"}
              </button>
            </form>

            <p className="ob2-hint">Your real identity is never stored or shared.</p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
