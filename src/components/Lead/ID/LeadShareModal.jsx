"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { UserPlus, ShieldCheck, Info, Send } from "lucide-react";

export default function LeadShareModal({ isOpen, onClose, leadId, onSuccess }) {
  const [targetUserId, setTargetUserId] = useState("");
  const [message, setMessage] = useState("");
  const [transferOwnership, setTransferOwnership] = useState(true);
  const [loading, setLoading] = useState(false);

  const cleanedCode = useMemo(
    () => targetUserId.toUpperCase().replace(/\s+/g, ""),
    [targetUserId]
  );
  const canShare = cleanedCode.length > 0 && !loading;

  const handleShare = async () => {
    if (!cleanedCode) {
      toast.error("Please enter target employee code (e.g. EMP012)");
      return;
    }
    try {
      setLoading(true);
      const { data } = await axiosInstance.post("/lead-sharing/share", {
        lead_id: leadId,
        target_user_id: cleanedCode,
        message,
        transfer_ownership: transferOwnership,
      });
      toast.success(data?.message || "Lead shared successfully");
      onSuccess?.(data);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail?.message || err?.response?.data?.detail || err?.message || "Failed to share lead"
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Enter" && e.target?.tagName !== "TEXTAREA") {
        e.preventDefault();
        if (canShare) handleShare();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, canShare]); // eslint-disable-line

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      contentClassName="w-[42rem] max-w-2xl"
      actions={[
        <button
          key="cancel"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>,
        <button
          key="share"
          onClick={handleShare}
          disabled={!canShare}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} />
          {loading ? "Sharing..." : "Share Lead"}
        </button>,
      ]}
    >
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <UserPlus size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-5">Share Lead</h3>
              <p className="text-xs/5 text-white/80">
                Send this lead to another employee. You can also transfer ownership.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 bg-white">
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Target Employee Code <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 flex rounded-xl border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <span className="px-3 shrink-0 inline-flex items-center text-gray-500 text-sm border-r border-gray-200 bg-gray-50 rounded-l-xl">
                EMP
              </span>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="e.g. 012"
                className="w-full rounded-r-xl border-0 px-3 py-2 outline-none text-sm placeholder-gray-400"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              We’ll auto-format the code to uppercase (e.g. <span className="font-medium">EMP012</span>).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800">Message</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message…"
              className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="rounded-xl border border-gray-200 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={18} />
                <span className="text-sm font-medium text-gray-800">Transfer Ownership</span>
              </div>
              <button
                type="button"
                onClick={() => setTransferOwnership((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  transferOwnership ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    transferOwnership ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {transferOwnership
                ? "The target employee becomes the owner. Assignment, follow-ups, and KPIs move under them."
                : "You remain the owner. The target employee gets access but KPI ownership stays with you."}
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 p-3">
            <Info className="mt-0.5 text-blue-600" size={16} />
            <p className="text-xs text-blue-900">
              Action is audit-logged with your employee code and timestamp.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>
              <span className="text-gray-400">Preview:</span>{" "}
              <span className="font-medium text-gray-700">
                {cleanedCode ? cleanedCode : "EMP—"}
              </span>
            </div>
            {loading && <span className="animate-pulse">Processing…</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}