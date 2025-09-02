// components/UsersListPage.jsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { Users } from "lucide-react";
import StatsCards from "./StatsCards";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import UserDetailsModal from "./UserDetailsModal";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import UserModal from "./UserModal";

// Canonical role map by ID
const ROLE_MAP = {
  "1": "SUPERADMIN",
  "2": "BRANCH MANAGER",
  "3": "HR",
  "4": "SALES MANAGER",
  "5": "TL",
  "6": "SBA",
  "7": "BA",
};

// Normalize API users to include a readable .role for filters/display
const normalizeUsers = (list) =>
  (Array.isArray(list) ? list : []).map((u) => ({
    ...u,
    role: ROLE_MAP[u.role_id] || u.role || "Unknown",
  }));

export default function UsersListPage() {
  const { hasPermission } = usePermissions();
  const { branchId } = useParams(); // (reserved)
  const didFetch = useRef(false);

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branchMap, setBranchMap] = useState({});

  const [detailsUser, setDetailsUser] = useState(null);

  // Modal control
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [modalUser, setModalUser] = useState(null);
  const [modalKey, setModalKey] = useState(0);

  // Filters
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const openAdd = () => {
    setModalUser(null);
    setModalMode("add");
    setModalKey((k) => k + 1);
  };

  const openEdit = (u) => {
    setModalUser(u);
    setModalMode("edit");
    setModalKey((k) => k + 1);
  };

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const load = async () => {
      try {
        const [usersRes, branchesRes, rolesRes] = await Promise.all([
          axiosInstance.get("/users/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/branches/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/profile-role/"),
        ]);

        // Users
        setUsers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : []);

        // Branches + map
        const b = branchesRes.data || [];
        setBranches(b);
        const map = {};
        b.forEach((x) => (map[x.id] = x.name));
        setBranchMap(map);

        // Roles
        setRoles(rolesRes.data || []);
      } catch (err) {
        console.error("Failed initial load:", err);
         ErrorHandling({ error: err, defaultError: "Failed to load users or metadata."});
      }
    };

    load();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/users/?skip=0&limit=100&active_only=false");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setUsers(normalizeUsers(list));
    } catch (err) {
      console.error("Failed to fetch users:", err);
      ErrorHandling({ error: err, defaultError: "Failed to refresh users."});
    }
  };

  const handleDelete = async (employee_code) => {
    if (!confirm(`Are you sure you want to delete user ${employee_code}?`)) return;
    try {
      await axiosInstance.delete(`/users/${employee_code}`);
      toast.success(`User ${employee_code} deleted.`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Failed to delete user."});
    }
  };

const filteredUsers = users.filter((u) => {
  // compare by ROLE ID
  const userRoleId = String(u?.profile_role?.id ?? u?.role_id ?? "");
  const roleMatch = selectedRole === "All" || userRoleId === String(selectedRole);

  const branchMatch =
    selectedBranch === "All" || String(u.branch_id) === String(selectedBranch);

  const q = searchQuery.toLowerCase().trim();
  if (!q) return roleMatch && branchMatch;

  const searchMatch =
    u.name?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q) ||
    u.phone_number?.includes(q) ||
    u.employee_code?.toLowerCase().includes(q);

  return roleMatch && branchMatch && !!searchMatch;
});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" /> Manage and track all users
            </p>
          </div>
          {hasPermission("user_add_user") && (
            <button
              onClick={openAdd}
              className="bg-green-600 text-white px-3 py-2 rounded-xl hover:bg-green-700 flex items-center gap-2"
            >
              + Add User
            </button>
          )}
        </div>

        {/* Stats */}
        <StatsCards users={users} branches={branches} roles={roles} />

        {/* Filters */}
        <UserFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          roles={roles}
          branches={branches}
        />

        {/* Table */}
        <UserTable
          users={filteredUsers}
          branchMap={branchMap}
          onEdit={openEdit}
          onDelete={handleDelete}
          onDetails={(u) => setDetailsUser(u)}
          refreshUsers={fetchUsers}
        />

        {/* Create/Edit Modal */}
        <UserModal
          key={modalKey}
          mode={modalMode}
          isOpen={!!modalMode}
          onClose={() => setModalMode(null)}
          user={modalUser}
          roles={roles}
          branches={branches}
          onSuccess={() => {
            fetchUsers();
            setModalMode(null);
          }}
        />

        {/* Details Modal */}
        <UserDetailsModal
          isOpen={!!detailsUser}
          onClose={() => setDetailsUser(null)}
          user={detailsUser}
          branchMap={branchMap}
        />
      </div>
    </div>
  );
}
