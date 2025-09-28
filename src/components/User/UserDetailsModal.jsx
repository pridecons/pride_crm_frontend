"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Shield,
  Phone,
  User as UserIcon,
  Building2,
  KeyRound,
  IdCard,
  Clock,
} from "lucide-react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

/* --------------------------- role helpers --------------------------- */
const normalizeRoleKey = (r) =>
  (r || "").toString().trim().toUpperCase().replace(/\s+/g, "_");

const toDisplayRole = (raw) => {
  const key = normalizeRoleKey(raw);
  if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
  if (key === "COMPLIANCE_OFFICER") return "COMPLIANCE OFFICER";
  return key; // SUPERADMIN, HR, SALES_MANAGER, TL, SBA, BA, RESEARCHER, etc.
};

/* Determine if the *viewer* is SUPERADMIN */
function useViewerIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  useEffect(() => {
    try {
      const uiRaw = Cookies.get("user_info");
      let role = "";
      if (uiRaw) {
        const ui = JSON.parse(uiRaw);
        role =
          ui?.role_name ||
          ui?.role ||
          ui?.user?.role_name ||
          ui?.user?.role ||
          ui?.profile_role?.name ||
          "";
      } else {
        const token = Cookies.get("access_token");
        if (token) {
          const p = jwtDecode(token) || {};
          role =
            p?.role_name || p?.role || p?.profile_role?.name || p?.user?.role || "";
        }
      }
      const key = normalizeRoleKey(role);
      setIsSuperAdmin(key === "SUPERADMIN" || key === "SUPER_ADMINISTRATOR");
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);
  return isSuperAdmin;
}

/* ----------------------------- ui utils ---------------------------- */
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString();
}

function DetailField({ label, value }) {
  return (
    <div>
      <h4 className="text-sm font-semibold" style={{ color: "var(--theme-text)" }}>
        {label}
      </h4>
      <p className="break-words" style={{ color: "var(--theme-text-muted)" }}>
        {value ?? "—"}
      </p>
    </div>
  );
}

/* =========================== Component ============================== */
export default function UserDetailsModal({
  isOpen,
  onClose,
  user,
  branchMap,
  roleMap: roleMapProp = {},
}) {
  const [showAllPerms, setShowAllPerms] = useState(false);
  const viewerIsSuperAdmin = useViewerIsSuperAdmin();

  const roleName = useMemo(() => {
    if (!user) return "—";
    const direct = user?.profile_role?.name || user?.role_name || user?.role || "";
    if (direct) return toDisplayRole(direct);
    const mapped = roleMapProp?.[String(user.role_id ?? "")];
    return mapped || "Unknown";
  }, [user, roleMapProp]);

  if (!isOpen || !user) return null;

  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const visiblePerms = showAllPerms ? perms : perms.slice(0, 24);

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
      {/* Backdrop uses themed overlay */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{
          background:
            "var(--theme-components-modal-overlay, var(--theme-backdrop, rgba(0,0,0,.45)))",
        }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-auto rounded-2xl shadow-2xl"
        style={{
          background: "var(--theme-card-bg, var(--theme-card))",
          border: "1px solid var(--theme-border)",
          boxShadow:
            "0 18px 50px var(--theme-components-card-shadow, rgba(0,0,0,0.18))",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{
            background:
              "var(--theme-components-modal-header-bg, var(--theme-components-modal-headerBg, var(--theme-primary-softer)))",
            borderBottom: "1px solid var(--theme-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-full p-2"
              style={{
                background: "var(--theme-primary-soft)",
                border: "1px solid var(--theme-border)",
              }}
            >
              <UserIcon
                className="w-5 h-5"
                style={{ color: "var(--theme-primary)" }}
              />
            </div>
            <div>
              <h3
                className="text-xl font-semibold"
                style={{ color: "var(--theme-text)" }}
              >
                {user.name || "User Details"}
              </h3>
              <p
                className="text-sm"
                style={{ color: "var(--theme-text-muted)" }}
              >
                {roleName} • {user.employee_code}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: user.is_active
                  ? "var(--theme-components-tag-success-bg, rgba(34,197,94,.10))"
                  : "var(--theme-components-tag-error-bg, rgba(239,68,68,.10))",
                color: user.is_active
                  ? "var(--theme-success)"
                  : "var(--theme-error)",
                border: `1px solid ${
                  user.is_active
                    ? "var(--theme-components-tag-success-border, rgba(34,197,94,.35))"
                    : "var(--theme-components-tag-error-border, rgba(239,68,68,.35))"
                }`,
              }}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg transition"
              title="Close"
              style={{ color: "var(--theme-text)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--theme-primary-softer)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Top quick info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Employee Code" value={user.employee_code} />
            <DetailField label="Role" value={roleName} />
            {viewerIsSuperAdmin && (
              <DetailField label="Branch" value={branchMap?.[user.branch_id] || "—"} />
            )}
            <DetailField label="Reporting" value={user.senior_profile_id || "—"} />
          </div>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
              <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
                Contact
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Phone" value={user.phone_number} />
              <DetailField label="Email" value={user.email} />
              <DetailField label="Father's Name" value={user.father_name} />
              <DetailField
                label="Experience"
                value={
                  user.experience != null ? `${user.experience} year(s)` : "—"
                }
              />
            </div>
          </section>

          {/* Personal / Employment */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <IdCard
                className="w-4 h-4"
                style={{ color: "var(--theme-text-muted)" }}
              />
              <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
                Personal & Employment
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Date of Birth" value={formatDate(user.date_of_birth)} />
              <DetailField
                label="Date of Joining"
                value={formatDate(user.date_of_joining)}
              />
              <DetailField label="PAN" value={user.pan || "—"} />
              <DetailField label="Aadhaar" value={user.aadhaar || "—"} />
            </div>
          </section>

          {/* Address */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2
                className="w-4 h-4"
                style={{ color: "var(--theme-text-muted)" }}
              />
              <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
                Address
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Address" value={user.address} />
              <DetailField label="City" value={user.city} />
              <DetailField label="State" value={user.state} />
              <DetailField label="Pincode" value={user.pincode} />
            </div>
          </section>

          {/* VBC / Telephony */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound
                className="w-4 h-4"
                style={{ color: "var(--theme-text-muted)" }}
              />
              <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
                VBC / Telephony
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="VBC Extension ID" value={user.vbc_extension_id} />
              <DetailField label="VBC Username" value={user.vbc_user_username} />
              <DetailField label="VBC Password" value={user.vbc_user_password} />
            </div>
          </section>

          {/* Permissions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield
                  className="w-4 h-4"
                  style={{ color: "var(--theme-text-muted)" }}
                />
                <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
                  Permissions
                </h4>
              </div>
              {perms.length > 24 && (
                <button
                  onClick={() => setShowAllPerms((s) => !s)}
                  className="text-sm"
                  style={{ color: "var(--theme-primary)" }}
                >
                  {showAllPerms ? "Show less" : `Show all (${perms.length})`}
                </button>
              )}
            </div>
            {perms.length ? (
              <div className="flex flex-wrap gap-2">
                {visiblePerms.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-full text-xs"
                    style={{
                      background:
                        "var(--theme-components-tag-info-bg, rgba(59,130,246,.10))",
                      color: "var(--theme-primary)",
                      border:
                        "1px solid var(--theme-components-tag-info-border, rgba(59,130,246,.35))",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
                No permissions assigned.
              </p>
            )}
          </section>

          {/* Comments */}
          {user.comment ? (
            <section>
              <h4 className="font-semibold mb-1" style={{ color: "var(--theme-text)" }}>
                Comment
              </h4>
              <p
                className="whitespace-pre-wrap"
                style={{ color: "var(--theme-text-muted)" }}
              >
                {user.comment}
              </p>
            </section>
          ) : null}

          {/* Meta / Timestamps */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock
                className="w-4 h-4"
                style={{ color: "var(--theme-text-muted)" }}
              />
              <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
                Meta
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Role ID" value={user.role_id} />
              {viewerIsSuperAdmin && (
                <DetailField label="Branch ID" value={user.branch_id ?? "—"} />
              )}
              <DetailField label="Created At" value={formatDate(user.created_at)} />
              <DetailField label="Updated At" value={formatDate(user.updated_at)} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end"
          style={{
            background: "var(--theme-surface)",
            borderTop: "1px solid var(--theme-border)",
          }}
        >
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2 font-medium"
            style={{
              color: "var(--theme-text)",
              background: "var(--theme-components-button-secondary-bg, var(--theme-surface))",
              border: "1px solid var(--theme-components-button-secondary-border, var(--theme-border))",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "var(--theme-components-button-secondary-hover-bg, var(--theme-primary-softer))")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                "var(--theme-components-button-secondary-bg, var(--theme-surface))")
            }
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
