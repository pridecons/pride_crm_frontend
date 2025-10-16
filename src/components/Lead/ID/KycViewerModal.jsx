// components/Lead/KycViewerOverlay.jsx
"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, X } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import { ErrorHandling } from "@/helper/ErrorHandling";

// Hide Chrome/Edge/Firefox PDF UI
function withPdfViewerParams(rawUrl) {
  if (!rawUrl) return rawUrl;
  // If URL already has a hash, append with '&', otherwise start a new hash.
  const hasHash = rawUrl.includes("#");
  const suffix = "toolbar=0&navpanes=0&scrollbar=0";
  return `${rawUrl}${hasHash ? "&" : "#"}${suffix}`;
}

export default function KycViewerOverlay({
  open,
  onClose,
  url,
  canDownload = false,
  title = "KYC Document",
  filename = "kyc-document.pdf",
}) {
  const [loading, setLoading] = useState(true);

  // Build viewer URL (hide toolbar if download not allowed)
  const viewerUrl = useMemo(() => {
    if (!url) return url;
    return canDownload ? url : withPdfViewerParams(url);
  }, [url, canDownload]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
  }, [open, viewerUrl]);

  const handleDownload = useCallback(async () => {
    try {
      const res = await axiosInstance.get(url, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to download document" });
    }
  }, [url, filename]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col"
      style={{ background: "var(--theme-components-modal-overlay, rgba(0,0,0,0.60))" }}
      aria-modal="true"
      role="dialog"
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          background: "var(--theme-components-modal-bg, var(--theme-cardBackground, #fff))",
          color: "var(--theme-components-modal-text, var(--theme-text, #111))",
          borderColor: "var(--theme-components-modal-border, var(--theme-border, #e5e7eb))",
        }}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {canDownload && (
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg border text-sm"
              style={{
                background: "var(--theme-surface, #fff)",
                color: "var(--theme-text, #111)",
                borderColor: "var(--theme-border, #e5e7eb)",
              }}
            >
              Download
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-white text-sm"
            style={{ background: "var(--theme-components-button-danger-bg, #6b7280)" }}
            aria-label="Close"
          >
            <span className="inline-flex items-center gap-1">
              <X size={16} /> Close
            </span>
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0 relative">
        {loading && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <Loader2 className="animate-spin" style={{ color: "var(--theme-primary, #2563eb)" }} />
          </div>
        )}

        {viewerUrl ? (
          <iframe
            // If canDownload is false, viewerUrl includes #toolbar=0...
            src={viewerUrl}
            title="KYC PDF"
            className="w-full h-full block"
            onLoad={() => setLoading(false)}
          />
        ) : (
          <div className="h-full grid place-items-center text-gray-500">Loading document…</div>
        )}
      </div>
    </div>
  );
}
