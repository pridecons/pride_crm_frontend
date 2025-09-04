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
  const { hasPermission } = usePermissions();

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

      const rCanon = canon(r).replace(/\s+/g, " ");
      const roleFixed =
        rCanon === "SUPER ADMINISTRATOR" ? "SUPERADMIN" : rCanon;

      setRole(roleFixed || null);
      setBranchId(b != null ? String(b) : null);
    } catch (e) {
      console.error("role/branch decode failed", e);
    }
  }, []);

  const isSuperAdmin = role === "SUPERADMIN";

  return { role, branchId, isSuperAdmin };
}

export default function UserTable({
  users = [],
  branchMap = {},
  onEdit,
  onDetails,
  refreshUsers,
}) {
  const { isSuperAdmin, branchId } = useRoleBranch();

  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) return users;
    if (!branchId) return users;
    return users.filter((u) => String(u.branch_id) === String(branchId));
  }, [users, isSuperAdmin, branchId]);

  const getRoleColorClass = (roleName) => {
    const roleColors = {
      SUPERADMIN: "text-blue-800",
      "BRANCH_MANAGER": "text-red-700",
      "SALES_MANAGER": "text-green-800",
      HR: "text-pink-800",
      TL: "text-yellow-800",
      SBA: "text-indigo-800",
      BA: "text-gray-800",
    };
    return roleColors[roleName] || "bg-gray-100 text-gray-700 border border-gray-200";
  };

  const handleDelete = async (employeeCode) => {
    if (!confirm(`Are you sure you want to deactivate user ${employeeCode}?`)) return;
    try {
      const res = await axiosInstance.delete(`/users/${employeeCode}`);
      toast.success(res.data.message || `User ${employeeCode} deactivated successfully`);
      refreshUsers?.();
    } catch (error) {
      console.error(error);
      // toast.error(error.response?.data?.message || "Failed to deactivate user");
      ErrorHandling({ error: error, defaultError: "Failed to deactivate user" });
    }
  };

  // NEW: derive senior label from possible fields
  const getSeniorLabel = (u) => {
    return (
      u?.senior_profile?.name ||
      u?.reporting_profile?.name ||
      u?.senior_profile_name ||
      u?.reporting_profile_name ||
      (u?.senior_profile_id != null ? String(u.senior_profile_id) : "—")
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200">
      <div className="overflow-x-auto">
        <table className="table-fixed w-full text-sm text-gray-700">
          <thead className="bg-gray-100 border-b sticky top-0 z-10">
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
            {visibleUsers.length > 0 ? (
              visibleUsers.map((u, index) => {
                // Prefer profile_role.name → fallback to role → fallback to role_id
                const roleName =
                  u.profile_role?.name ||
                  u.role_name ||
                  u.role ||
                  "Unknown";

                return (
                  <tr key={u.employee_code} className="hover:bg-gray-50 transition duration-200 ease-in-out">
                    <td className="px-5 py-4">{index + 1}</td>

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
                <td colSpan="9" className="px-5 py-8 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-sm text-gray-600 text-center">
        Showing {visibleUsers.length} user{visibleUsers.length !== 1 ? "s" : ""}
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
