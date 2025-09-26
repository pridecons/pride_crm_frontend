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
    // fall back to API date -> dd/mm/yyyy
    const [y, m, d] = String(iso).split("T")[0]?.split("-") ?? [];
    return d && m && y ? `${d}/${m}/${y}` : "";
  }

  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const mins  = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days  = Math.floor(diffMs / 86400000);

  if (mins < 60) {
    const m = Math.max(1, mins);            // avoid "0 mins"
    return `${m} mins ago`;
  }
  if (hours < 24) {
    return "hour ago";                       // as requested (no number)
  }
  if (days === 1) return "1 day ago";
  if (days === 2) return "2 day ago";

  // otherwise show dd/mm/yyyy from API date part
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
  // possible shapes:
  // "SUPERADMIN" | "Super Admin" |  {key:"SUPERADMIN"} | {name:"SUPERADMIN"} | {role:"SUPERADMIN"} | {title:"SUPERADMIN"}
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
    } catch { }
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

      // make sure typing "super" or "admin" still matches the superadmin account
      if (ALWAYS_INCLUDE_ADMIN_CODES.has(String(code).toUpperCase())) {
        phantom.push("superadmin", "super admin", "admin", "admin001");
      }
      if (roleK === "SUPERADMIN" || u?.is_super_admin || u?.isSuperAdmin) {
        phantom.push("superadmin", "super admin");
      }

      const hay = [
        toStr(u.full_name || u.name),
        toStr(code),
        toStr(roleK),       // e.g. "SUPERADMIN"
        ...phantom,         // extra hints
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // normal match OR explicit hint match ("super"/"admin")
      return (
        hay.includes(q) ||
        ((queryHintsSuper || queryHintsAdmin) &&
          (roleK === "SUPERADMIN" ||
            ALWAYS_INCLUDE_ADMIN_CODES.has(String(code).toUpperCase())))
      );
    });

    if (isSuperAdmin) return byQuery;

    // non-superadmins: same branch, but ALWAYS include superadmin/admin001
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
  return (
    <button
      key={thread.id}
      onClick={() => onSelectThread(thread)}
      className={clsx(
        "w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50",
        "transition-colors"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Avatar name={thread.name} id={String(thread.id)} size="lg" />
        </div>

        <div className="min-w-0 flex-1">
          {/* top row: name + green weekday */}
          <div className="flex items-start gap-3">
            <h5 className="text-[15px] text-gray-900 font-semibold truncate">
              {thread.name || "Direct Chat"}
            </h5>

            <div className="ml-auto shrink-0 flex items-center gap-2">
              {/* time label in green */}
              <span className="text-[12px] text-[#0f766e] font-medium italic">
                {formatInboxTimeStrict(thread.last_message_time)}
              </span>

              {/* unread badge (green circle) */}
              {unread > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-[#0f766e] text-white text-[11px] font-semibold min-w-[22px] h-[22px] px-1.5">
                  {unread}
                </span>
              )}
            </div>
          </div>

          {/* snippet */}
          <p className="mt-0.5 text-[13px] text-gray-600 truncate">
            {thread.last_message || " "}
          </p>
        </div>
      </div>
    </button>
  );
};

  return (
    <div
      className="shrink-0 border-r border-gray-200 bg-[#f8fafc] flex flex-col overflow-hidden min-h-0"
      style={{ width: "315px" }}
    >
      {/* Sticky head */}
      <div className="sticky top-0 z-10 bg-[#f8fafc] border-b border-gray-200 px-5 py-3">
        <div className="flex items-center">
          <h4 className="text-[#0f766e] text-[20px] font-semibold flex-1">Recent Chats</h4>
          <button
            onClick={onOpenNewChat}
            className="ml-3 inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-200 text-gray-700"
            title="New Group"
            aria-label="New Group"
          >
            <Plus size={18} />
          </button>
        </div>
        {/* Search */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-white/80 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-sm"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  className="w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-100/80"
                >
                  <div className="flex">
                    <div className="w-[44px] pt-1">
                      <Avatar name={displayName} id={code} size="lg" />
                    </div>
                    <div className="pl-4 min-w-0 flex-1">
                      <h5 className="text-[15px] text-[#374151] font-semibold mb-1 truncate">
                        {displayName}
                      </h5>
                      <p className="text-[13px] text-[#6b7280] truncate">
                        {code}
                        {roleK === "SUPERADMIN" ? (
                          <span className="ml-2 text-[11px] text-gray-500">· All branches</span>
                        ) : (
                          user.branch_id != null && (
                            <span className="ml-2 text-[11px] text-gray-500">
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
