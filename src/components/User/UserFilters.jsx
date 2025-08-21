"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Search } from "lucide-react";

function useRoleBranch() {
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState(null);

  useEffect(() => {
    try {
      const ui = Cookies.get("user_info");
      if (ui) {
        const parsed = JSON.parse(ui);
        const r = parsed?.role || parsed?.user?.role || null;
        const b = parsed?.branch_id ?? parsed?.user?.branch_id ?? parsed?.branch?.id ?? null;
        setRole(r || null);
        setBranchId(b != null ? String(b) : null);
        return;
      }
      const token = Cookies.get("access_token");
      if (token) {
        const p = jwtDecode(token);
        const r = p?.role || null;
        const b = p?.branch_id ?? p?.user?.branch_id ?? null;
        setRole(r || null);
        setBranchId(b != null ? String(b) : null);
      }
    } catch (e) {
      console.error("role/branch decode failed", e);
    }
  }, []);

  return { role, branchId, isSuperAdmin: role === "SUPERADMIN" };
}

export default function UserFilters({
  searchQuery, setSearchQuery,
  selectedRole, setSelectedRole,
  selectedBranch, setSelectedBranch,
  roles, branches
}) {
  const { isSuperAdmin, branchId } = useRoleBranch();

  // For non-SUPERADMIN: lock the selected branch to the user’s branch
  useEffect(() => {
    if (!isSuperAdmin && branchId && selectedBranch !== String(branchId)) {
      setSelectedBranch(String(branchId));
    }
  }, [isSuperAdmin, branchId, selectedBranch, setSelectedBranch]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 flex flex-col lg:flex-row justify-between gap-4">
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

      <div className="flex gap-3">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="border rounded-xl px-4 py-3"
        >
          <option value="All">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Branch filter visible ONLY for SUPERADMIN */}
        {isSuperAdmin && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border rounded-xl px-4 py-3"
          >
            <option value="All">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}