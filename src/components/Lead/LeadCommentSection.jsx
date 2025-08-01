"use client";

import { useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { toast } from "react-hot-toast";

export default function LeadCommentSection({ leadId, tempComment, onCommentChange, onSave, savedComment }) {
    const [showComments, setShowComments] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!fetched) {
            setLoading(true);
            try {
                const { data } = await axiosInstance.get(`/leads/${leadId}/comments`);
                setComments(data || []);
                setFetched(true);
                setShowComments(true);
            } catch (err) {
                console.error("Error fetching comments:", err);
                toast.error("Failed to load comments");
            } finally {
                setLoading(false);
            }
        } else {
            setShowComments(!showComments);
        }
    };

    return (
        <div className="flex flex-col items-start gap-1">
            {/* Toggle Button */}
            <button
                onClick={handleToggle}
                className="text-blue-600 hover:underline text-xs"
            >
                {showComments ? "Hide" : "View"}
            </button>

            {/* Comment List */}
            {showComments && (
                <div className="bg-gray-50 border rounded p-2 text-xs max-h-32 overflow-y-auto w-full space-y-1">
                    {loading ? (
                        <div className="text-gray-500 italic">Loading...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-gray-500 italic">No comments found</div>
                    ) : (
                        comments.map((c) => (
                            <div key={c.id} className="text-gray-800">
                                <span className="font-semibold">{c.user_id}:</span> {c.comment}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add New Comment */}
            <div className="flex gap-1 items-center w-full">
                <input
                    type="text"
                    placeholder="Add comment"
                    className="px-2 py-1 border border-gray-300 rounded text-xs w-full"
                    value={tempComment}
                    onChange={(e) => onCommentChange(e.target.value)}
                />
                <button
                    onClick={onSave}
                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                    Save
                </button>
            </div>
        </div>

    );
}
