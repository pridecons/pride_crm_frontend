"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePermissions } from "@/context/PermissionsContext";
import { axiosInstance } from "@/api/Axios";
import { useTheme } from "@/context/ThemeContext";

const DownloadPDF = ({ id, userId }) => {
  const { hasPermission } = usePermissions();
  const { themeConfig } = useTheme();

  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const revokeUrl = useCallback(() => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  }, [pdfUrl]);

  useEffect(() => {
    return () => revokeUrl(); // cleanup on unmount
  }, [revokeUrl]);

  const fetchPdf = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/recommendations/${id}/pdf`, {
        responseType: "blob",
        params: { userId },
        headers: { "Cache-Control": "no-cache" },
      });

      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setPdfUrl(url);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching PDF:", error);
      // optional: toast or themed alert
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    revokeUrl();
    setPdfUrl(null);
  };

  // close on Esc
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  return (
    <div className="p-0">
      <button
        onClick={fetchPdf}
        className="text-sm underline-offset-2"
        style={{ color: "var(--theme-primary)" }}
      >
        {loading ? "Loading..." : "View"}
      </button>

      {isModalOpen && pdfUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          style={{ background: "var(--theme-backdrop)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal(); // click outside to close
          }}
        >
          <div
            className="relative w-[90%] max-w-4xl rounded-2xl overflow-hidden border"
            style={{
              background: "var(--theme-card-bg)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-text)",
              boxShadow: `0 10px 25px ${themeConfig.shadow}`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <h2 className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
                PDF Preview
              </h2>
              <button
                onClick={closeModal}
                className="text-2xl leading-none"
                style={{ color: "var(--theme-text-muted)" }}
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Preview */}
            <div className="p-4">
              <iframe
                src={pdfUrl}
                width="100%"
                height="420px"
                title="PDF preview"
                className="rounded"
                style={{
                  border: `1px solid var(--theme-border)`,
                  background: "var(--theme-surface)",
                }}
              />
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 border-t flex justify-end gap-3"
              style={{ borderColor: "var(--theme-border)" }}
            >
              {hasPermission("rational_pdf_model_download") && (
                <a
                  href={pdfUrl}
                  download="recommendation.pdf"
                  className="px-4 py-2 rounded-md transition-colors"
                  style={{
                    background: "var(--theme-primary)",
                    color: "var(--theme-primary-contrast)",
                  }}
                >
                  Download PDF
                </a>
              )}
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-md border transition-colors"
                style={{
                  background: "var(--theme-surface)",
                  color: "var(--theme-text)",
                  borderColor: "var(--theme-border)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadPDF;