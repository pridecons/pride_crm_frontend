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

  // server-side pagination + loading
  const [page, setPage] = useState(1);     // 1-based
  const [limit, setLimit] = useState(10);  // page size to ask backend
  const [total, setTotal] = useState(0);   // backend total
  const [skip, setSkip]   = useState(0);   // NEW
const [pages, setPages] = useState(1);  
  const [loading, setLoading] = useState(false);

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
        // BEFORE: const [usersRes, branchesRes, rolesRes] = await Promise.all([...])

        const [branchesRes, rolesRes] = await Promise.all([
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



      } catch (err) {
        console.error("Failed initial load:", err);
        ErrorHandling({ error: err, defaultError: "Failed to load users or metadata." });
      }
    };

    load();
  }, []);

  const fetchUsers = async ({
    page: p = page,
    roleId = selectedRole,
    branch = selectedBranch,
    q = searchQuery,
  } = {}) => {
    setLoading(true);
    try {
      const params = {
        skip: (p - 1) * limit,
        limit,
        active_only: false,
      };
      if (roleId && roleId !== "All") params.role_id = Number(roleId);;
      if (branch && branch !== "All") params.branch_id = Number(branch);
      if (q && q.trim()) params.search = q.trim();
      console.log("[users] fetch", params);
      const res = await axiosInstance.get("/users/", { params });

      // accept either {data, total, limit} or bare array fallback
      const list =
        Array.isArray(res?.data?.data) ? res.data.data :
          (Array.isArray(res?.data) ? res.data : []);

      setUsers(normalizeUsers(list, roleMap));
      setCodeToName(makeCodeToName(list));

      // try multiple shapes, then fall back to headers or list length
      // NEW: use API pagination block
 const pg = res?.data?.pagination || {};
 const apiTotal = Number(pg.total) || 0;
 const apiSkip  = Number(pg.skip)  || 0;
 const apiLimit = Number(pg.limit) || limit;
 const apiPages = Number(pg.pages) || Math.max(1, Math.ceil(apiTotal / (apiLimit || 1)));
 const apiPage  = apiLimit ? Math.floor(apiSkip / apiLimit) + 1 : 1;

 setTotal(apiTotal || list.length);
 setSkip(apiSkip);
 setLimit(apiLimit);
 setPages(apiPages);
 setPage(apiPage);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      ErrorHandling({ error: err, defaultError: "Failed to load users." });
    } finally {
      setLoading(false);
    }
  };

  // first load when roleMap is ready
  useEffect(() => {
    if (!Object.keys(roleMap).length) return;
    fetchUsers({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleMap]);

  // role/branch change → reset to page 1
  useEffect(() => {
    setPage(1);
    fetchUsers({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, selectedBranch]);

  // page change
  useEffect(() => {
    fetchUsers({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // search (debounced) → page 1
  useEffect(() => {
    const t = setTimeout(() => fetchUsers({ page: 1 }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // If roles arrive later/changed, refresh users' readable role labels
  useEffect(() => {
    if (!Object.keys(roleMap).length || !Array.isArray(users) || users.length === 0) return;
    // Re-normalize current users to ensure .role reflects latest roleMap
    setUsers((prev) => normalizeUsers(prev, roleMap));
  }, [roleMap]);



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



  const canAdd = hasPermission("user_add_user");
  const canBulk = hasPermission("user_bulk_upload") || hasPermission("user_add_user"); // fallback

  const totalPages = pages || Math.max(1, Math.ceil((total || 0) / limit));
  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));
  const prevPage = () => goToPage(page - 1);
  const nextPage = () => goToPage(page + 1);

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
          users={users}
          branchMap={branchMap}
          onEdit={openEdit}
          onDelete={handleDelete}
          onDetails={(u) => setDetailsUser(u)}
          refreshUsers={() => fetchUsers({ page })}
          pagination={{ page, totalPages, total, limit, skip }}   // NEW: skip
          onPrev={prevPage}
          onNext={nextPage}
          goToPage={goToPage}
          loading={loading}
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
