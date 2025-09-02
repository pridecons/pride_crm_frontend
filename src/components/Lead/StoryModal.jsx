"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "./ID/Modal";
import { BookOpenText, Clock } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";

const StoryModal = ({ isOpen, onClose, leadId }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/leads/${leadId}/stories`);
      setStories(Array.isArray(data) ? data : []);
    } catch(error) {
      ErrorHandling({ error: error, defaultError: "Failed to fetch stories" });
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
      title=""
      contentClassName="w-[42rem] max-w-2xl"
      actions={[
        <button
          key="close"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>,
      ]}
    >
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <BookOpenText size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-5">Lead Story</h3>
              <p className="text-xs/5 text-white/80">Timeline of updates & notes</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 bg-white">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-5 bg-gray-200 rounded" />
              ))}
            </div>
          ) : stories.length === 0 ? (
            <p className="text-gray-600">No story available for this lead.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto pl-4">
              <ol className="relative border-s border-gray-200">
                {stories.map((s) => (
                  <li key={s.id} className="ms-4 py-3">
                    <span className="absolute -start-1.5 inline-flex h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white" />
                    <p className="text-sm text-gray-800">{s.msg}</p>
                    <p className="mt-1 text-xs text-gray-500 inline-flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(s.timestamp).toLocaleString()} • {s.user_id}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StoryModal;