"use client";
import React from "react";

/**
 * DocumentViewer
 * Props:
 *  - open         : boolean
 *  - onClose      : () => void
 *  - url          : string (absolute or relative)
 *  - title        : string
 *  - canDownload  : boolean (show Download button)
 *  - downloadName : string (optional filename when downloading)
 *  - baseUrl      : string (optional; for resolving relative urls)
 */
export default function DocumentViewer({
  open,
  onClose,
  url,
  title = "Document",
  canDownload = false,
  downloadName,
  baseUrl,
}) {
  if (!open) return null;

  const ensureAbsoluteUrl = (u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    const base =
      baseUrl ||
      process.env.NEXT_PUBLIC_API_BASE ||
      (typeof window !== "undefined" ? `${location.origin}` : "");
    return `${base.replace(/\/$/, "")}/${u.replace(/^\//, "")}`;
  };

  const absolute = ensureAbsoluteUrl(url);
  const isPdf = absolute.toLowerCase().includes(".pdf");

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between">
            <div className="text-white text-lg font-semibold truncate">
              {title}
            </div>
            <div className="flex items-center gap-3">
              {canDownload && absolute ? (
                <a
                  href={absolute}
                  download={downloadName || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 text-white text-sm"
                >
                  Download
                </a>
              ) : null}
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="bg-gray-50 rounded-xl p-2 min-h-[70vh]">
              {absolute ? (
                isPdf ? (
                  <iframe
                    src={absolute}
                    title={title}
                    className="w-full h-[70vh] rounded border border-gray-200"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[70vh]">
                    <img
                      src={absolute}
                      alt={title}
                      className="max-w-full max-h-full object-contain rounded-lg shadow"
                    />
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-[70vh]">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.482 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Not Found</h3>
                    <p className="text-gray-500">No document is available for viewing</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}