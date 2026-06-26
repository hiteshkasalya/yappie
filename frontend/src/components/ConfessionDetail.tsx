"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Flame,
  MessageSquare,
  Send,
  AlertTriangle
} from "lucide-react";
import { authFetch } from "@/lib/clientSession";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import { trackEvent } from "@/lib/analytics";
import type { Confession, ConfessionComment } from "@/types";
import { OnboardingForm } from "./OnboardingForm";
import { DashboardShell } from "./DashboardShell";
import "@/app/confessions.css";

function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDays}d ago`;
}

export function ConfessionDetail({ confessionId }: { confessionId: string }) {
  const router = useRouter();
  const { session, ready } = useAnonymousSession();

  const [confession, setConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Comment form state
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (ready && !session) {
      router.replace("/");
      return;
    }

    async function loadConfession() {
      try {
        const res = await authFetch(`/api/confessions/${confessionId}`);
        if (res.ok) {
          const data = await res.json() as { confession: Confession };
          setConfession(data.confession);
        } else {
          setError("Confession not found.");
        }
      } catch (err) {
        console.error("Failed to load confession:", err);
        setError("Error loading confession.");
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      void loadConfession();
    }
  }, [ready, session, confessionId, router]);

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || commenting || !confession) return;

    const tempCommentId = `temp-comment-${Date.now()}`;
    const optimisticComment: ConfessionComment = {
      id: tempCommentId,
      senderId: session?.user?.id || "temp-sender",
      anonymousUsername: session?.user?.anonymousUsername || "anonymous",
      message: text,
      timestamp: new Date().toISOString()
    };

    // Optimistically clear input and add comment
    setCommentText("");
    setCommenting(true);
    setConfession(current => {
      if (!current) return null;
      return {
        ...current,
        comments: [...(current.comments || []), optimisticComment]
      };
    });

    try {
      const res = await authFetch(`/api/confessions/${confessionId}/comments`, {
        method: "POST",
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setConfession(current => {
          if (!current) return null;
          const cleanedComments = (current.comments || []).map(comm =>
            comm.id === tempCommentId ? data.comment : comm
          );
          return {
            ...current,
            comments: cleanedComments
          };
        });
        trackEvent("confession_replied", { confession_id: confessionId, college: session?.user?.college || "Other" });
      } else {
        // Rollback
        setConfession(current => {
          if (!current) return null;
          return {
            ...current,
            comments: (current.comments || []).filter(comm => comm.id !== tempCommentId)
          };
        });
        setCommentText(text);
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
      // Rollback
      setConfession(current => {
        if (!current) return null;
        return {
          ...current,
          comments: (current.comments || []).filter(comm => comm.id !== tempCommentId)
        };
      });
      setCommentText(text);
    } finally {
      setCommenting(false);
    }
  };

  const handleReportConfession = async () => {
    if (!confession) return;
    const confirm = window.confirm("Report this confession for review?");
    if (!confirm) return;

    try {
      const res = await authFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          reportedUserId: confession.senderId,
          reason: `Reported Confession: "${confession.message.slice(0, 100)}..."`
        })
      });
      if (res.ok) {
        alert("Thank you. The confession has been reported for review.");
        trackEvent("report_user", { reported_user_id: confession.senderId, context: "confession" });
      } else {
        alert("Failed to report confession.");
      }
    } catch {
      alert("Error submitting report.");
    }
  };

  if (!ready || !session) return <div className="yappie-app yappie-loading" />;
  if (session.user.age === undefined || session.user.college === undefined) {
    return <OnboardingForm />;
  }

  const collegeDisplay = session.user.college === "Other" ? "Global Stream" : session.user.college;

  return (
    <DashboardShell>
      <div className="conf-feed-root">
        <div className="conf-feed-inner">
          
          {/* Header */}
          <header className="conf-header">
            <button onClick={() => router.back()} className="yappie-icon-btn" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="conf-title-wrap">
              <h1 className="conf-title">Confession Thread</h1>
              <span className="conf-subtitle">{collegeDisplay}</span>
            </div>
          </header>

          {loading ? (
            <div className="conf-loading">
              <div className="conf-spinner" />
              <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-500">Retrieving thread...</p>
            </div>
          ) : error || !confession ? (
            <div className="conf-empty">
              {error || "Confession not found."}
            </div>
          ) : (
            <div className="conf-feed-list">
              <article className="conf-item-card float-in">
                
                {/* Author & Meta */}
                <div className="conf-item-header">
                  <div className="conf-item-author-wrap">
                    <span className="conf-item-author">@{confession.anonymousUsername.toLowerCase()}</span>
                    <span className="conf-item-college-tag">
                      {confession.college === "Other" ? "Global" : confession.college}
                    </span>
                  </div>
                  <span className="conf-item-time">{timeAgo(confession.timestamp)}</span>
                </div>

                {/* Message */}
                <p className="conf-item-message" style={{ fontSize: "1.05rem", lineHeight: 1.6 }}>{confession.message}</p>

                {/* Footer buttons */}
                <div className="conf-item-footer">
                  <div className="conf-footer-btn" style={{ cursor: "default" }}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Comments ({confession.comments?.length || 0})</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleReportConfession}
                    className="conf-footer-btn hover:text-rose-400"
                    title="Report this post"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Report</span>
                  </button>
                </div>

                {/* Reddit-style comments section (Always expanded on detail page) */}
                <div className="conf-comments-section" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", marginTop: "1.5rem", paddingTop: "1.5rem" }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">Discussion</h3>
                  
                  {confession.comments && confession.comments.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {confession.comments.map((comment) => (
                        <div key={comment.id} className="conf-comment-row" style={{ borderLeft: "2px solid rgba(255, 255, 255, 0.12)", paddingLeft: "1rem" }}>
                          <div className="conf-comment-meta">
                            <span className="conf-comment-author">@{comment.anonymousUsername.toLowerCase()}</span>
                            <span className="conf-comment-time">{timeAgo(comment.timestamp)}</span>
                          </div>
                          <p className="conf-comment-text" style={{ fontSize: "0.875rem", color: "#e2e8f0" }}>{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-600 pl-2 py-4">No comments yet. Write the first response!</p>
                  )}

                  {/* Add Comment Form */}
                  <form
                    onSubmit={handleAddComment}
                    className="conf-comment-form"
                    style={{ marginTop: "2rem", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      maxLength={700}
                      required
                      className="conf-comment-input"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || commenting}
                      className="conf-comment-submit"
                      title="Post reply"
                    >
                      <Send className="h-3 w-3 stroke-[2.5]" />
                    </button>
                  </form>
                </div>

              </article>
            </div>
          )}

        </div>
      </div>
    </DashboardShell>
  );
}
