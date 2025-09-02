"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "./ID/Modal";
import { MessageCircle, SendHorizonal } from "lucide-react";

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
    } catch(error) {
      ErrorHandling({ error: error, defaultError: "Failed to add comment" });
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) fetchComments();
    // eslint-disable-next-line
  }, [isOpen, leadId]);

  // submit on Enter
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Enter" && e.metaKey) {
        e.preventDefault();
        handleAddComment();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, newComment]); // eslint-disable-line

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
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>,
        <button
          key="add"
          onClick={handleAddComment}
          disabled={!newComment.trim() || adding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <SendHorizonal size={16} />
          {adding ? "Adding..." : "Add Comment"}
        </button>,
      ]}
    >
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <MessageCircle size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-5">Lead Comments</h3>
              <p className="text-xs/5 text-white/80">Discuss activity & context with your team</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 bg-white">
          <div className="max-h-72 overflow-y-auto space-y-3">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-5 bg-gray-200 rounded" />
              ))
            ) : comments.length > 0 ? (
              comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl border ${
                    c.user_id === "You" ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <p className="text-sm text-gray-800">{c.comment}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(c.timestamp).toLocaleString()} • {c.user_id}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No comments yet.</p>
            )}
          </div>

          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Add a comment</label>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your comment… (Cmd/Ctrl + Enter to submit)"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CommentModal;