// RecordingsModal.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import {
  AudioLines,
  RefreshCcw,
  Trash2,
  Upload,
  ExternalLink,
  X,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { ErrorHandling } from "@/helper/ErrorHandling";

const toAbsoluteUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = (axiosInstance.defaults?.baseURL || "").replace("/api/v1", "");
  const clean = String(path).replace(/\\/g, "/").replace(/^\/+/, "");
  return `${base}/${clean}`;
};

export default function RecordingsModal({ open, onClose, leadId }) {
  const { hasPermission } = usePermissions();
  const canUpload = hasPermission?.("lead_recording_upload");

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fileRef = useRef(null);

  // strict-mode guard + abort support
  const didFetchRef = useRef(false);
  const abortRef = useRef(null);

  const fetchRecordings = async () => {
    if (!leadId) return;

    // cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/recordings/lead/${leadId}`, {
        signal: controller.signal,
      });
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name === "CanceledError") return;
      if (err?.response?.status === 404) {
        setList([]);
      } else {
        ErrorHandling({ defaultError: "Failed to load recordings" });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !leadId) return;
    if (didFetchRef.current) return; // guard strict-mode double call
    didFetchRef.current = true;
    fetchRecordings();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [open, leadId]);

  useEffect(() => {
    if (!open) didFetchRef.current = false;
  }, [open]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      ErrorHandling({ defaultError: "File must be under 3MB" });
      e.target.value = "";
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      form.append("lead_id", String(leadId));
      form.append("employee_code", "");
      form.append("file", file);
      await axiosInstance.post("/recordings/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Recording uploaded");
      e.target.value = "";
      await fetchRecordings();
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this recording permanently?")) return;
    try {
      setDeletingId(id);
      await axiosInstance.delete(`/recordings/${id}`);
      toast.success("Recording deleted");
      setList((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Delete failed" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title=""
      contentClassName="w-[56rem] max-w-3xl"
      actions={[]}
    >
      <div className="shadow-sm overflow-hidden">
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--theme-primary,#4f46e5) 85%, transparent), color-mix(in srgb, var(--theme-primary,#4f46e5) 65%, #fff 10%))",
            color: "var(--theme-primary-contrast, #ffffff)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur"
                style={{ background: "rgba(255,255,255,.15)" }}
              >
                <AudioLines size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold leading-5">
                  Call Recordings
                </h3>
                <p
                  className="text-xs/5"
                  style={{ color: "color-mix(in srgb, #fff 80%, transparent)" }}
                >
                  Play, upload and delete recordings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchRecordings}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
                title="Refresh"
                style={{
                  border: "1px solid rgba(255,255,255,.3)",
                  background: "rgba(255,255,255,.10)",
                  color: "var(--theme-primary-contrast,#fff)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,.20)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,.10)";
                }}
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
              <button
                onClick={onClose}
                className="transition-colors"
                aria-label="Close"
                title="Close"
                style={{ color: "var(--theme-primary-contrast, #fff)" }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="p-5 space-y-4"
          style={{ background: "var(--theme-card-bg, #ffffff)" }}
        >
          {canUpload && (
            <div
              className="rounded-xl p-2"
              style={{
                background: "var(--theme-panel, #f8fafc)",
                border: "1px solid var(--theme-border, #e5e7eb)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className="text-sm"
                  style={{ color: "var(--theme-text, #0f172a)" }}
                >
                  Upload a new audio file (max 3MB). Supported:{" "}
                  <code
                    style={{
                      color: "var(--theme-text-muted,#64748b)",
                      background: "transparent",
                    }}
                  >
                    .mp3, .wav, .m4a
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl disabled:opacity-50"
                    style={{
                      background: "var(--theme-primary,#4f46e5)",
                      color: "var(--theme-primary-contrast,#fff)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--theme-primary-hover,#4338ca)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "var(--theme-primary,#4f46e5)";
                    }}
                  >
                    <Upload size={16} />
                    {uploading ? "Uploading..." : "Upload Recording"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: "1px solid var(--theme-border,#e5e7eb)",
              background: "var(--theme-card-bg,#fff)",
            }}
          >
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse h-5 rounded"
                      style={{ background: "var(--theme-panel,#f1f5f9)" }}
                    />
                  ))}
                </div>
              ) : list.length === 0 ? (
                <div
                  className="p-6"
                  style={{ color: "var(--theme-text-muted,#64748b)" }}
                >
                  No recordings found.
                </div>
              ) : (
                list.map((rec, idx) => {
                  const src = toAbsoluteUrl(rec.recording_url);
                  const when = rec.created_at
                    ? new Date(rec.created_at).toLocaleString()
                    : "-";
                  return (
                    <div
                      key={rec.id}
                      className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      style={{
                        borderTop:
                          idx === 0
                            ? "none"
                            : "1px solid var(--theme-border,#e5e7eb)",
                        background: "var(--theme-card-bg,#fff)",
                      }}
                    >
                      <div className="md:w-3/4">
                        <audio
                          controls
                          className="w-full"
                          style={{
                            background: "var(--theme-card-bg,#fff)",
                            color: "var(--theme-text,#0f172a)",
                          }}
                        >
                          <source src={src} type="audio/mpeg" />
                        </audio>
                        <div
                          className="mt-1 text-xs"
                          style={{ color: "var(--theme-text-muted,#64748b)" }}
                        >
                          Uploaded: {when}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"
                          title="Open in new tab"
                          style={{
                            border: "1px solid var(--theme-border,#e5e7eb)",
                            color: "var(--theme-text,#0f172a)",
                            background: "var(--theme-card-bg,#fff)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "var(--theme-panel,#f8fafc)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              "var(--theme-card-bg,#fff)";
                          }}
                        >
                          <ExternalLink size={16} /> Open
                        </a>

                        <button
                          onClick={() => handleDelete(rec.id)}
                          disabled={deletingId === rec.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          title="Delete"
                          style={{
                            background: "var(--theme-danger,#dc2626)",
                            color: "#fff",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = "brightness(0.95)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = "none";
                          }}
                        >
                          <Trash2 size={16} />
                          {deletingId === rec.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
