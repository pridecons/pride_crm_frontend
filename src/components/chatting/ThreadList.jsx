"use client";
import React, { useMemo, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Avatar } from "./atoms";
import { clsx, humanTime } from "./utils";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

/* ----------------------------- helpers ----------------------------- */
// NEW: strict label = Today / Yesterday / YYYY-MM-DD (from API ISO)
function formatInboxTimeStrict(iso) {
  if (!iso) return "";

  const dt = new Date(iso);
  if (isNaN(dt)) {
    const [y, m, d] = String(iso).split("T")[0]?.split("-") ?? [];
    return d && m && y ? `${d}/${m}/${y}` : "";
  }

  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const mins  = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days  = Math.floor(diffMs / 86400000);

  if (mins < 60) {
    const m = Math.max(1, mins);
    return `${m} mins ago`;
  }
  if (hours < 24) {
    return "hour ago"; // as requested (no number)
  }
  if (days === 1) return "1 day ago";
  if (days === 2) return "2 day ago";

  const [y, m, d] = String(iso).split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

const toStr = (v) => (v == null ? "" : String(v));
const normalizeRoleKey = (r) => toStr(r).trim().toUpperCase().replace(/\s+/g, "_") || "";

const getBranchIdLike = (obj) => {
  if (!obj) return null;
  if (obj.branch_id != null) return String(obj.branch_id);
  if (obj.branchId != null) return String(obj.branchId);
  if (obj.branch && obj.branch.id != null) return String(obj.branch.id);
  return null;
};
const getRoleKeyLike = (obj) => {
  const r =
    obj?.role ??
    obj?.user_role ??
    obj?.role_name ??
    obj?.roleKey ??
    obj?.role_key ??
    obj?.roleType ??
    obj?.role_type;
  if (!r) return "";
  if (typeof r === "string") return normalizeRoleKey(r);
  return normalizeRoleKey(r?.key || r?.name || r?.role || r?.title);
};

const getEmpCode = (obj) => toStr(obj?.employee_code || obj?.code || obj?.id);

const ALWAYS_INCLUDE_ADMIN_CODES = new Set(["ADMIN001"]); // extend if needed

// Read unseen (unread) count strictly from API response: unseen_count
function getUnseen(t) {
  if (!t) return 0;
  let v = t.unseen_count;
  if (typeof v === "string") v = parseInt(v, 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function useCurrentUserRB() {
  const [state, setState] = useState({ role: null, branchId: null });

  useEffect(() => {
    try {
      const ui = Cookies.get("user_info");
      if (ui) {
        const obj = JSON.parse(ui);
        const role = normalizeRoleKey(obj?.role || obj?.user_role || obj?.role_name);
        const branchId = getBranchIdLike(obj);
        setState({ role, branchId });
        return;
      }
      const tok = Cookies.get("access_token");
      if (tok) {
        const p = jwtDecode(tok);
        const role = normalizeRoleKey(p?.role);
        const branchId = getBranchIdLike(p);
        setState({ role, branchId });
        return;
      }
    } catch {}
    setState({ role: null, branchId: null });
  }, []);

  return state; // {role, branchId}
}

export default function ThreadList({
  threads,
  users,
  selectedId,
  onSelectThread,
  onSelectUserAsPending,
  searchQuery,
  setSearchQuery,
  onOpenNewChat,
}) {
  const q = (searchQuery || "").toLowerCase();
  const { role, branchId } = useCurrentUserRB();
  const isSuperAdmin = normalizeRoleKey(role) === "SUPERADMIN";

  // Threads search
  const filteredThreads = useMemo(() => {
    if (!q) return threads || [];
    const safe = Array.isArray(threads) ? threads : [];
    return safe.filter((t) => (t?.name || "Direct Chat").toLowerCase().includes(q));
  }, [threads, q]);

  // Users search: SUPERADMIN sees all; others only same-branch users
  const filteredUsers = useMemo(() => {
    if (!q) return [];

    const base = Array.isArray(users) ? users : [];
    const queryHintsSuper = q.includes("super");
    const queryHintsAdmin = q.includes("admin");

    const byQuery = base.filter((u) => {
      const code = getEmpCode(u);
      const roleK = getRoleKeyLike(u);
      const phantom = [];

      if (ALWAYS_INCLUDE_ADMIN_CODES.has(String(code).toUpperCase())) {
        phantom.push("superadmin", "super admin", "admin", "admin001");
      }
      if (roleK === "SUPERADMIN" || u?.is_super_admin || u?.isSuperAdmin) {
        phantom.push("superadmin", "super admin");
      }

      const hay = [
        toStr(u.full_name || u.name),
        toStr(code),
        toStr(roleK),
        ...phantom,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        hay.includes(q) ||
        ((queryHintsSuper || queryHintsAdmin) &&
          (roleK === "SUPERADMIN" ||
            ALWAYS_INCLUDE_ADMIN_CODES.has(String(code).toUpperCase())))
      );
    });

    if (isSuperAdmin) return byQuery;

    const myBranch = branchId != null ? String(branchId) : null;
    if (!myBranch) {
      return byQuery.filter((u) => {
        const roleK = getRoleKeyLike(u);
        const code = getEmpCode(u).toUpperCase();
        return roleK === "SUPERADMIN" || ALWAYS_INCLUDE_ADMIN_CODES.has(code);
      });
    }

    return byQuery.filter((u) => {
      const roleK = getRoleKeyLike(u);
      const code = getEmpCode(u).toUpperCase();
      if (roleK === "SUPERADMIN" || ALWAYS_INCLUDE_ADMIN_CODES.has(code)) return true;
      const ub = getBranchIdLike(u);
      return ub != null && String(ub) === myBranch;
    });
  }, [users, q, isSuperAdmin, branchId]);

  // Reusable thread row (shows unread badge consistently)
  const ThreadRow = ({ thread }) => {
    const unread = getUnseen(thread);
    const isActive = String(selectedId) === String(thread.id);
    return (
      <button
        key={thread.id}
        onClick={() => onSelectThread(thread)}
        className={clsx(
          "w-full text-left px-3 py-2 transition-colors",
          isActive
            ? "bg-[var(--theme-primary-softer)]"
            : "hover:bg-[var(--theme-primary-softer)]"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <Avatar name={thread.name} id={String(thread.id)} size="lg" />
          </div>

          <div className="min-w-0 flex-1">
            {/* top row: name + time + unread */}
            <div className="flex items-start gap-3">
              <h5 className="text-[15px] font-semibold truncate text-[var(--theme-text)]">
                {thread.name || "Direct Chat"}
              </h5>

              <div className="ml-auto shrink-0 flex items-center gap-2">
                {/* time label */}
                <span className="text-[12px] italic font-medium text-[var(--theme-text-muted)]">
                  {formatInboxTimeStrict(thread.last_message_time)}
                </span>

                {/* unread badge */}
                {unread > 0 && (
                  <span
                    className="inline-flex items-center justify-center rounded-full text-[11px] font-semibold min-w-[22px] h-[22px] px-1.5"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                      color: "var(--theme-primary-contrast, #fff)",
                    }}
                  >
                    {unread}
                  </span>
                )}
              </div>
            </div>

            {/* snippet */}
            <p className="mt-0.5 text-[13px] truncate text-[var(--theme-text-muted)]">
              {thread.last_message || " "}
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      className="shrink-0 flex flex-col overflow-hidden min-h-0 border-r"
      style={{
        width: "315px",
        background: "var(--theme-surface)",
        borderColor: "var(--theme-border)",
        color: "var(--theme-text)",
      }}
    >
      {/* Sticky head */}
      <div
        className="sticky top-0 z-10 border-b px-5 py-3"
        style={{
          background: "var(--theme-card-bg)",
          borderColor: "var(--theme-border)",
        }}
      >
        <div className="flex items-center">
          <h4
            className="text-[20px] font-semibold flex-1"
            style={{ color: "var(--theme-primary)" }}
          >
            Recent Chats
          </h4>
          <button
            onClick={onOpenNewChat}
            className="ml-3 inline-flex items-center justify-center h-9 w-9 rounded-full transition-colors"
            title="New Group"
            aria-label="New Group"
            style={{
              color: "var(--theme-text)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--theme-primary-softer)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--theme-text-muted)" }}
          />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-2xl focus:outline-none text-sm"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "var(--theme-input-background, var(--theme-surface))",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-text)",
              boxShadow: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in oklab, var(--theme-primary) 30%, transparent)")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          />
        </div>
      </div>

      {/* Inbox list */}
      <div className="flex-1 overflow-y-auto">
        {q ? (
          <>
            {filteredThreads.map((t) => (
              <ThreadRow key={`thread-${t.id}`} thread={t} />
            ))}

            {filteredUsers.map((user) => {
              const roleK = getRoleKeyLike(user);
              const code = getEmpCode(user);
              const displayName =
                roleK === "SUPERADMIN" ? "SuperAdmin" : (user.full_name || user.name || code);

              return (
                <button
                  key={`user-${code}`}
                  onClick={() => onSelectUserAsPending(user)}
                  className="w-full text-left px-4 py-3 border-b transition-colors"
                  style={{
                    borderColor: "var(--theme-border)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--theme-primary-softer)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="flex">
                    <div className="w-[44px] pt-1">
                      <Avatar name={displayName} id={code} size="lg" />
                    </div>
                    <div className="pl-4 min-w-0 flex-1">
                      <h5 className="text-[15px] font-semibold mb-1 truncate" style={{ color: "var(--theme-text)" }}>
                        {displayName}
                      </h5>
                      <p className="text-[13px] truncate" style={{ color: "var(--theme-text-muted)" }}>
                        {code}
                        {roleK === "SUPERADMIN" ? (
                          <span className="ml-2 text-[11px]" style={{ color: "var(--theme-text-muted)" }}>
                            · All branches
                          </span>
                        ) : (
                          user.branch_id != null && (
                            <span className="ml-2 text-[11px]" style={{ color: "var(--theme-text-muted)" }}>
                              · B{String(user.branch_id)}
                            </span>
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        ) : (
          (threads || []).map((t) => <ThreadRow key={t.id} thread={t} />)
        )}
      </div>
    </div>
  );
}
