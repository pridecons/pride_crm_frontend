// components/UsersListPage.jsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { Users, Upload } from "lucide-react";
import StatsCards from "./StatsCards";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import UserDetailsModal from "./UserDetailsModal";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import UserModal from "./UserModal";
import { ErrorHandling } from "@/helper/ErrorHandling";
import BulkUserUploadModal from "./BulkUserUploadModal"; // ⬅️ NEW

// components/UsersListPage.jsx (top-level imports stay same)
const makeCodeToName = (list) =>
  (Array.isArray(list) ? list : []).reduce((acc, u) => {
    if (u?.employee_code) acc[String(u.employee_code)] = u?.name || "";
    return acc;
  }, {});

/* -------------------------- role helpers (dynamic) ------------------------- */
const normalizeRoleKey = (r) =>
  (r || "").toString().trim().toUpperCase().replace(/\s+/g, "_");

const toDisplayRole = (raw) => {
  const key = normalizeRoleKey(raw);
  if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
  if (key === "COMPLIANCE_OFFICER") return "COMPLIANCE OFFICER";
  return key; // SUPERADMIN, HR, SALES_MANAGER, TL, SBA, BA, RESEARCHER, etc.
};

// Normalize API users to include a readable .role for filters/display
const normalizeUsers = (list, roleMap) =>
  (Array.isArray(list) ? list : []).map((u) => ({
    ...u,
    role:
      // prefer API provided string if present
      (u.role && toDisplayRole(u.role)) ||
      // else map by role_id/profile_role.id
      roleMap[String(u?.profile_role?.id ?? u?.role_id ?? "")] ||
      "Unknown",
  }));

export default function UsersListPage() {
  const { hasPermission } = usePermissions();
  const { branchId } = useParams(); // (reserved)
  const didFetch = useRef(false);

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [roleMap, setRoleMap] = useState({}); // {"1":"SUPERADMIN", ...}

  const [detailsUser, setDetailsUser] = useState(null);

  // Create/Edit Modal control
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [modalUser, setModalUser] = useState(null);
  const [modalKey, setModalKey] = useState(0);

  // ⬇️ Bulk Upload Modal control
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkKey, setBulkKey] = useState(0);

  // Filters
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [codeToName, setCodeToName] = useState({});

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

  const openBulk = () => {
    setBulkOpen(true);
    setBulkKey((k) => k + 1);
  };

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const load = async () => {
      try {
        const [usersRes, branchesRes, rolesRes] = await Promise.all([
          axiosInstance.get("/users/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/branches/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/profile-role/?skip=0&limit=200&order_by=hierarchy_level"),
        ]);

        // Branches + map
        const b = branchesRes.data || [];
        setBranches(b);
        const bmap = {};
        b.forEach((x) => (bmap[x.id] = x.name));
        setBranchMap(bmap);

        // Roles + dynamic role map
        const rlist = rolesRes.data || [];
        setRoles(rlist);
        const rmap = {};
        (Array.isArray(rlist) ? rlist : []).forEach((r) => {
          if (r && r.id != null) rmap[String(r.id)] = toDisplayRole(r.name);
        });
        setRoleMap(rmap);

        // Users (normalize with role map)
        const rawUsers = Array.isArray(usersRes.data?.data) ? usersRes.data.data : [];
        setUsers(normalizeUsers(rawUsers, rmap));
        setCodeToName(makeCodeToName(rawUsers));
      } catch (err) {
        console.error("Failed initial load:", err);
        ErrorHandling({ error: err, defaultError: "Failed to load users or metadata." });
      }
    };

    load();
  }, []);

  // If roles arrive later/changed, refresh users' readable role labels
  useEffect(() => {
    if (!Object.keys(roleMap).length || !Array.isArray(users) || users.length === 0) return;
    // Re-normalize current users to ensure .role reflects latest roleMap
    setUsers((prev) => normalizeUsers(prev, roleMap));
  }, [roleMap]);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/users/?skip=0&limit=100&active_only=false");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setUsers(normalizeUsers(list, roleMap));
      setCodeToName(makeCodeToName(list));
    } catch (err) {
      console.error("Failed to fetch users:", err);
      ErrorHandling({ error: err, defaultError: "Failed to refresh users." });
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
      ErrorHandling({ error: err, defaultError: "Failed to delete user." });
    }
  };

  const filteredUsers = users.filter((u) => {
    // compare by ROLE ID (kept as-is)
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

  const canAdd = hasPermission("user_add_user");
  const canBulk = hasPermission("user_bulk_upload") || hasPermission("user_add_user"); // fallback

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="mx-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" /> Manage and track all users
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canBulk && (
              <button
                onClick={openBulk}
                className="bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Bulk Upload
              </button>
            )}
            {canAdd && (
              <button
                onClick={openAdd}
                className="bg-green-600 text-white px-3 py-2 rounded-xl hover:bg-green-700 flex items-center gap-2 shadow-sm"
              >
                + Add User
              </button>
            )}
          </div>
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
          codeToName={codeToName}
        />

        {/* Create/Edit Modal */}
        <UserModal
          key={`user-modal-${modalKey}`}
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

        {/* ⬇️ Bulk Upload Modal */}
        <BulkUserUploadModal
          key={`bulk-upload-${bulkKey}`}
          isOpen={bulkOpen}
          onClose={() => setBulkOpen(false)}
          onSuccess={() => {
            fetchUsers();
            setBulkOpen(false);
          }}
          roles={roles}          // ⬅️ pass roles
          branches={branches}
        />
      </div>
    </div>
  );
}
