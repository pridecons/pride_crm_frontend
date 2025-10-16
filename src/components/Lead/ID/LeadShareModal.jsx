// LeadShareModal.jsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { UserPlus, Info, Send, Loader2, User, Mail, Phone, X } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";

export default function LeadShareModal({ isOpen, onClose, leadId, onSuccess }) {
  const [targetUserId, setTargetUserId] = useState(""); // now holds NAME for display
  const [selectedCode, setSelectedCode] = useState(""); // <-- NEW: holds employee_code for API
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
    setSelectedCode(""); // reset selection
    setTargetUserId(""); // optional: clear previous name
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

  // We still compute a cleanedCode for fallback (typed code), but prefer selectedCode.
  const cleanedCode = useMemo(() => {
    if (selectedCode) return selectedCode; // <-- prefer the selected employee_code
    const raw = String(targetUserId || "").trim().toUpperCase();
    if (!raw) return "";
    // If user typed an actual code, we still support it:
    if (/^EMP\d+$/.test(raw) || /^ADMIN\d+/.test(raw)) return raw;
    if (/^\d+$/.test(raw)) return `EMP${raw.padStart(3, "0")}`;
    // If they typed a name, there's no reliable way to derive code here.
    return "";
  }, [targetUserId, selectedCode]);

  const suggestions = useMemo(() => {
    const q = String(targetUserId || "").trim().toLowerCase();
    if (!q) return [];
    const pick = (u) =>
      `${u.name || ""} ${(u.employee_code || "")} ${(u.phone_number || "")} ${(u.email || "")}`.toLowerCase();
    return users.filter((u) => pick(u).includes(q)).slice(0, 8);
  }, [targetUserId, users]);

  const selectUser = (u) => {
    // show NAME in the input, remember CODE separately
    setTargetUserId(u?.name || u?.employee_code || "");
    setSelectedCode(u?.employee_code || "");
    setListOpen(false);
  };

  const canTransfer = cleanedCode.length > 0 && !loading;

  const handleTransfer = async () => {
    // If user typed a name and didn't select, try to use the highlighted suggestion
    let codeForTransfer = cleanedCode;
    if (!codeForTransfer && suggestions[highlight]) {
      codeForTransfer = suggestions[highlight]?.employee_code || "";
    }

    if (!codeForTransfer) {
      ErrorHandling({ defaultError: "Please select an employee from the list (or enter a valid code)." });
      return;
    }

    try {
      setLoading(true);
      const { data } = await axiosInstance.post("/leads/transfer/", {
        lead_id: Number(leadId),
        employee_id: codeForTransfer, // stays as employee_code for backend
      });
      toast.success(data?.message || `Lead transferred to ${data?.to_user || targetUserId || codeForTransfer}`);
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
        selectUser(suggestions[highlight]); // sets name + code
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
          className="px-4 py-2 rounded-xl transition-colors"
          disabled={loading}
          style={{
            background: "var(--theme-muted,#f1f5f9)",
            color: "var(--theme-text,#0f172a)",
            border: "1px solid var(--theme-border,#e5e7eb)",
          }}
        >
          Cancel
        </button>,
        <button
          key="transfer"
          onClick={handleTransfer}
          disabled={!canTransfer}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl disabled:opacity-50 transition-colors"
          style={{
            background: "var(--theme-primary,#4f46e5)",
            color: "var(--theme-primary-contrast,#fff)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-hover,#4338ca)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--theme-primary,#4f46e5)")}
        >
          <Send size={16} />
          {loading ? "Transferring..." : "Transfer Lead"}
        </button>,
      ]}
    >
      <div className="shadow-sm overflow-hidden">
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{
            color: "var(--theme-primary-contrast,#fff)",
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--theme-primary,#4f46e5) 90%, transparent), color-mix(in srgb, var(--theme-primary,#4f46e5) 65%, #fff 10%))",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 flex-grow">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur"
                style={{ background: "color-mix(in srgb, #fff 18%, transparent)" }}
              >
                <UserPlus size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold leading-5">Transfer Lead</h3>
                <p
                  className="text-xs/5"
                  style={{ color: "color-mix(in srgb, #fff 82%, transparent)" }}
                >
                  Assign this lead to another employee.
                </p>
              </div>
            </div>
            <div>
              <button
                onClick={onClose}
                className="transition-colors"
                style={{ color: "var(--theme-primary-contrast,#fff)" }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="p-5 space-y-5"
          style={{ background: "var(--theme-card-bg,#ffffff)", color: "var(--theme-text,#0f172a)" }}
        >
          {/* Employee Name / Autocomplete */}
          <div className="relative">
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--theme-text,#0f172a)" }}
            >
              Target Employee Name <span style={{ color: "var(--theme-danger,#dc2626)" }}>*</span>
            </label>

            <div
              className="mt-1.5 flex rounded-xl transition"
              style={{
                border: "1px solid var(--theme-border,#e5e7eb)",
                boxShadow: "0 0 0 0 rgba(0,0,0,0)",
              }}
              onFocus={() => setListOpen(true)}
            >
              <span
                className="px-3 shrink-0 inline-flex items-center text-sm rounded-l-xl"
                style={{
                  color: "var(--theme-text-muted,#64748b)",
                  borderRight: "1px solid var(--theme-border,#e5e7eb)",
                  background: "var(--theme-panel,#f8fafc)",
                }}
              >
                NAME{/* was EMP */}
              </span>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => {
                  setTargetUserId(e.target.value); // name string
                  setSelectedCode(""); // reset until a suggestion is selected
                  setListOpen(true);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                onBlur={() => setTimeout(() => setListOpen(false), 120)}
                placeholder="Type name, code, phone, or email…"
                className="w-full rounded-r-xl border-0 px-3 py-2 outline-none text-sm"
                autoFocus
                style={{
                  background: "var(--theme-card-bg,#fff)",
                  color: "var(--theme-text,#0f172a)",
                }}
              />
            </div>

            {/* Suggestions */}
            {listOpen && (usersLoading || suggestions.length > 0) && (
              <div
                className="absolute z-50 mt-1 w-full rounded-xl shadow-lg max-h-72 overflow-auto"
                style={{
                  background: "var(--theme-card-bg,#fff)",
                  border: "1px solid var(--theme-border,#e5e7eb)",
                }}
              >
                {usersLoading ? (
                  <div
                    className="px-3 py-2 text-sm flex items-center gap-2"
                    style={{ color: "var(--theme-text-muted,#64748b)" }}
                  >
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
                      className="w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 transition-colors"
                      style={{
                        background:
                          idx === highlight
                            ? "color-mix(in srgb, var(--theme-primary,#4f46e5) 10%, var(--theme-card-bg,#fff))"
                            : "var(--theme-card-bg,#fff)",
                        color: "var(--theme-text,#0f172a)",
                      }}
                      onMouseEnter={() => setHighlight(idx)}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-2"
                          style={{ color: "var(--theme-text,#0f172a)" }}
                        >
                          <User className="h-4 w-4" style={{ color: "var(--theme-text-muted,#64748b)" }} />
                          {/* Name first, then subtle code */}
                          <span className="font-medium">{u.name || "—"}</span>
                          {u.employee_code && (
                            <span style={{ color: "var(--theme-text-muted,#64748b)" }}>
                              — {u.employee_code}
                            </span>
                          )}
                        </div>
                        {u.branch_id != null && (
                          <span className="text-xs" style={{ color: "var(--theme-text-muted,#94a3b8)" }}>
                            Branch #{u.branch_id}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--theme-text-muted,#64748b)" }}>
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
                  <div
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--theme-text-muted,#64748b)" }}
                  >
                    No matches
                  </div>
                )}
              </div>
            )}

            <p
              className="mt-1 text-xs"
              style={{ color: "var(--theme-text-muted,#64748b)" }}
            >
              You can search by <span className="font-medium">name</span>, code (e.g.{" "}
              <span className="font-medium">EMP003</span> or <span className="font-medium">012</span>), phone, or email.
            </p>
          </div>

          {/* Footer Row */}
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: "var(--theme-text-muted,#64748b)" }}
          >
            {loading && <span className="animate-pulse">Processing…</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}