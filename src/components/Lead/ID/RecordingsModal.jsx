"use client";
import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { AudioLines, RefreshCcw, Trash2, Upload, ExternalLink } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";

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

  // 👇 strict-mode guard + abort support
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
      if (err?.name === "CanceledError") return; // ignore cancel
      if (err?.response?.status === 404) {
        // treat as empty; no toast spam
        setList([]);
      } else {
        const msg = err?.response?.data?.detail?.message || err?.response?.data?.detail || err?.message || "Failed to load recordings"
        toast.error(msg);
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

  // reset guard when modal closes
  useEffect(() => {
    if (!open) didFetchRef.current = false;
  }, [open]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("File must be under 3MB");
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
      const msg = err?.response?.data?.detail?.message || err?.response?.data?.detail || err?.message || "Upload failed"
      toast.error(msg);
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
      const msg = err?.response?.data?.detail?.message || err?.response?.data?.detail || err?.message || "Delete failed"
      toast.error(msg);
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
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <AudioLines size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold leading-5">Call Recordings</h3>
                <p className="text-xs/5 text-white/80">Play, upload and delete recordings</p>
              </div>
            </div>
            <button
              onClick={fetchRecordings}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20"
              title="Refresh"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="p-5 bg-white space-y-4">
          {hasPermission?.("lead_recording_upload") && (
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">
                  Upload a new audio file (max 3MB). Supported: <code>.mp3, .wav, .m4a</code>
                </div>
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {uploading ? "Uploading..." : "Upload Recording"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="border rounded-xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto divide-y">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-5 bg-gray-200 rounded" />
                  ))}
                </div>
              ) : list.length === 0 ? (
                <div className="p-6 text-gray-600">No recordings found.</div>
              ) : (
                list.map((rec) => {
                  const src = toAbsoluteUrl(rec.recording_url);
                  const when = rec.created_at ? new Date(rec.created_at).toLocaleString() : "-";
                  return (
                    <div key={rec.id} className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="md:w-3/4">
                        <audio controls className="w-full">
                          <source src={src} type="audio/mpeg" />
                        </audio>
                        <div className="mt-1 text-xs text-gray-500">Uploaded: {when}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                          title="Open in new tab"
                        >
                          <ExternalLink size={16} /> Open
                        </a>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          disabled={deletingId === rec.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          title="Delete"
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