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

  // Themed button styles
  const secondaryBtnBase = {
    background: "var(--theme-components-button-secondary-bg)",
    color: "var(--theme-components-button-secondary-text)",
    border: "1px solid var(--theme-components-button-secondary-border)",
    boxShadow:
      "0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)",
  };

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
        </div>

        {/* Body */}
        <div
          className="p-5"
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
            <div className="max-h-96 overflow-y-auto pl-4">
              <ol
                className="relative"
                style={{ borderLeft: "1px solid var(--theme-border)" }}
              >
                {stories.map((s) => (
                  <li key={s.id} className="ms-4 py-3 relative">
                    <span
                      className="absolute -start-1.5 inline-flex h-3 w-3 rounded-full"
                      style={{
                        background: "var(--theme-primary)",
                        boxShadow:
                          "0 0 0 4px var(--theme-cardBackground)", // ring effect
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
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StoryModal;
