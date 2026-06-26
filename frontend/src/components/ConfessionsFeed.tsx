"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Flame,
  Globe,
  GraduationCap,
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

export function ConfessionsFeed() {
  const router = useRouter();
  const { session, ready } = useAnonymousSession();

  const [confessions, setConfessions] = useState<Confession[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("yappie_confessions_list");
        if (cached) {
          return JSON.parse(cached) as Confession[];
        }
      } catch (e) {
        console.error("Failed to load confessions from cache", e);
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("yappie_confessions_list");
        if (cached) return false;
      } catch {}
    }
    return true;
  });
  
  // Post form state
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  // Comment states indexed by confessionId
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentingId, setCommentingId] = useState<string | null>(null);

  const loadConfessions = useCallback(async () => {
    if (!session) return;
    const cached = sessionStorage.getItem("yappie_confessions_list");
    if (!cached) {
      setLoading(true);
    }
    try {
      const res = await authFetch("/api/confessions");
      if (res.ok) {
        const data = await res.json() as { confessions: Confession[] };
        const confessionsList = data.confessions ?? [];
        setConfessions(confessionsList);
        sessionStorage.setItem("yappie_confessions_list", JSON.stringify(confessionsList));
      }
    } catch (err) {
      console.error("Failed to load confessions:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (ready && !session) {
      router.replace("/");
      return;
    }
    if (session) {
      void loadConfessions();
    }
  }, [ready, session, router, loadConfessions]);

  const handlePostConfession = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || posting) return;

    setPosting(true);
    setPostError("");

    try {
      const res = await authFetch("/api/confessions", {
        method: "POST",
        body: JSON.stringify({ message: message.trim() })
      });
      const data = await res.json();
      if (res.ok && data.confession) {
        setMessage("");
        // Prepend new confession to feed instantly and update cache
        setConfessions(current => {
          const updated = [data.confession, ...current];
          sessionStorage.setItem("yappie_confessions_list", JSON.stringify(updated));
          return updated;
        });
        trackEvent("confession_posted", { college: session?.user?.college || "Other" });
      } else {
        setPostError(data.error || "Failed to post confession.");
      }
    } catch (err) {
      setPostError("Network error. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const handleAddComment = async (e: FormEvent, confessionId: string) => {
    e.preventDefault();
    const commentText = commentInputs[confessionId]?.trim();
    if (!commentText || commentingId) return;

    setCommentingId(confessionId);

    try {
      const res = await authFetch(`/api/confessions/${confessionId}/comments`, {
        method: "POST",
        body: JSON.stringify({ message: commentText })
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        // Clear comment input
        setCommentInputs(prev => ({ ...prev, [confessionId]: "" }));
        // Update confessions state with the new comment and update cache
        setConfessions(current => {
          const updated = current.map(c => {
            if (c._id === confessionId) {
              return {
                ...c,
                comments: [...c.comments, data.comment]
              };
            }
            return c;
          });
          sessionStorage.setItem("yappie_confessions_list", JSON.stringify(updated));
          return updated;
        });
        trackEvent("confession_comment_posted", { confession_id: confessionId });
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setCommentingId(null);
    }
  };

  const handleReportConfession = async (confession: Confession) => {
    const confirm = window.confirm("Report this confession for review?");
    if (!confirm) return;

    try {
      const res = await authFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          reportedUserId: confession.senderId, // backend will check this
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

  const toggleComments = (confessionId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [confessionId]: !prev[confessionId]
    }));
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
            <Link href="/" className="yappie-icon-btn" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="conf-title-wrap">
              <h1 className="conf-title">Confessions</h1>
              <span className="conf-subtitle">{collegeDisplay}</span>
            </div>
          </header>

          {/* Write Confession Area */}
          <form onSubmit={handlePostConfession} className="conf-form-card">
            <textarea
              className="conf-textarea"
              placeholder={`Confess something anonymously to ${collegeDisplay} students...`}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={1000}
              required
            />
            {postError && <p className="text-xs font-semibold text-rose-500 mb-2">{postError}</p>}
            <div className="conf-form-footer">
              <span className="conf-char-counter">{message.length}/1000</span>
              <div className="conf-scope-selector-wrap">
                <button
                  type="submit"
                  disabled={posting || !message.trim()}
                  className="conf-post-btn"
                >
                  {posting ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-[#07080a]/20 border-t-[#07080a]" />
                  ) : (
                    <>
                      <span>Confess</span>
                      <Flame className="h-3.5 w-3.5 fill-[#07080a]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Feed Stream */}
          {loading ? (
            <div className="conf-loading">
              <div className="conf-spinner" />
              <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-500">Retrieving secrets...</p>
            </div>
          ) : confessions.length === 0 ? (
            <div className="conf-empty">
              No confessions in this stream yet. Be the first to share one!
            </div>
          ) : (
            <div className="conf-feed-list">
              {confessions.map((confession) => {
                const isExpanded = !!expandedComments[confession._id];
                const commentCount = confession.comments?.length || 0;
                
                return (
                  <article key={confession._id} className="conf-item-card float-in">
                    
                    {/* Confession Card Header */}
                    <div className="conf-item-header">
                      <div className="conf-item-author-wrap">
                        <span className="conf-item-author">@{confession.anonymousUsername.toLowerCase()}</span>
                        <span className="conf-item-college-tag">
                          {confession.college === "Other" ? "Global" : confession.college}
                        </span>
                      </div>
                      <span className="conf-item-time">{timeAgo(confession.timestamp)}</span>
                    </div>

                    {/* Content */}
                    <p className="conf-item-message">{confession.message}</p>

                    {/* Confession Card Footer */}
                    <div className="conf-item-footer">
                      <button
                        type="button"
                        onClick={() => toggleComments(confession._id)}
                        className="conf-footer-btn"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Comments ({commentCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReportConfession(confession)}
                        className="conf-footer-btn hover:text-rose-400"
                        title="Report this post"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Report</span>
                      </button>
                    </div>

                    {/* Comments Drawer (Collapsible) */}
                    {isExpanded && (
                      <div className="conf-comments-section">
                        {commentCount > 0 ? (
                          confession.comments.map((comment) => (
                            <div key={comment.id} className="conf-comment-row">
                              <div className="conf-comment-meta">
                                <span className="conf-comment-author">@{comment.anonymousUsername.toLowerCase()}</span>
                                <span className="conf-comment-time">{timeAgo(comment.timestamp)}</span>
                              </div>
                              <p className="conf-comment-text">{comment.message}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-600 pl-2">No comments yet. Write one below!</p>
                        )}

                        {/* Add Comment Input Form */}
                        <form
                          onSubmit={(e) => handleAddComment(e, confession._id)}
                          className="conf-comment-form"
                        >
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={commentInputs[confession._id] || ""}
                            onChange={(e) =>
                              setCommentInputs(prev => ({ ...prev, [confession._id]: e.target.value }))
                            }
                            maxLength={700}
                            required
                            className="conf-comment-input"
                          />
                          <button
                            type="submit"
                            disabled={!commentInputs[confession._id]?.trim() || commentingId === confession._id}
                            className="conf-comment-submit"
                            title="Post reply"
                          >
                            <Send className="h-3 w-3 stroke-[2.5]" />
                          </button>
                        </form>
                      </div>
                    )}

                  </article>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </DashboardShell>
  );
}
