"use client";

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
  User as UserIcon,
  Phone,
  Mail,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Shield,
  Building2,
  KeyRound,
  IdCard,
  Clock,
} from "lucide-react";

/* --------------------------- role helpers --------------------------- */
const canonRole = (s) => {
  if (!s) return "";
  let x = String(s).trim().toUpperCase().replace(/\s+/g, "_");
  if (x === "SUPER_ADMINISTRATOR") x = "SUPERADMIN";
  if (x === "COMPLIANCE_OFFICER") x = "COMPLIANCE OFFICER";
  if (x === "BRANCH_MANAGER") x = "BRANCH MANAGER";
  return x;
};

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

// INR formatter
const inr = (n) =>
  n == null || n === ""
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(n));

/* ------------------------------ subcomponents ------------------------------ */
function StatusPill({ active }) {
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap"
      style={
        active
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
      title={active ? "Active" : "Inactive"}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function PermChips({ perms = [], max = 24 }) {
  const [showAll, setShowAll] = useState(false);
  if (!perms.length)
    return (
      <p className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
        No permissions assigned.
      </p>
    );
  const visible = showAll ? perms : perms.slice(0, max);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((p) => (
          <span
            key={p}
            className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap"
            title={p}
            style={{
              background: "var(--theme-components-tag-info-bg, rgba(59,130,246,.10))",
              color: "var(--theme-primary)",
              border: "1px solid var(--theme-components-tag-info-border, rgba(59,130,246,.35))",
            }}
          >
            {p}
          </span>
        ))}
      </div>
      {perms.length > max && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-sm"
          style={{ color: "var(--theme-primary)" }}
        >
          {showAll ? "Show less" : `Show all (${perms.length})`}
        </button>
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  const v = value ?? "—";
  return (
    <div title={`${label}: ${v}`}>
      <h4 className="text-sm font-semibold" style={{ color: "var(--theme-text)" }}>
        {label}
      </h4>
      <p className="break-words" style={{ color: "var(--theme-text-muted)" }}>
        {v}
      </p>
    </div>
  );
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString();
}

const getRoleColorClass = (roleName) => {
  const key = canonRole(roleName);
  const base =
    "px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150 inline-block whitespace-nowrap";
  const roleColors = {
    SUPERADMIN:
      "bg-[var(--theme-primary-softer)] text-[var(--theme-primary)] border-[var(--theme-primary)]/30",
    "BRANCH MANAGER":
      "bg-[var(--theme-warning-soft,rgba(250,204,21,.15))] text-[var(--theme-warning,#ca8a04)] border-[var(--theme-warning,#ca8a04)]/30",
    SALES_MANAGER:
      "bg-[var(--theme-success-soft,rgba(16,185,129,.12))] text-[var(--theme-success,#10b981)] border-[var(--theme-success,#10b981)]/30",
    HR: "bg-[var(--theme-info-soft,rgba(59,130,246,.12))] text-[var(--theme-info,#3b82f6)] border-[var(--theme-info,#3b82f6)]/30",
    TL: "bg-[var(--theme-accent-soft,rgba(139,92,246,.12))] text-[var(--theme-accent,#8b5cf6)] border-[var(--theme-accent,#8b5cf6)]/30",
    SBA: "bg-[var(--theme-secondary-soft,rgba(99,102,241,.12))] text-[var(--theme-secondary,#6366f1)] border-[var(--theme-secondary,#6366f1)]/30",
    BA: "bg-[var(--theme-neutral-soft,rgba(107,114,128,.12))] text-[var(--theme-text)] border-[var(--theme-border)]",
    "COMPLIANCE OFFICER":
      "bg-[var(--theme-neutral-soft,rgba(107,114,128,.12))] text-[var(--theme-text)] border-[var(--theme-border)]",
    SALES_EXECUTIVE:
      "bg-[var(--theme-neutral-soft,rgba(107,114,128,.12))] text-[var(--theme-text)] border-[var(--theme-border)]",
    RESEARCHER:
      "bg-[var(--theme-neutral-soft,rgba(107,114,128,.12))] text-[var(--theme-text)] border-[var(--theme-border)]",
  };
  return `${base} ${roleColors[key] || roleColors.BA}`;
};

/* ------------------------------ main component ------------------------------ */
export default function UserTable({
  users = [],
  branchMap = {},
  onEdit,
  onDelete,
  refreshUsers,
  pagination, // { page, totalPages, total, limit, skip }
  onPrev,
  onNext,
  goToPage,
  loading,
  codeToName = {},
}) {
  const isSuperAdmin = useViewerIsSuperAdmin();
  const showBranchCol = isSuperAdmin;

  const {
    page = 1,
    totalPages: tp = 1,
    total = users.length,
    limit = users.length || 10,
    skip = (page - 1) * (limit || 1),
  } = pagination || {};
  const totalPages = Number(tp || 1);

  // expander + remaining columns (serial already removed)
  const COLS = showBranchCol ? 10 : 9;

  const [expandedId, setExpandedId] = useState(null);

  const rows = useMemo(() => {
    return (Array.isArray(users) ? users : []).map((u) => {
      const roleName =
        u?.profile_role?.name || u?.role_name || u?.role || (u?.role_id ? String(u.role_id) : "Unknown");

      const reportingName =
        u?.senior_profile_name ||
        u?.reporting_profile_name ||
        u?.senior_profile?.name ||
        u?.reporting_profile?.name ||
        (u?.senior_profile_id
          ? `${u.senior_profile_id}${codeToName[u.senior_profile_id] ? ` — ${codeToName[u.senior_profile_id]}` : ""}`
          : "—");

      return {
        id: u.employee_code,
        name: u?.name || "—",
        roleName: canonRole(roleName),
        reporting: reportingName || "—",
        target: inr(u?.target),
        branch: branchMap?.[u?.branch_id] || "—",
        phone: u?.phone_number || "—",
        email: (u?.email || "").toLowerCase(),
        active: !!u?.is_active,
        raw: u,
      };
    });
  }, [users, branchMap, codeToName]);

  return (
    <div
      className="rounded-2xl shadow-md border"
      style={{
        background: "var(--theme-card-bg)",
        borderColor: "var(--theme-border)",
        color: "var(--theme-text)",
      }}
    >
      {/* No horizontal scroll */}
      <div className="overflow-x-hidden">
        <div className="relative max-h-[70vh] overflow-y-auto">
          <table className="table-auto w-full text-sm">
            <thead
              className="border-b sticky top-0 z-20 shadow-sm"
              style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
            >
              <tr className="text-[var(--theme-text)]">
                <th className="px-5 py-4 text-left font-semibold"></th>
                <th className="px-5 py-4 text-left font-semibold">Name</th>
                <th className="px-5 py-4 text-left font-semibold">Role</th>
                <th className="px-5 py-4 text-left font-semibold">Reporting</th>
                <th className="px-5 py-4 text-left font-semibold">Target</th>
                {showBranchCol && <th className="px-5 py-4 text-left font-semibold">Branch</th>}
                <th className="px-5 py-4 text-left font-semibold">Phone</th>
                <th className="px-5 py-4 text-left font-semibold">Email</th>
                <th className="px-5 py-4 text-left font-semibold">Status</th>
                <th className="px-5 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: "var(--theme-border)" }}>
              {loading ? (
                <tr>
                  <td colSpan={COLS} className="px-5 py-8 text-center" style={{ color: "var(--theme-text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => {
                  const isOpen = expandedId === r.id;
                  return (
                    <FragmentRow
                      key={r.id}
                      row={r}
                      isOpen={isOpen}
                      showBranchCol={showBranchCol}
                      onToggle={() => setExpandedId(isOpen ? null : r.id)}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  );
                })
              ) : (
                <tr>
                  <td colSpan={COLS} className="px-5 py-8 text-center" style={{ color: "var(--theme-text-muted)" }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* footer summary + pagination */}
      <div
        className="px-6 py-4 text-sm flex items-center justify-between flex-wrap gap-3 border-t"
        style={{
          background: "var(--theme-surface)",
          borderColor: "var(--theme-border)",
          color: "var(--theme-text)",
        }}
      >
        <div>
          {total > 0
            ? `Showing ${rows.length ? skip + 1 : 0}–${Math.min(skip + rows.length, total)} of ${total} users`
            : "Showing 0 users"}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={page === 1}
            className="px-3 h-9 rounded-lg border transition"
            aria-label="Previous page"
            style={{
              color: page === 1 ? "var(--theme-text-muted)" : "var(--theme-text)",
              borderColor: "var(--theme-border)",
              background: "var(--theme-card-bg)",
              opacity: page === 1 ? 0.6 : 1,
            }}
            title="Previous page"
          >
            Prev
          </button>

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
                  onClick={() => goToPage?.(item)}
                  className="min-w-9 h-9 px-3 rounded-lg border transition"
                  aria-current={item === page ? "page" : undefined}
                  style={{
                    background: item === page ? "var(--theme-primary)" : "var(--theme-card-bg)",
                    color: item === page ? "var(--theme-primary-contrast)" : "var(--theme-text)",
                    borderColor: item === page ? "var(--theme-primary)" : "var(--theme-border)",
                  }}
                  title={`Go to page ${item}`}
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
              color: page === totalPages ? "var(--theme-text-muted)" : "var(--theme-text)",
              borderColor: "var(--theme-border)",
              background: "var(--theme-card-bg)",
              opacity: page === totalPages ? 0.6 : 1,
            }}
            title="Next page"
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
  onDelete: PropTypes.func,
  refreshUsers: PropTypes.func,
  pagination: PropTypes.object,
  onPrev: PropTypes.func,
  onNext: PropTypes.func,
  goToPage: PropTypes.func,
  loading: PropTypes.bool,
  codeToName: PropTypes.object,
};

/* ----------------------- Row + Accordion detail ---------------------- */
function FragmentRow({ row, isOpen, showBranchCol, onToggle, onEdit, onDelete }) {
  const u = row.raw;

  return (
    <>
      {/* MAIN ROW */}
      <tr
        className="transition duration-200 ease-in-out cursor-pointer"
        style={{ background: "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={(e) => {
          const tag = (e.target?.tagName || "").toLowerCase();
          if (["button", "svg", "path"].includes(tag)) return;
          onToggle();
        }}
        title={`Click to ${isOpen ? "collapse" : "expand"} details`}
      >
        <td className="px-5 py-4 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="p-2 rounded-full transition border"
            title={isOpen ? "Collapse" : "Expand"}
            style={{
              background: "var(--theme-card-bg)",
              color: "var(--theme-text)",
              borderColor: "var(--theme-border)",
            }}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>

        {/* Name (constrain text, not cell) */}
        <td className="px-5 py-4 align-top" title={`${row.name} • ${u.employee_code || "—"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
              style={{ background: "var(--theme-primary-softer)" }}
            >
              <UserIcon className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate block max-w-[18rem] md:max-w-[22rem]">
                {row.name}
              </span>
              <span
                className="text-xs truncate block max-w-[18rem] md:max-w-[22rem]"
                style={{ color: "var(--theme-text-muted)" }}
              >
                {u.employee_code}
              </span>
            </div>
          </div>
        </td>

        {/* Role (nowrap to keep badge in one line) */}
        <td className="px-5 py-4 align-top whitespace-nowrap" title={row.roleName}>
          <span className={getRoleColorClass(row.roleName)}>{row.roleName}</span>
        </td>

        <td className="px-5 py-4 align-top" title={row.reporting}>
          <span className="truncate block max-w-[12rem] md:max-w-[16rem] lg:max-w-[20rem]">
            {row.reporting}
          </span>
        </td>

        <td className="px-5 py-4 align-top truncate" title={row.target}>
          {row.target}
        </td>

        {showBranchCol && (
          <td className="px-5 py-4 align-top" title={row.branch}>
            <span className="truncate block max-w-[10rem] md:max-w-[12rem]">{row.branch}</span>
          </td>
        )}

        <td className="px-5 py-4 align-top" title={row.phone}>
          <div className="flex items-center gap-2" style={{ color: "var(--theme-text)" }}>
            <Phone className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
            {row.phone}
          </div>
        </td>

        {/* Email (constrain text) */}
        <td className="px-5 py-4 align-top" title={row.email}>
          <div className="flex items-center gap-2 min-w-0" style={{ color: "var(--theme-text)" }}>
            <Mail className="w-4 h-4 shrink-0" style={{ color: "var(--theme-text-muted)" }} />
            <span className="truncate block max-w-[12rem] md:max-w-[16rem] lg:max-w-[20rem]">
              {row.email}
            </span>
          </div>
        </td>

        <td className="px-5 py-4 align-top">
          <StatusPill active={row.active} />
        </td>

        <td className="px-5 py-4 align-top">
          <div className="flex justify-center gap-3">
            {onEdit && (
              <button
                onClick={() => onEdit(u)}
                className="p-2 rounded-full transition border"
                title="Edit User"
                style={{
                  background: "var(--theme-primary-softer)",
                  color: "var(--theme-primary)",
                  borderColor: "color-mix(in oklab, var(--theme-primary) 30%, transparent)",
                }}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(u.employee_code)}
                className="p-2 rounded-full transition border"
                title="Deactivate / Delete User"
                style={{
                  background: "var(--theme-danger-soft, rgba(239,68,68,.12))",
                  color: "var(--theme-danger, #ef4444)",
                  borderColor: "color-mix(in oklab, var(--theme-danger, #ef4444) 30%, transparent)",
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* ACCORDION DETAIL — 4 cols per row; no repeats */}
{isOpen && (
  <tr>
    <td colSpan={showBranchCol ? 10 : 9} className="px-0 pb-4">
      <div
        className="mx-5 mt-0 rounded-2xl p-5"
        style={{
          background: "var(--theme-card-bg)",
          border: "1px solid var(--theme-border)",
          boxShadow: "0 8px 24px var(--theme-components-card-shadow, rgba(0,0,0,.08))",
        }}
      >

        {/* Personal / Employment */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <IdCard className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
            <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
              Personal & Employment
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailField label="Father's Name" value={u.father_name} />
            <DetailField
              label="Experience"
              value={u.experience != null ? `${u.experience} year(s)` : "—"}
            />
            <DetailField label="Date of Birth" value={formatDate(u.date_of_birth)} />
            <DetailField label="Date of Joining" value={formatDate(u.date_of_joining)} />
            <DetailField label="PAN" value={u.pan || "—"} />
            <DetailField label="Aadhaar" value={u.aadhaar || "—"} />
          </div>
        </section>

        {/* Address */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
            <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
              Address
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailField label="Complete Address" value={u.address} />
            <DetailField label="City" value={u.city} />
            <DetailField label="State" value={u.state} />
            <DetailField label="Pincode" value={u.pincode} />
          </div>
        </section>

        {/* VBC / Telephony */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
            <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
              VBC / Telephony
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailField label="VBC Extension ID" value={u.vbc_extension_id} />
            <DetailField label="VBC Username" value={u.vbc_user_username} />
            <DetailField label="VBC Password" value={u.vbc_user_password} />
            {/* leave the 4th slot empty or add something else later */}
          </div>
        </section>

        {/* Permissions */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
            <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
              Permissions
            </h4>
          </div>
          <PermChips perms={Array.isArray(u.permissions) ? u.permissions : []} />
        </section>

        {/* Meta */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: "var(--theme-text-muted)" }} />
            <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
              Meta
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailField label="Created At" value={formatDate(u.created_at)} />
            <DetailField label="Updated At" value={formatDate(u.updated_at)} />
            {/* 2 spare slots available if you add more meta later */}
          </div>
        </section>
      </div>
    </td>
  </tr>
)}
    </>
  );
}
