"use client";

import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
  Send,
  Megaphone,
  Loader2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  MessageSquare,
  Building2,
  Clock,
  Radio,
} from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { useTheme } from "@/context/ThemeContext";

/* -----------------------------
   Helpers
----------------------------- */

// Theme-aware building blocks
const inputClass =
  "w-full h-12 rounded-xl px-4 border shadow-sm transition " +
  "bg-[var(--theme-input-background)] text-[var(--theme-text)] " +
  "border-[var(--theme-input-border)] placeholder-[var(--theme-text-muted)] " +
  "focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent";

const textareaClass =
  "w-full rounded-xl px-4 py-3 border shadow-sm transition resize-none " +
  "bg-[var(--theme-input-background)] text-[var(--theme-text)] " +
  "border-[var(--theme-input-border)] placeholder-[var(--theme-text-muted)] " +
  "focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent";

const btnPrimary =
  "flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all transform " +
  "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] " +
  "hover:bg-[var(--theme-primary-hover)] hover:shadow-xl hover:scale-105 disabled:opacity-60";

const btnSoft =
  "px-3 py-2 rounded-lg text-sm font-medium transition-colors " +
  "bg-[var(--theme-primary-softer)] text-[var(--theme-primary)] hover:opacity-90";

const cardClass =
  "rounded-2xl shadow-sm border p-6 " +
  "bg-[var(--theme-card-bg)] border-[var(--theme-border)]";

const cardSoftClass =
  "rounded-2xl shadow-sm border p-6 backdrop-blur-sm " +
  "bg-[color:var(--theme-surface)]/60 border-[var(--theme-border)]";

const muted = "text-[var(--theme-text-muted)]";
const ink = "text-[var(--theme-text)]";

function parseCodes(input = "") {
  return Array.from(
    new Set(
      String(input)
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

// cookie/jwt readers
function readFromSession(keys = []) {
  try {
    const raw = Cookies.get("user_info");
    if (raw) {
      const u = JSON.parse(raw);
      for (const k of keys) if (u?.[k] !== undefined && u?.[k] !== null) return u[k];
    }
  } catch {}
  try {
    const token = Cookies.get("access_token");
    if (token) {
      const payload = jwtDecode(token);
      for (const k of keys) if (payload?.[k] !== undefined && payload?.[k] !== null) return payload[k];
    }
  } catch {}
  return null;
}
const getRole = () => (readFromSession(["role", "role_name", "roleName"]) || "").toString().toUpperCase();
const getBranchIdFromSession = () => {
  const v = readFromSession(["branch_id", "branchId"]);
  return v === null || String(v).trim() === "" ? null : String(v);
};
const isSuper = (r) => ["SUPERADMIN", "SUPER_ADMIN"].includes((r || "").toString().toUpperCase());

/* -----------------------------
   UI
----------------------------- */
export default function NoticeBoardPage() {
  const { theme } = useTheme();

  // mode: "users" | "branch" | "all"
  const [mode, setMode] = useState("users");

  // form
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentLog, setSentLog] = useState([]);

  // auth/session
  const [role, setRole] = useState("");
  const [superadmin, setSuperadmin] = useState(false);

  // branches
  const [branchId, setBranchId] = useState(null); // used by superadmin
  const [myBranchId, setMyBranchId] = useState(null); // enforced branch for non-superadmin
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // users
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userCodesRaw, setUserCodesRaw] = useState("");

  useEffect(() => {
    const r = getRole();
    setRole(r);
    const _isSuper = isSuper(r);
    setSuperadmin(_isSuper);

    const b = getBranchIdFromSession();
    setBranchId(b);    // superadmin can change this
    setMyBranchId(b);  // non-superadmin enforced branch
  }, []);

  // fetch branches (superadmin only)
  useEffect(() => {
    if (!superadmin) return;
    (async () => {
      try {
        setLoadingBranches(true);
        const { data } = await axiosInstance.get("/branches/");
        const list = Array.isArray(data) ? data : data?.items || [];
        setBranches(list);
        if (!branchId && list.length > 0) {
          const first = String(list[0]?.id ?? list[0]?.branch_id ?? "").trim();
          if (first) setBranchId(first);
        }
      } catch (err) {
        ErrorHandling({ error: err, defaultError: "Failed to load branches." });
      } finally {
        setLoadingBranches(false);
      }
    })();
  }, [superadmin]);

  // fetch users (for listing)
  useEffect(() => {
    (async () => {
      try {
        setUsersLoading(true);
        const { data } = await axiosInstance.get("/users/", {
          params: { skip: 0, limit: 1000, active_only: false },
        });
        const arr = Array.isArray(data) ? data : data?.data || [];
        setUsers(arr);
      } catch (err) {
        ErrorHandling({ error: err, defaultError: "Failed to load users." });
      } finally {
        setUsersLoading(false);
      }
    })();
  }, []);

  // derived
  const userCodes = useMemo(() => parseCodes(userCodesRaw), [userCodesRaw]);

  // Non-superadmin: ALWAYS scoped to myBranchId
  // Superadmin: list filtered by currently selected branchId
  const visibleUsers = useMemo(() => {
    const targetBranch = superadmin ? branchId : myBranchId;

    let list = users;
    if (targetBranch) list = list.filter((u) => String(u?.branch_id) === String(targetBranch));

    const q = userSearch.trim().toLowerCase();
    if (!q) return list.slice(0, 12);

    return list
      .filter((u) => {
        const code = String(u?.employee_code || "").toLowerCase();
        const name = String(u?.name || "").toLowerCase();
        const phone = String(u?.phone_number || "").toLowerCase();
        return code.includes(q) || name.includes(q) || phone.includes(q);
      })
      .slice(0, 12);
  }, [users, userSearch, branchId, myBranchId, superadmin]);

  // make sure non-superadmins never sit in "all" mode
  useEffect(() => {
    if (!superadmin && mode === "all") setMode("branch");
  }, [superadmin, mode]);

  const canSend = useMemo(() => {
    const hasText = title.trim() && message.trim();
    if (!hasText || sending) return false;

    if (mode === "all") return superadmin; // only superadmin can system-wide

    if (mode === "branch") {
      return superadmin ? Boolean(branchId) : Boolean(myBranchId);
    }

    // users
    return userCodes.length > 0;
  }, [title, message, sending, mode, branchId, myBranchId, superadmin, userCodes.length]);

  // actions
  const addChip = (code) => {
    const s = new Set(parseCodes(userCodesRaw));
    s.add(String(code).trim());
    setUserCodesRaw(Array.from(s).join(", "));
  };
  const removeChip = (code) => {
    setUserCodesRaw(parseCodes(userCodesRaw).filter((c) => c !== code).join(", "));
  };

  const handleSend = async () => {
    if (!canSend) {
      ErrorHandling({ defaultError: "Please complete required fields." });
      return;
    }

    const effectiveBranchId = superadmin ? branchId : myBranchId;

    if (mode === "branch" && !effectiveBranchId) {
      ErrorHandling({ defaultError: "Branch is required for Branch mode." });
      return;
    }
    if (mode === "users" && userCodes.length === 0) {
      ErrorHandling({ defaultError: "Please select at least one user." });
      return;
    }

    // build payload exactly as API expects
    const payload = { mode, title: title.trim(), message: message.trim() };

    if (mode === "branch") {
      payload.branch_id = isNaN(Number(effectiveBranchId))
        ? effectiveBranchId
        : Number(effectiveBranchId);
    }

    if (mode === "users") {
      // non-superadmins can only DM users in their own branch
      if (!superadmin) {
        const allowed = new Set(
          users
            .filter((u) => String(u.branch_id) === String(myBranchId))
            .map((u) => String(u.employee_code))
        );
        const filtered = userCodes.filter((c) => allowed.has(String(c)));
        if (filtered.length !== userCodes.length) {
          toast.error("You can only send to users in your branch.");
        }
        payload.user_ids = filtered;
      } else {
        payload.user_ids = userCodes;
      }
    }

    setSending(true);
    try {
      const res = await axiosInstance.post("/notification/all", payload, {
        headers: { "Content-Type": "application/json", accept: "application/json" },
      });

      const data = res?.data || {};
      if (!data?.success) {
        ErrorHandling({ defaultError: "Notification request failed." });
        return;
      }

      // Build a concise activity entry from API response shapes
      const entry = {
        id: Date.now(),
        at: new Date().toISOString(),
        title: payload.title,
        message: payload.message,
        mode: data.mode || mode,
        branch_id: data.branch_id ?? (mode === "branch" ? payload.branch_id : undefined),
        metrics: data.metrics || {},
        delivered_to: data.delivered_to || [],
        failed_to: data.failed_to || [],
        recipients:
          mode === "all"
            ? ["ALL_CONNECTED_USERS"]
            : mode === "branch"
            ? [`BRANCH_${payload.branch_id}`]
            : payload.user_ids,
        results: [],
      };

      if (mode === "all") {
        toast.success(
          `Broadcasted to all (connected ${entry.metrics?.connected_users ?? "?"}); delivered sockets ${entry.metrics?.delivered_sockets ?? "?"}`
        );
        entry.results = [
          {
            code: "ALL_CONNECTED",
            ok: true,
            info: `delivered_sockets=${entry.metrics?.delivered_sockets ?? "?"}`,
          },
        ];
      } else if (mode === "branch") {
        toast.success(
          `Branch ${entry.branch_id}: delivered ${entry.metrics?.delivered_users ?? 0}/${entry.metrics?.requested_users ?? 0}`
        );
        entry.results = [
          ...entry.delivered_to.map((c) => ({ code: c, ok: true })),
          ...entry.failed_to.map((c) => ({ code: c, ok: false })),
        ];
      } else {
        toast.success(
          `Users: delivered ${entry.metrics?.delivered_users ?? 0}/${entry.metrics?.requested_users ?? userCodes.length}`
        );
        entry.results = [
          ...entry.delivered_to.map((c) => ({ code: c, ok: true })),
          ...entry.failed_to.map((c) => ({ code: c, ok: false })),
        ];
      }

      setSentLog((prev) => [entry, ...prev]);
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message;
      ErrorHandling({ error: err, defaultError: `Failed to send: ${msg}` });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-background)]">
      <div className="p-4 md:p-6 mx-2">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl shadow-lg bg-[var(--theme-primary)]">
              <Megaphone className="w-8 h-8 text-[var(--theme-primary-contrast)]" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${ink}`}>Notice Board</h1>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode + Branch */}
            <div className={cardSoftClass}>
              <div className="flex items-center gap-3 mb-4">
                <Radio className="w-5 h-5 text-[var(--theme-primary)]" />
                <h2 className={`text-lg font-semibold ${ink}`}>Send Mode</h2>
              </div>

              <div className="flex flex-wrap gap-4">
                {superadmin && (
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      value="all"
                      checked={mode === "all"}
                      onChange={() => setMode("all")}
                      className="h-4 w-4 border-[var(--theme-border)] [accent-color:var(--theme-primary)]"
                    />
                    <span className={`text-sm ${ink}`}>All (system-wide)</span>
                  </label>
                )}

                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    value="branch"
                    checked={mode === "branch"}
                    onChange={() => setMode("branch")}
                    className="h-4 w-4 border-[var(--theme-border)] [accent-color:var(--theme-primary)]"
                  />
                  <span className="text-sm text-[var(--theme-text)]">
                    {superadmin ? "Branch" : "All"}
                  </span>
                </label>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    value="users"
                    checked={mode === "users"}
                    onChange={() => setMode("users")}
                    className="h-4 w-4 border-[var(--theme-border)] [accent-color:var(--theme-primary)]"
                  />
                  <span className="text-sm text-[var(--theme-text)]">Specific Users</span>
                </label>
              </div>

              {/* Branch selector (superadmin only) */}
              {mode !== "all" && superadmin && (
                <div className="mt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-[var(--theme-primary)]" />
                    <h3 className="text-sm font-semibold text-[var(--theme-text)]">Branch</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={branchId || ""}
                      onChange={(e) => setBranchId(e.target.value)}
                      className={`flex-1 ${inputClass}`}
                      disabled={loadingBranches}
                    >
                      {!branchId && <option value="">Choose a branch...</option>}
                      {branches.map((b) => {
                        const val = String(b?.id ?? b?.branch_id ?? "").trim();
                        const label = b?.name || b?.branch_name || `Branch ${val || ""}`;
                        return (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {loadingBranches && (
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--theme-primary)]" />
                    )}
                  </div>

                  {mode === "branch" && !branchId && (
                    <p
                      className="mt-2 text-xs"
                      style={{ color: "var(--theme-components-tag-warning-text)" }}
                    >
                      Branch is required for Branch mode.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Recipients (only when mode === "users") */}
            {mode === "users" && (
              <div className={cardSoftClass}>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-[var(--theme-primary)]" />
                  <h2 className={`text-lg font-semibold ${ink}`}>Select Recipients</h2>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search employees by code, name, or phone..."
                    className={`${inputClass} pl-10`}
                  />
                </div>

                {/* User List */}
                <div className="border rounded-xl max-h-64 overflow-auto bg-[var(--theme-card-bg)] border-[var(--theme-border)]">
                  {usersLoading ? (
                    <div className="flex items-center gap-3 p-4 text-[var(--theme-text-muted)]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading employees...</span>
                    </div>
                  ) : superadmin && !branchId ? (
                    <div className="text-center p-6 text-[var(--theme-text-muted)]">
                      <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--theme-primary-softer)" }} />
                      <p>Select a branch to view employees</p>
                    </div>
                  ) : visibleUsers.length === 0 ? (
                    <div className="text-center p-6 text-[var(--theme-text-muted)]">
                      <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--theme-primary-softer)" }} />
                      <p>No employees found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--theme-border)]">
                      {visibleUsers.map((u) => (
                        <div key={u.employee_code} className="p-4 hover:bg-[var(--theme-primary-softer)] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-medium ${ink}`}>{u.name || "—"}</span>
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full border`}
                                  style={{
                                    background: "var(--theme-components-tag-neutral-bg)",
                                    color: "var(--theme-components-tag-neutral-text)",
                                    borderColor: "var(--theme-components-tag-neutral-border)",
                                  }}
                                >
                                  {u.employee_code}
                                </span>
                              </div>
                              <div className={`text-sm ${muted}`}>
                                {u.phone_number || "—"} • Branch {String(u.branch_id ?? "—")}
                              </div>
                            </div>
                            <button onClick={() => addChip(u.employee_code)} className={btnSoft + " flex items-center gap-2"}>
                              <UserPlus className="w-4 h-4" />
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected */}
                {userCodes.length > 0 && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Selected Recipients ({userCodes.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {userCodes.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm"
                          style={{
                            background: "var(--theme-components-tag-info-bg)",
                            color: "var(--theme-components-tag-info-text)",
                            borderColor: "var(--theme-components-tag-info-border)",
                          }}
                        >
                          {c}
                          <button
                            onClick={() => removeChip(c)}
                            className="font-medium text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)]"
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Input */}
                <div className="mt-4">
                  <label className={`text-sm font-medium ${muted} mb-2 block`}>
                    Manual Entry <span className={`${muted} font-normal`}>(comma or space separated)</span>
                  </label>
                  <textarea
                    value={userCodesRaw}
                    onChange={(e) => setUserCodesRaw(e.target.value)}
                    placeholder="e.g. EMP021, EMP017"
                    rows={2}
                    className={textareaClass}
                  />
                </div>
              </div>
            )}

            {/* Message */}
            <div className={cardSoftClass}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-[var(--theme-primary)]" />
                  <h2 className={`text-lg font-semibold ${ink}`}>Compose Message</h2>
                </div>
                <button
                  onClick={() => {
                    setTitle("");
                    setMessage("");
                  }}
                  className={`text-sm ${muted} hover:text-[var(--theme-text)] underline underline-offset-4`}
                >
                  Clear
                </button>
              </div>

              <div className="mb-4">
                <label className={`text-sm font-medium ${muted} mb-2 block`}>Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notice title..."
                  className={inputClass}
                />
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your notice message here..."
                  rows={4}
                  className={textareaClass}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className={`text-sm ${muted}`}>
                  {superadmin && mode === "all" ? (
                    <span>
                      Ready to broadcast to <b>ALL</b> connected users
                    </span>
                  ) : mode === "branch" ? (
                    <span>
                      {superadmin ? (
                        <>
                          Ready to notify <b>Branch {branchId || "—"}</b>
                        </>
                      ) : (
                        <>Ready to notify <b>all users in your branch</b></>
                      )}
                    </span>
                  ) : userCodes.length > 0 ? (
                    <span>
                      Ready to send to <b>{userCodes.length}</b> recipient
                      {userCodes.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span>Select recipients to continue</span>
                  )}
                </div>

                <button
                  disabled={!canSend}
                  onClick={handleSend}
                  className={
                    canSend
                      ? btnPrimary
                      : "px-6 py-2 rounded-xl font-medium flex items-center gap-2 bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border border-[var(--theme-border)] cursor-not-allowed"
                  }
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Activity */}
          <div className="lg:col-span-1">
            <div className={`${cardSoftClass} sticky top-6`}>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-[var(--theme-primary)]" />
                <h2 className={`text-lg font-semibold ${ink}`}>Recent Activity</h2>
              </div>

              {sentLog.length === 0 ? (
                <div className="text-center py-8">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: "var(--theme-primary-softer)" }}
                  >
                    <AlertCircle className="w-8 h-8 text-[var(--theme-text-muted)]" />
                  </div>
                  <p className={`${muted} text-sm`}>No notices sent yet</p>
                  <p className={`${muted} text-xs mt-1`}>Your recent activity will appear here</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-auto">
                  {sentLog.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl p-4 border bg-[var(--theme-card-bg)]/60 border-[var(--theme-border)]"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`font-medium ${ink}`}>{item.title}</h3>
                        <span className={`text-xs ${muted}`}>{new Date(item.at).toLocaleTimeString()}</span>
                      </div>
                      <p className={`text-sm ${muted} mb-3 line-clamp-2`}>{item.message}</p>

                      <div className={`text-xs ${muted} mb-2`}>
                        Mode: <b>{item.mode}</b>
                        {item.mode === "branch" && (
                          <>
                            {" "}
                            • Branch: <b>{item.branch_id}</b>
                          </>
                        )}
                      </div>

                      {/* Chips for success/failure */}
                      <div className="flex flex-wrap gap-1">
                        {item.results.map((r, idx) => {
                          const palette = r.ok
                            ? {
                                bg: "var(--theme-components-tag-success-bg)",
                                text: "var(--theme-components-tag-success-text)",
                                border: "var(--theme-components-tag-success-border)",
                              }
                            : {
                                bg: "var(--theme-components-tag-error-bg)",
                                text: "var(--theme-components-tag-error-text)",
                                border: "var(--theme-components-tag-error-border)",
                              };
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                              style={{ background: palette.bg, color: palette.text, borderColor: palette.border }}
                              title={r.info || r.error || (r.ok ? "Success" : "Failed")}
                            >
                              {r.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                              {r.code}
                            </span>
                          );
                        })}
                      </div>

                      {/* Raw metrics line for quick debug */}
                      {item.metrics && (
                        <div className="mt-2 text-[11px] text-[var(--theme-text-muted)]">
                          metrics: {JSON.stringify(item.metrics)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
