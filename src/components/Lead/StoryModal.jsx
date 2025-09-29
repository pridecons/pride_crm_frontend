"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "./ID/Modal";
import { BookOpenText, Clock, X } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";

const StoryModal = ({ isOpen, onClose, leadId }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/leads/${leadId}/stories`);
      setStories(Array.isArray(data) ? data : []);
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to fetch stories" });
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
      title=""                      // keep Modal header empty
      actions={[]}                  // remove footer actions
      /* Single internal scroll area only */
      contentClassName="w-[42rem] max-w-2xl p-0 overflow-hidden"
    >
      {/* Card Shell */}
      <div
        className="rounded-2xl flex flex-col"
        style={{
          background: "var(--theme-components-card-bg)",
          color: "var(--theme-components-card-text)",
          boxShadow: "0 8px 24px -12px var(--theme-components-card-shadow)",
          maxHeight: "75vh",           // limits total height
        }}
      >
        {/* Header with CLOSE at top-right */}
        <div
          className="px-5 py-4 relative"
          style={{
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
              <BookOpenText size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-5">Lead Story</h3>
              <p
                className="text-xs/5"
                style={{ color: "color-mix(in oklab, currentColor 80%, transparent)" }}
              >
                Timeline of updates &amp; notes
              </p>
            </div>
          </div>

          {/* Close (moved from footer) */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors"
            style={{
              background: "var(--theme-components-button-secondary-bg)",
              color: "var(--theme-components-button-secondary-text)",
              border: "1px solid var(--theme-components-button-secondary-border)",
              boxShadow:
                "0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "var(--theme-components-button-secondary-hoverBg)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                "var(--theme-components-button-secondary-bg)")
            }
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: single scroll region */}
        <div
          className="p-5 flex-1 overflow-y-auto"
          style={{ background: "var(--theme-cardBackground)" }}
        >
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-5 rounded animate-pulse"
                  style={{
                    background:
                      "color-mix(in oklab, var(--theme-border) 60%, transparent)",
                  }}
                />
              ))}
            </div>
          ) : stories.length === 0 ? (
            <p style={{ color: "var(--theme-textSecondary)" }}>
              No story available for this lead.
            </p>
          ) : (
            <ol
              className="relative pl-6"
              style={{ borderLeft: "1px solid var(--theme-border)" }}
            >
              {stories.map((s) => (
                <li key={s.id} className="ms-4 py-3 relative pl-4">
                  <span
                    className="absolute -start-1.5 inline-flex h-3 w-3 rounded-full"
                    style={{
                      background: "var(--theme-primary)",
                      boxShadow: "0 0 0 4px var(--theme-cardBackground)",
                    }}
                  />
                  <p className="text-sm" style={{ color: "var(--theme-text)" }}>
                    {s.msg}
                  </p>
                  <p
                    className="mt-1 text-xs inline-flex items-center gap-1"
                    style={{ color: "var(--theme-textSecondary)" }}
                  >
                    <Clock size={12} />
                    {new Date(s.timestamp).toLocaleString()} • {s.user_id}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StoryModal;
