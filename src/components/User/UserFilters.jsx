// UserFilters.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Search } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";

const toStringSafe = (v) => (v == null ? "" : String(v));

const getBranchId = (b) =>
  b?.id != null ? String(b.id) : b?.branch_id != null ? String(b.branch_id) : "";

const getBranchLabel = (b) =>
  b?.name || b?.branch_name || (b?.id != null ? `Branch ${b.id}` : "Unknown");

const branchKey = (b, i) => {
  const idPart =
    b?.id != null ? `id-${b.id}` : b?.branch_id != null ? `bid-${b.branch_id}` : `idx-${i}`;
  return `branch-${idPart}`;
};

function useRoleBranch() {
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState(null);

  useEffect(() => {
    try {
      const uiRaw = Cookies.get("user_info");
      let r = null;
      let b = null;

      if (uiRaw) {
        const ui = JSON.parse(uiRaw);
        r =
          ui?.role_name ||
          ui?.role ||
          ui?.user?.role_name ||
          ui?.user?.role ||
          ui?.profile_role?.name ||
          null;

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
          r = p?.role_name || p?.role || null;
          b = p?.branch_id ?? p?.user?.branch_id ?? null;
        }
      }

      const canon = String(r || "").toUpperCase().trim().replace(/\s+/g, " ");
      const fixedRole = canon === "SUPER ADMINISTRATOR" ? "SUPERADMIN" : canon;

      setRole(fixedRole || null);
      setBranchId(b != null ? String(b) : null);
    } catch (e) {
      console.error("role/branch decode failed", e);
    }
  }, []);

  return { role, branchId, isSuperAdmin: role === "SUPERADMIN" };
}

export default function UserFilters({
  searchQuery,
  setSearchQuery,
  selectedRole,       // <-- holds role ID or "All"
  setSelectedRole,
  selectedBranch,
  setSelectedBranch,
  roles = [],         // <-- from /profile-role/ (has .id and .name)
  branches = [],
}) {
  const { hasPermission } = usePermissions();
  const { isSuperAdmin, branchId } = useRoleBranch();

  // Role options: value=id (string), label=name
  const normalizedRoles = useMemo(() => {
    const out = [];
    (roles || []).forEach((r, i) => {
      if (r?.id == null || !r?.name) return;
      out.push({
        value: String(r.id),     // use id for filtering
        label: String(r.name),   // show name
        raw: r,
      });
    });
    return out;
  }, [roles]);

  const normalizedBranches = useMemo(
    () =>
      (branches || []).map((b) => ({
        id: toStringSafe(getBranchId(b)),
        label: toStringSafe(getBranchLabel(b)),
        raw: b,
      })),
    [branches]
  );

// Non-superadmins: hard-lock to own branch (coerce "All"/empty too)
useEffect(() => {
  if (!isSuperAdmin && branchId) {
    const must = String(branchId);
    if (String(selectedBranch || "") !== must) {
      setSelectedBranch(must);
    }
  }
}, [isSuperAdmin, branchId, selectedBranch, setSelectedBranch]);


  return (
    <div className="bg-white  shadow-lg p-2 mb-8 border border-gray-100 flex flex-col lg:flex-row justify-between gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, phone or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl"
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* Role filter (by role ID) */}
        {hasPermission("user_all_roles") && (
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border rounded-xl px-4 py-3"
          >
            <option value="All">All Roles</option>
            {normalizedRoles.map((r) => (
              <option key={`role-${r.value}`} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}

{/* Branch filter: ONLY SUPERADMIN sees the dropdown */}
{isSuperAdmin && hasPermission("user_all_branches") && (
  <select
    value={selectedBranch}
    onChange={(e) => setSelectedBranch(e.target.value)}
    className="border rounded-xl px-4 py-3"
  >
    <option value="All">All Branches</option>
    {normalizedBranches.map((b, i) => (
      <option key={branchKey(b.raw, i)} value={b.id}>
        {b.label}
      </option>
    ))}
  </select>
)}
      </div>
    </div>
  );
}
