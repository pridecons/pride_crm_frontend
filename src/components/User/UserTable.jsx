"use client";

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { User, Phone, Mail, Edit, Trash2, Eye } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
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

    const uiRoleId = userInfo.role_id ?? userInfo.user?.role_id ?? userInfo.profile_role?.id ?? null;
    if (uiRoleId != null) {
      const mapped = roleMap[String(uiRoleId)];
      if (mapped) return mapped;
    }
  }
  return "";
}

function useViewerIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  useEffect(() => {
    try {
      const uiRaw = Cookies.get("user_info");
      let role = uiRaw ? (JSON.parse(uiRaw)?.role_name || JSON.parse(uiRaw)?.role || "") : "";
      if (!role) {
        const tok = Cookies.get("access_token");
        if (tok) {
          const p = jwtDecode(tok);
          role = p?.role_name || p?.role || "";
        }
      }
      const key = (role || "").toString().toUpperCase().replace(/\s+/g, "_");
      setIsSuperAdmin(key === "SUPERADMIN" || key === "SUPER_ADMINISTRATOR");
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);
  return isSuperAdmin;
}

// Currency formatter (INR)
const inr = (n) =>
  n == null || n === ""
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(n));

export default function UserTable({
  users = [],
  branchMap = {},
  onEdit,
  onDetails,
  refreshUsers,
  pagination, // { page, totalPages, total, limit }
  onPrev,
  onNext,
  goToPage,
  loading,
}) {
  // Show Branch column only for SUPERADMIN
  const isSuperAdmin = useViewerIsSuperAdmin();
  const showBranchCol = isSuperAdmin;
  const COLS = showBranchCol ? 10 : 9; // total columns for colSpan

  const p = pagination || {};
  const page = Number(p.page || 1);
  const limit = Number(p.limit || users.length || 1);
  const skip = Number(p.skip || (page - 1) * limit);
  const reportedTotal = Number.isFinite(p.total) ? Number(p.total) : NaN;
  const effectiveTotal = reportedTotal > 0 ? reportedTotal : users.length;
  const totalPages = Number(
    p.totalPages || p.pages || Math.max(1, Math.ceil(effectiveTotal / (limit || 1)))
  );
  const startIdx = effectiveTotal ? skip : 0;
  const endIdx = effectiveTotal ? Math.min(skip + users.length, effectiveTotal) : 0;

  // Role badge colors via theme tokens
  const getRoleColorClass = (roleName) => {
    const key = canonRole(roleName);
    const base =
      "px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150";
    const roleColors = {
      SUPERADMIN:
        "bg-[var(--theme-primary-softer)] text-[var(--theme-primary)] border-[var(--theme-primary)]/30",
      BRANCH_MANAGER:
        "bg-[var(--theme-warning-soft,rgba(250,204,21,.15))] text-[var(--theme-warning,#ca8a04)] border-[var(--theme-warning,#ca8a04)]/30",
      SALES_MANAGER:
        "bg-[var(--theme-success-soft,rgba(16,185,129,.12))] text-[var(--theme-success,#10b981)] border-[var(--theme-success,#10b981)]/30",
      HR:
        "bg-[var(--theme-info-soft,rgba(59,130,246,.12))] text-[var(--theme-info,#3b82f6)] border-[var(--theme-info,#3b82f6)]/30",
      TL:
        "bg-[var(--theme-accent-soft,rgba(139,92,246,.12))] text-[var(--theme-accent,#8b5cf6)] border-[var(--theme-accent,#8b5cf6)]/30",
      SBA:
        "bg-[var(--theme-secondary-soft,rgba(99,102,241,.12))] text-[var(--theme-secondary,#6366f1)] border-[var(--theme-secondary,#6366f1)]/30",
      BA:
        "bg-[var(--theme-neutral-soft,rgba(107,114,128,.12))] text-[var(--theme-text)] border-[var(--theme-border)]",
    };
    return `${base} ${roleColors[key] || roleColors.BA}`;
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

  return (
    <div
      className="rounded-2xl shadow-md border"
      style={{
        background: "var(--theme-card-bg)",
        borderColor: "var(--theme-border)",
        color: "var(--theme-text)",
      }}
    >
      {/* Outer wrapper keeps horizontal scroll; inner wrapper scrolls vertically so header can stick */}
      <div className="overflow-x-auto">
        <div className="relative max-h-[70vh] overflow-y-auto">
          <table className="table-fixed w-full text-sm">
            <thead
              className="border-b sticky top-0 z-20 shadow-sm"
              style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
            >
              <tr className="text-[var(--theme-text)]">
                <th className="w-12 px-5 py-4 text-left font-semibold">#</th>
                <th className="w-56 px-5 py-4 text-left font-semibold">Name</th>
                <th className="w-40 px-5 py-4 text-left font-semibold">Role</th>
                <th className="w-48 px-5 py-4 text-left font-semibold">Reporting</th>
                <th className="w-48 px-5 py-4 text-left font-semibold">Target</th>
                {showBranchCol && (
                  <th className="w-40 px-5 py-4 text-left font-semibold">Branch</th>
                )}
                <th className="w-44 px-5 py-4 text-left font-semibold">Phone</th>
                <th className="w-64 px-5 py-4 text-left font-semibold">Email</th>
                <th className="w-28 px-5 py-4 text-left font-semibold">Status</th>
                <th className="w-36 px-5 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: "var(--theme-border)" }}>
              {loading ? (
                <tr>
                  <td
                    colSpan={COLS}
                    className="px-5 py-8 text-center"
                    style={{ color: "var(--theme-text-muted)" }}
                  >
                    Loading…
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u, idx) => {
                  // Prefer profile_role.name → fallback to role → fallback to role_id
                  const roleName = u.profile_role?.name || u.role_name || u.role || "Unknown";
                  const serial = startIdx + idx + 1;

                  return (
                    <tr
                      key={u.employee_code}
                      className="transition duration-200 ease-in-out"
                      style={{ background: "transparent" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--theme-primary-softer)")
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-4">{serial}</td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 flex items-center justify-center rounded-full"
                            style={{ background: "var(--theme-primary-softer)" }}
                          >
                            <User className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
                          </div>
                          <span className="font-medium truncate">{u.name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={getRoleColorClass(roleName)}>{roleName}</span>
                      </td>

                      <td className="px-5 py-4 truncate">
                        {u?.senior_profile_name ||
                          u?.reporting_profile_name ||
                          u?.senior_profile?.name ||
                          u?.reporting_profile?.name ||
                          "—"}
                      </td>
                      <td className="px-5 py-4 truncate">{inr(u.target)}</td>

                      {showBranchCol && (
                        <td className="px-5 py-4 truncate">{branchMap[u.branch_id] || "—"}</td>
                      )}

                      <td className="px-5 py-4">
                        <div
                          className="flex items-center gap-2"
                          style={{ color: "var(--theme-text)" }}
                        >
                          <Phone className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
                          {u.phone_number}
                        </div>
                      </td>

                      <td className="px-5 py-4 truncate max-w-[240px]">
                        <div
                          className="flex items-center gap-2"
                          style={{ color: "var(--theme-text)" }}
                        >
                          <Mail className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
                          <span className="truncate">{u.email}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border`}
                          style={
                            u.is_active
                              ? {
                                  background: "var(--theme-success-soft, rgba(16,185,129,.12))",
                                  color: "var(--theme-success, #10b981)",
                                  borderColor: "color-mix(in oklab, var(--theme-success) 35%, transparent)",
                                }
                              : {
                                  background: "var(--theme-danger-soft, rgba(239,68,68,.12))",
                                  color: "var(--theme-danger, #ef4444)",
                                  borderColor: "color-mix(in oklab, var(--theme-danger) 35%, transparent)",
                                }
                          }
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center gap-3">
                          {onDetails && (
                            <button
                              onClick={() => onDetails(u)}
                              className="p-2 rounded-full transition border"
                              title="View Details"
                              style={{
                                background: "var(--theme-secondary-soft, rgba(99,102,241,.12))",
                                color: "var(--theme-secondary, #6366f1)",
                                borderColor:
                                  "color-mix(in oklab, var(--theme-secondary, #6366f1) 30%, transparent)",
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {onEdit && (
                            <button
                              onClick={() => onEdit(u)}
                              className="p-2 rounded-full transition border"
                              title="Edit User"
                              style={{
                                background: "var(--theme-primary-softer)",
                                color: "var(--theme-primary)",
                                borderColor:
                                  "color-mix(in oklab, var(--theme-primary) 30%, transparent)",
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(u.employee_code)}
                            className="p-2 rounded-full transition border"
                            title="Deactivate User"
                            style={{
                              background: "var(--theme-danger-soft, rgba(239,68,68,.12))",
                              color: "var(--theme-danger, #ef4444)",
                              borderColor:
                                "color-mix(in oklab, var(--theme-danger, #ef4444) 30%, transparent)",
                            }}
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
                  <td
                    colSpan={COLS}
                    className="px-5 py-8 text-center"
                    style={{ color: "var(--theme-text-muted)" }}
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: results summary + pagination */}
      <div
        className="px-6 py-4 text-sm flex items-center justify-between flex-wrap gap-3 border-t"
        style={{
          background: "var(--theme-surface)",
          borderColor: "var(--theme-border)",
          color: "var(--theme-text)",
        }}
      >
        <div>
          {effectiveTotal > 0
            ? `Showing ${users.length ? startIdx + 1 : 0}–${endIdx} of ${effectiveTotal} users`
            : "Showing 0 users"}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={page === 1}
            className="px-3 h-9 rounded-lg border transition"
            aria-label="Previous page"
            style={{
              color:
                page === 1 ? "var(--theme-text-muted)" : "var(--theme-text)",
              borderColor: "var(--theme-border)",
              background: "var(--theme-card-bg)",
              opacity: page === 1 ? 0.6 : 1,
            }}
          >
            Prev
          </button>

          {/* Compact numeric pages (show up to 5 around current) */}
          {Array.from({ length: totalPages })
            .map((_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "…" ? (
                <span key={`e-${idx}`} style={{ color: "var(--theme-text-muted)" }}>
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => goToPage(item)}
                  className="min-w-9 h-9 px-3 rounded-lg border transition"
                  aria-current={item === page ? "page" : undefined}
                  style={{
                    background:
                      item === page ? "var(--theme-primary)" : "var(--theme-card-bg)",
                    color:
                      item === page
                        ? "var(--theme-primary-contrast)"
                        : "var(--theme-text)",
                    borderColor:
                      item === page
                        ? "var(--theme-primary)"
                        : "var(--theme-border)",
                  }}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={onNext}
            disabled={page === totalPages}
            className="px-3 h-9 rounded-lg border transition"
            aria-label="Next page"
            style={{
              color:
                page === totalPages ? "var(--theme-text-muted)" : "var(--theme-text)",
              borderColor: "var(--theme-border)",
              background: "var(--theme-card-bg)",
              opacity: page === totalPages ? 0.6 : 1,
            }}
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
};
