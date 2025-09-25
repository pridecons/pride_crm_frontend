"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { UserPlus, Info, Send, Loader2, User, Mail, Phone, X } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";

export default function LeadShareModal({ isOpen, onClose, leadId, onSuccess }) {
  const [targetUserId, setTargetUserId] = useState("");
  const [loading, setLoading] = useState(false);

  // users for auto-complete
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // fetch users when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setListOpen(false);
    setHighlight(0);
    setUsersLoading(true);
    axiosInstance
      .get("/users/?skip=0&limit=100&active_only=false")
      .then(({ data }) => {
        const arr = Array.isArray(data?.data) ? data.data : [];
        setUsers(arr);
      })
      .catch((err) => {
        ErrorHandling({ error: err, defaultError: "Failed to load users" });
        setUsers([]);
      })
      .finally(() => setUsersLoading(false));
  }, [isOpen]);

  const cleanedCode = useMemo(() => {
    const raw = String(targetUserId || "").trim().toUpperCase();
    if (!raw) return "";
    if (/^EMP\d+$/.test(raw) || /^ADMIN\d+/.test(raw)) return raw; 
    if (/^\d+$/.test(raw)) return `EMP${raw.padStart(3, "0")}`;
    return raw;
  }, [targetUserId]);

  const suggestions = useMemo(() => {
    const q = String(targetUserId || "").trim().toLowerCase();
    if (!q) return [];
    const pick = (u) =>
      `${u.employee_code || ""} ${(u.name || "")} ${(u.phone_number || "")} ${(u.email || "")}`.toLowerCase();
    return users
      .filter((u) => pick(u).includes(q))
      .slice(0, 8);
  }, [targetUserId, users]);

  const selectUser = (u) => {
    setTargetUserId(u?.employee_code || "");
    setListOpen(false);
  };

  const canTransfer = cleanedCode.length > 0 && !loading;

  const handleTransfer = async () => {
    if (!cleanedCode) {
      ErrorHandling({ defaultError: "Please enter/select employee code (e.g. 012 or EMP012)" });
      return;
    }
    try {
      setLoading(true);
      const { data } = await axiosInstance.post("/leads/transfer/", {
        lead_id: Number(leadId),
        employee_id: cleanedCode,
      });
      toast.success(data?.message || `Lead transferred to ${data?.to_user || cleanedCode}`);
      onSuccess?.(data);
      onClose?.();
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to transfer lead" });
    } finally {
      setLoading(false);
    }
  };

  // keyboard navigation for list
  const onKeyDown = (e) => {
    if (!listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setListOpen(true);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (listOpen && suggestions[highlight]) {
        e.preventDefault();
        selectUser(suggestions[highlight]);
      } else if (canTransfer) {
        e.preventDefault();
        handleTransfer();
      }
    } else if (e.key === "Escape") {
      setListOpen(false);
    }
  };

  // submit on Enter (outside textarea)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Enter" && e.target?.tagName !== "TEXTAREA") {
        if (!listOpen && canTransfer) {
          e.preventDefault();
          handleTransfer();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, listOpen, canTransfer, cleanedCode]);

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
          key="transfer"
          onClick={handleTransfer}
          disabled={!canTransfer}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} />
          {loading ? "Transferring..." : "Transfer Lead"}
        </button>,
      ]}
    >
      <div className="shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white px-5 py-4">
          <div className="flex items-center gap-3">
           <div className="flex items-center gap-3 flex-grow">
             <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <UserPlus size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-5">Transfer Lead</h3>
              <p className="text-xs/5 text-white/80">Assign this lead to another employee.</p>
            </div></div>
            <div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 bg-white">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-800">
              Target Employee Code <span className="text-red-500">*</span>
            </label>
            <div
              className="mt-1.5 flex rounded-xl border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition"
              onFocus={() => setListOpen(true)}
            >
              <span className="px-3 shrink-0 inline-flex items-center text-gray-500 text-sm border-r border-gray-200 bg-gray-50 rounded-l-xl">
                EMP
              </span>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => {
                  setTargetUserId(e.target.value);
                  setListOpen(true);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                onBlur={() => setTimeout(() => setListOpen(false), 120)}
                placeholder="Type code, name, phone, or email…"
                className="w-full rounded-r-xl border-0 px-3 py-2 outline-none text-sm placeholder-gray-400"
                autoFocus
              />
            </div>

            {/* Suggestions dropdown */}
            {listOpen && (usersLoading || suggestions.length > 0) && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-72 overflow-auto">
                {usersLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading users…
                  </div>
                ) : (
                  suggestions.map((u, idx) => (
                    <button
                      key={u.employee_code}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectUser(u)}
                      className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 ${idx === highlight ? "bg-blue-50" : "bg-white"
                        } hover:bg-blue-50`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-900">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{u.employee_code}</span>
                          <span className="text-gray-500">— {u.name || "—"}</span>
                        </div>
                        {u.branch_id != null && (
                          <span className="text-xs text-gray-500">Branch #{u.branch_id}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {u.phone_number && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {u.phone_number}
                          </span>
                        )}
                        {u.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
                {!usersLoading && suggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                )}
              </div>
            )}

            <p className="mt-1 text-xs text-gray-500">
              You can search by code (e.g. <span className="font-medium">EMP003</span> or{" "}
              <span className="font-medium">012</span>), name, phone, or email.
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 p-3">
            <Info className="mt-0.5 text-blue-600" size={16} />
            <p className="text-xs text-blue-900">Action is audit-logged with your code and timestamp.</p>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>
              <span className="text-gray-400">Preview:</span>{" "}
              <span className="font-medium text-gray-700">{cleanedCode || "EMP—"}</span>
            </div>
            {loading && <span className="animate-pulse">Processing…</span>}
          </div>
        </div>
      </div>
    </Modal >
  );
}
