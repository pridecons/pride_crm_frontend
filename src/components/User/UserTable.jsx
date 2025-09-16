"use client";

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { User, Phone, Mail, Edit, Trash2, Eye } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import { ErrorHandling } from "@/helper/ErrorHandling";

/* ---------- dynamic role helpers (API + cache) ---------- */
const canonRole = (s) => {
  if (!s) return "";
  let x = String(s).trim().toUpperCase().replace(/\s+/g, "_");
  if (x === "SUPER_ADMINISTRATOR") x = "SUPERADMIN";
  return x;
};

function buildRoleMap(list) {
  const out = {};
  (Array.isArray(list) ? list : []).forEach((r) => {
    const id = r?.id != null ? String(r.id) : "";
    const key = canonRole(r?.name);
    if (id && key) out[id] = key;
  });
  return out;
}

async function loadRoleMap() {
  try {
    const cached = JSON.parse(localStorage.getItem("roleMap") || "{}");
    if (cached && typeof cached === "object" && Object.keys(cached).length) {
      return cached;
    }
  } catch {}

  try {
    const res = await axiosInstance.get("/profile-role/", {
      params: { skip: 0, limit: 100, order_by: "hierarchy_level" },
    });
    const map = buildRoleMap(res?.data);
    if (Object.keys(map).length) localStorage.setItem("roleMap", JSON.stringify(map));
    return map;
  } catch {
    return {};
  }
}

function getEffectiveRole({ accessToken, userInfo, roleMap = {} }) {
  try {
    if (accessToken) {
      const d = jwtDecode(accessToken) || {};
      const jwtRole =
        d.role_name || d.role || d.profile_role?.name || d.user?.role_name || d.user?.role || "";
      const r1 = canonRole(jwtRole);
      if (r1) return r1;

      const jwtRoleId = d.role_id ?? d.user?.role_id ?? d.profile_role?.id ?? null;
      if (jwtRoleId != null) {
        const mapped = roleMap[String(jwtRoleId)];
        if (mapped) return mapped;
      }
    }
  } catch {}

  if (userInfo) {
    const uiRole =
      userInfo.role_name ||
      userInfo.role ||
      userInfo.profile_role?.name ||
      userInfo.user?.role_name ||
      userInfo.user?.role ||
      "";
    const r3 = canonRole(uiRole);
    if (r3) return r3;

    const uiRoleId =
      userInfo.role_id ?? userInfo.user?.role_id ?? userInfo.profile_role?.id ?? null;
    if (uiRoleId != null) {
      const mapped = roleMap[String(uiRoleId)];
      if (mapped) return mapped;
    }
  }
  return "";
}

function useRoleKey() {
  const [roleKey, setRoleKey] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ck = Cookies.get("role_key");
        if (ck) {
          if (alive) setRoleKey(canonRole(ck));
          return;
        }

        const roleMap = await loadRoleMap();
        const token = Cookies.get("access_token");
        const uiRaw = Cookies.get("user_info");
        const userInfo = uiRaw ? JSON.parse(uiRaw) : null;
        const computed = getEffectiveRole({ accessToken: token, userInfo, roleMap });
        if (alive) setRoleKey(computed);
      } catch {
        if (alive) setRoleKey("");
      }
    })();
    return () => { alive = false; };
  }, []);

  return roleKey;
}

const canon = (s) => String(s || "").toUpperCase().trim();

// ✨ add this helper near the top
const inr = (n) =>
  n == null || n === ""
    ? "—"
    : new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

function useRoleBranch() {
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const roleKey = useRoleKey(); // ← dynamic canonical key (e.g., SUPERADMIN)

  useEffect(() => {
    try {
      const uiRaw = Cookies.get("user_info");
      let b = null;

      if (uiRaw) {
        const ui = JSON.parse(uiRaw);
        b =
          ui?.branch_id ??
          ui?.user?.branch_id ??
          ui?.branch?.id ??
          ui?.user?.branch?.id ??
          null;
      } else {
        const token = Cookies.get("access_token");
        if (token) {
          const p = jwtDecode(token);
          b = p?.branch_id ?? p?.user?.branch_id ?? null;
        }
      }

      setRole(roleKey || null);                  // store canonical key in state if needed elsewhere
      setBranchId(b != null ? String(b) : null);
    } catch (e) {
      console.error("role/branch decode failed", e);
    }
  }, [roleKey]);

  const isSuperAdmin = roleKey === "SUPERADMIN";

  return { role: roleKey, branchId, isSuperAdmin };
}

export default function UserTable({
  users = [],
  branchMap = {},
  onEdit,
  onDetails,
  refreshUsers,
  codeToName = {},
}) {
  const { isSuperAdmin, branchId } = useRoleBranch();

  // ---- visible users (branch filtered for non-superadmin) ----
  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) return users;
    if (!branchId) return users;
    return users.filter((u) => String(u.branch_id) === String(branchId));
  }, [users, isSuperAdmin, branchId]);

  // ---- pagination (20 per page) ----
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const total = visibleUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const pagedUsers = useMemo(
    () => visibleUsers.slice(startIdx, endIdx),
    [visibleUsers, startIdx, endIdx]
  );

  // clamp page if data size shrinks/expands
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const goTo = (p) => setPage((prev) => Math.min(Math.max(1, p), totalPages));
  const prevPage = () => goTo(page - 1);
  const nextPage = () => goTo(page + 1);

  const getRoleColorClass = (roleName) => {
  const key = canonRole(roleName); // normalize to SUPERADMIN / BRANCH_MANAGER / ...
  const roleColors = {
    SUPERADMIN: "text-blue-800",
    BRANCH_MANAGER: "text-red-700",
    SALES_MANAGER: "text-green-800",
    HR: "text-pink-800",
    TL: "text-yellow-800",
    SBA: "text-indigo-800",
    BA: "text-gray-800",
  };
  return roleColors[key] || "bg-gray-100 text-gray-700 border border-gray-200";
};

  const handleDelete = async (employeeCode) => {
    if (!confirm(`Are you sure you want to deactivate user ${employeeCode}?`)) return;
    try {
      const res = await axiosInstance.delete(`/users/${employeeCode}`);
      toast.success(res.data.message || `User ${employeeCode} deactivated successfully`);
      refreshUsers?.();
    } catch (error) {
      console.error(error);
      ErrorHandling({ error: error, defaultError: "Failed to deactivate user" });
    }
  };

  // NEW: derive senior label from possible fields
  const getSeniorLabel = (u) => {
    // If API already gives a nested profile with name, prefer it.
    const byObject =
      u?.senior_profile?.name ||
      u?.reporting_profile?.name ||
      u?.senior_profile_name ||
      u?.reporting_profile_name;

    if (byObject) return byObject;

    // Otherwise, many rows only have an employee_code in senior_profile_id.
    const code =
      u?.senior_profile_id ||
      u?.reporting_profile_id ||
      u?.senior_employee_code ||
      null;

    if (!code) return "—";

    // Look up name via the code→name map we built from /users
    const name = codeToName[String(code)];
    return name || "—";
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200">
      {/* Outer wrapper keeps horizontal scroll; inner wrapper scrolls vertically so header can stick */}
      <div className="overflow-x-auto">
        <div className="relative max-h-[70vh] overflow-y-auto">
          <table className="table-fixed w-full text-sm text-gray-700">
            <thead className="bg-gray-100 border-b sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="w-12 px-5 py-4 text-left font-semibold">#</th>
                <th className="w-56 px-5 py-4 text-left font-semibold">Name</th>
                <th className="w-40 px-5 py-4 text-left font-semibold">Role</th>
                <th className="w-48 px-5 py-4 text-left font-semibold">Reporting</th>
                <th className="w-48 px-5 py-4 text-left font-semibold">Target</th>
                <th className="w-40 px-5 py-4 text-left font-semibold">Branch</th>
                <th className="w-44 px-5 py-4 text-left font-semibold">Phone</th>
                <th className="w-64 px-5 py-4 text-left font-semibold">Email</th>
                <th className="w-28 px-5 py-4 text-left font-semibold">Status</th>
                <th className="w-36 px-5 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {pagedUsers.length > 0 ? (
                pagedUsers.map((u, idx) => {
                  // Prefer profile_role.name → fallback to role → fallback to role_id
                  const roleName =
                    u.profile_role?.name ||
                    u.role_name ||
                    u.role ||
                    "Unknown";

                  const serial = startIdx + idx + 1;

                  return (
                    <tr key={u.employee_code} className="hover:bg-gray-50 transition duration-200 ease-in-out">
                      <td className="px-5 py-4">{serial}</td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 flex items-center justify-center rounded-full">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-800 truncate">{u.name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`py-0.5 rounded-full text-xs font-semibold ${getRoleColorClass(roleName)}`}>
                          {roleName}
                        </span>
                      </td>

                      <td className="px-5 py-4 truncate">{getSeniorLabel(u)}</td>
                      <td className="px-5 py-4 truncate">{inr(u.target)}</td>

                      <td className="px-5 py-4 truncate">{branchMap[u.branch_id] || "—"}</td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {u.phone_number}
                        </div>
                      </td>

                      <td className="px-5 py-4 truncate max-w-[240px]">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${u.is_active
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                            }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center gap-3">
                          {onDetails && (
                            <button
                              onClick={() => onDetails(u)}
                              className="p-2 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {onEdit && (
                            <button
                              onClick={() => onEdit(u)}
                              className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(u.employee_code)}
                            className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
                            title="Deactivate User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="px-5 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: results summary + pagination */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-sm text-gray-700 flex items-center justify-between flex-wrap gap-3">
        <div>
          {total > 0
            ? `Showing ${startIdx + 1}–${endIdx} of ${total} users`
            : "Showing 0 users"}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={page === 1}
            className={`px-3 h-9 rounded-lg border ${page === 1
                ? "text-gray-400 border-gray-200 cursor-not-allowed bg-white"
                : "text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            aria-label="Previous page"
          >
            Prev
          </button>

          {/* Compact numeric pages (show up to 5 around current) */}
          {Array.from({ length: totalPages }).map((_, i) => i + 1)
            .filter((p) => {
              // Keep first & last; window of 2 around current
              return p === 1 || p === totalPages || Math.abs(p - page) <= 2;
            })
            .reduce((acc, p, idx, arr) => {
              // insert ellipses when gaps
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("ellipsis");
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-1 text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => goTo(item)}
                  className={`min-w-9 h-9 px-3 rounded-lg border ${item === page
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={nextPage}
            disabled={page === totalPages}
            className={`px-3 h-9 rounded-lg border ${page === totalPages
                ? "text-gray-400 border-gray-200 cursor-not-allowed bg-white"
                : "text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

UserTable.propTypes = {
  users: PropTypes.array.isRequired,
  branchMap: PropTypes.object,
  onEdit: PropTypes.func,
  onDetails: PropTypes.func,
  refreshUsers: PropTypes.func,
  codeToName: PropTypes.object,
};
