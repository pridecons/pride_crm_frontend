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
import UserPermissionsModal from "./UserPermissionsModal";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import UserModal from "./UserModal";

export default function UsersListPage() {
  const { hasPermission } = usePermissions();
  const { branchId } = useParams(); // in case you use it later
  const didFetch = useRef(false);   // <-- prevents double fetch in React 18 StrictMode

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branchMap, setBranchMap] = useState({});

  const [editingUser, setEditingUser] = useState(null);
  const [detailsUser, setDetailsUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [modalMode, setModalMode] = useState(null); // "add" or "edit"
  const [modalUser, setModalUser] = useState(null);

  const openAdd = () => {
    setModalMode("add");
    setModalUser(null);
  };

  const openEdit = (u) => {
    setModalMode("edit");
    setModalUser(u);
  };

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const load = async () => {
      try {
        const [usersRes, branchesRes, rolesRes] = await Promise.all([
          axiosInstance.get("/users/?skip=0&limit=100&active_only=true"),
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
      }
    };

    load();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/users/?skip=0&limit=100&active_only=true");
      setUsers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
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
      toast.error("Failed to delete user.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const roleMatch = selectedRole === "All" || u.role === selectedRole;
    const branchMatch = selectedBranch === "All" || u.branch_id === Number(selectedBranch);
    const q = searchQuery.toLowerCase();
    const searchMatch =
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone_number?.includes(searchQuery) ||
      u.employee_code?.toLowerCase().includes(q);
    return roleMatch && branchMatch && searchMatch;
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
        />

        <UserModal
          mode={modalMode}
          isOpen={!!modalMode}
          onClose={() => setModalMode(null)}
          user={modalUser}
          roles={roles}
          branches={branches}
          onSuccess={(u) => {
            fetchUsers();
            setPermissionsUser(u);
          }}
        />

        {/* Modals */}
        <UserDetailsModal
          isOpen={!!detailsUser}
          onClose={() => setDetailsUser(null)}
          user={detailsUser}
          branchMap={branchMap}
        />
        <UserPermissionsModal
          isOpen={!!permissionsUser}
          onClose={() => setPermissionsUser(null)}
          user={permissionsUser}
        />
      </div>
    </div>
  );
}