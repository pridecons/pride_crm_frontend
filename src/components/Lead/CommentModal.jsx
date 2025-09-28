"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "./ID/Modal";
import { MessageCircle, SendHorizonal } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";

const CommentModal = ({ isOpen, onClose, leadId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/leads/${leadId}/comments`);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to load comments" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    const value = newComment.trim();
    if (!value) {
      ErrorHandling({ defaultError: "Comment cannot be empty" });
      return;
    }
    try {
      setAdding(true);
      await axiosInstance.post(`/leads/${leadId}/comments`, null, {
        params: { comment: value },
      });
      setNewComment("");
      toast.success("Comment added");
      fetchComments();
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to add comment" });
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) fetchComments();
    // eslint-disable-next-line
  }, [isOpen, leadId]);

  // Cmd/Ctrl + Enter to submit
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (e.key === "Enter" && isCmdOrCtrl) {
        e.preventDefault();
        handleAddComment();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [isOpen, newComment]);

  // Button inline styles using theme tokens
  const secondaryBtnBase = {
    background: "var(--theme-components-button-secondary-bg)",
    color: "var(--theme-components-button-secondary-text)",
    border: "1px solid var(--theme-components-button-secondary-border)",
    boxShadow:
      "0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)",
  };

  const primaryBtnBase = {
    background: "var(--theme-components-button-primary-bg)",
    color: "var(--theme-components-button-primary-text)",
    border: "1px solid var(--theme-components-button-primary-border, transparent)",
    boxShadow:
      "0 6px 16px -6px var(--theme-components-button-primary-shadow)",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      contentClassName="w-[42rem] max-w-2xl"
      actions={[
        <button
          key="cancel"
          onClick={onClose}
          className="px-4 py-2 rounded-xl transition-colors"
          style={secondaryBtnBase}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              "var(--theme-components-button-secondary-hoverBg)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background =
              "var(--theme-components-button-secondary-bg)")
          }
        >
          Close
        </button>,
        <button
          key="add"
          onClick={handleAddComment}
          disabled={!newComment.trim() || adding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl disabled:opacity-50 transition-colors"
          style={primaryBtnBase}
          onMouseEnter={(e) => {
            if (!(!newComment.trim() || adding)) {
              e.currentTarget.style.background =
                "var(--theme-components-button-primary-hoverBg)";
            }
          }}
          onMouseLeave={(e) => {
            if (!(!newComment.trim() || adding)) {
              e.currentTarget.style.background =
                "var(--theme-components-button-primary-bg)";
            }
          }}
        >
          <SendHorizonal size={16} />
          {adding ? "Adding..." : "Add Comment"}
        </button>,
      ]}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--theme-components-card-bg)",
          color: "var(--theme-components-card-text)",
          // border: "1px solid var(--theme-components-card-border)",
          boxShadow: "0 8px 24px -12px var(--theme-components-card-shadow)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{
            // Prefer component headerBg; fallback to a gradient from primary→primaryHover
            background:
              "var(--theme-components-modal-headerBg, linear-gradient(90deg, var(--theme-primary), var(--theme-primaryHover)))",
            color: "var(--theme-components-modal-headerText, #fff)",
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in oklab, #fff 15%, transparent)" }}
            >
              <MessageCircle size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-5">Lead Comments</h3>
              <p
                className="text-xs/5"
                style={{ color: "color-mix(in oklab, currentColor 80%, transparent)" }}
              >
                Discuss activity & context with your team
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4" style={{ background: "var(--theme-cardBackground)" }}>
          <div className="max-h-72 overflow-y-auto space-y-3">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-5 rounded animate-pulse"
                  style={{ background: "color-mix(in oklab, var(--theme-border) 60%, transparent)" }}
                />
              ))
            ) : comments.length > 0 ? (
              comments.map((c) => {
                const isMe = c.user_id === "You";
                const bubbleStyle = isMe
                  ? {
                      background: "var(--theme-components-tag-info-bg)",
                      color: "var(--theme-components-tag-info-text)",
                      border: "1px solid var(--theme-components-tag-info-border)",
                    }
                  : {
                      background: "var(--theme-components-tag-neutral-bg)",
                      color: "var(--theme-components-tag-neutral-text)",
                      border: "1px solid var(--theme-components-tag-neutral-border)",
                    };
                const metaColor = "var(--theme-textSecondary)";
                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl"
                    style={bubbleStyle}
                  >
                    <p className="text-sm">{c.comment}</p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: metaColor }}
                    >
                      {new Date(c.timestamp).toLocaleString()} • {c.user_id}
                    </p>
                  </div>
                );
              })
            ) : (
              <p style={{ color: "var(--theme-textSecondary)" }}>No comments yet.</p>
            )}
          </div>

          {/* Input */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--theme-text)" }}
            >
              Add a comment
            </label>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your comment… (Cmd/Ctrl + Enter to submit)"
              className="w-full rounded-xl text-sm outline-none"
              style={{
                background: "var(--theme-components-input-bg)",
                color: "var(--theme-components-input-text)",
                border: "1px solid var(--theme-components-input-border)",
                padding: "0.5rem 0.75rem",
                "::placeholder": {
                  color: "var(--theme-components-input-placeholder)",
                },
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px color-mix(in oklab, var(--theme-components-input-focus) 30%, transparent)";
                e.currentTarget.style.borderColor =
                  "var(--theme-components-input-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor =
                  "var(--theme-components-input-border)";
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CommentModal;
