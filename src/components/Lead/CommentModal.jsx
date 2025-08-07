// components/Lead/CommentModal.jsx
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "./Modal";

const CommentModal = ({ isOpen, onClose, leadId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/leads/${leadId}/comments`);
      setComments(data || []);
    } catch (err) {
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    try {
      await axiosInstance.post(`/leads/${leadId}/comments`, null, {
        params: { comment: newComment },
      });
      toast.success("Comment added");
      setNewComment("");
      fetchComments();
    } catch {
      toast.error("Failed to add comment");
    }
  };

  useEffect(() => {
    if (isOpen && leadId) fetchComments();
    // eslint-disable-next-line
  }, [isOpen, leadId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lead Comments"
    >
      {loading ? (
        <p className="text-gray-500">Loading comments...</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {comments.length > 0 && Array.isArray(comments) ? comments.map((c) => (
            <div
              key={c.id}
              className={`p-3 rounded-lg ${c.user_id === "You" ? "bg-blue-100" : "bg-gray-100"}`}
            >
              <p className="text-sm">{c.comment}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(c.timestamp).toLocaleString()} • {c.user_id}
              </p>
            </div>
          )) : <p className="text-gray-500">No comments yet.</p>}
        </div>
      )}

      {/* Input */}
      <div className="flex mt-4 gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button
          onClick={handleAddComment}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Add
        </button>
      </div>
    </Modal>
  );
};

export default CommentModal;
