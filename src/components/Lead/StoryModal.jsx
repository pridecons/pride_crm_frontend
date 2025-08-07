// components/Lead/StoryModal.jsx
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "./Modal";

const StoryModal = ({ isOpen, onClose, leadId }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/leads/${leadId}/stories`);
      setStories(data || []);
    } catch {
      toast.error("Failed to fetch stories");
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) fetchStories();
    // eslint-disable-next-line
  }, [isOpen, leadId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lead Story"
      contentClassName="w-[35vw] max-w-md"
      actions={[
        <button
          key="close"
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Close
        </button>,
      ]}
    >
      {loading ? (
        <p className="text-gray-600">Loading stories...</p>
      ) : stories.length === 0 ? (
        <p className="text-gray-600">No story available for this lead.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {stories.map((story) => (
            <div key={story.id} className="border-b pb-2">
              <p className="text-sm text-gray-800">{story.msg}</p>
              <p className="text-xs text-gray-500">
                {new Date(story.timestamp).toLocaleString()} by {story.user_id}
              </p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default StoryModal;
