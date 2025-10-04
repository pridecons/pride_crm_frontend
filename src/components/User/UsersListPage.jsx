// components/UsersListPage.jsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { Users, Upload } from "lucide-react";
import StatsCards from "./StatsCards";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import UserModal from "./UserModal";
import { ErrorHandling } from "@/helper/ErrorHandling";
import BulkUserUploadModal from "./BulkUserUploadModal"; // ⬅️ NEW

// helper to build map from employee_code → name
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
      (u.role && toDisplayRole(u.role)) ||
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
  const [usersTotal, setUsersTotal] = useState(0);  // <-- TOTAL users (for card)
  const [activeTotal, setActiveTotal] = useState(0);
  const [skip, setSkip]   = useState(0);   // NEW
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // NEW: keep all card numbers from the /users/ response here
  const [cards, setCards] = useState({
    total_employee: 0,
    active_employee: 0,
    inactive_employee: 0,
    branches: 0,
    roles: 0,
  });

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
    signal,
  } = {}) => {
    setLoading(true);
    try {
      const params = {
        skip: (p - 1) * limit,
        limit,
        active_only: false,
      };
      if (roleId && roleId !== "All") params.role_id = Number(roleId);
      if (branch && branch !== "All") params.branch_id = Number(branch);
      if (q && q.trim()) params.search = q.trim();

      const res = await axiosInstance.get("/users/", { params, signal });

      // pull cards from the same response (no extra API calls)
      const card = res?.data?.card || {};
      setCards((prev) => ({
        ...prev,
        total_employee: Number(card.total_employee) || 0,
        active_employee: Number(card.active_employee) || 0,
        inactive_employee: Number(card.inactive_employee) || 0,
        branches: Number(card.branches) || 0,
        roles: Number(card.roles) || 0,
      }));

      // OPTIONAL: if you also want to base usersTotal on the card block
      setUsersTotal(
        Number(card.total_employee) ||
          (Number(res?.data?.pagination?.total) || list.length)
      );

      // accept either {data, total, limit} or bare array fallback
      const list =
        Array.isArray(res?.data?.data) ? res.data.data :
        (Array.isArray(res?.data) ? res.data : []);

      setUsers(normalizeUsers(list, roleMap));
      setCodeToName(makeCodeToName(list));

      // NEW: use API pagination block
      const pg = res?.data?.pagination || {};
      const apiTotal = Number(pg.total) || 0;
      const apiSkip  = Number(pg.skip)  || 0;
      const apiLimit = Number(pg.limit) || limit;
      const apiPages = Number(pg.pages) || Math.max(1, Math.ceil(apiTotal / (apiLimit || 1)));
      const apiPage  = apiLimit ? Math.floor(apiSkip / apiLimit) + 1 : 1;

      setTotal(apiTotal || list.length);
      setUsersTotal(apiTotal || 0);
      setSkip(apiSkip);
      setLimit(apiLimit);
      setPages(apiPages);
      if (apiPage && apiPage !== page) setPage(apiPage);
    } catch (err) {
      if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
        ErrorHandling({ error: err, defaultError: "Failed to load users." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Object.keys(roleMap).length) return; // wait until roles loaded

    const controller = new AbortController();
    const t = setTimeout(() => {
      fetchUsers({
        page,
        roleId: selectedRole,
        branch: selectedBranch,
        q: searchQuery,
        signal: controller.signal,
      });
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleMap, selectedRole, selectedBranch, page, searchQuery]);

  // If roles arrive later/changed, refresh users' readable role labels
  useEffect(() => {
    if (!Object.keys(roleMap).length || !Array.isArray(users) || users.length === 0) return;
    setUsers((prev) => normalizeUsers(prev, roleMap));
  }, [roleMap]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div
      className="min-h-screen p-6"
      style={{
        background: "var(--theme-background)",
        color: "var(--theme-text)",
      }}
    >
      {/* Theme-scoped helpers */}
      <style jsx global>{`
        /* Panels / cards */
        .theme-panel {
          background: var(--theme-card-bg, var(--theme-card));
          border: 1px solid var(--theme-border);
          border-radius: 1rem;
          box-shadow: 0 4px 14px var(--theme-components-card-shadow, rgba(0,0,0,0.06));
        }

        /* Header text + muted */
        .theme-heading {
          color: var(--theme-text);
        }
        .theme-muted {
          color: var(--theme-text-muted);
        }

        /* Buttons */
        .theme-btn {
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 6px 14px var(--theme-components-button-secondary-shadow, rgba(0,0,0,0.05));
          border: 1px solid transparent;
          transition: transform .15s ease, filter .15s ease, background .15s ease, border .15s ease;
        }
        .theme-btn:active { transform: translateY(1px); }

        .theme-btn-primary {
          background: var(--theme-components-button-primary-bg, var(--theme-primary));
          color: var(--theme-components-button-primary-text, var(--theme-primary-contrast));
          border-color: var(--theme-components-button-primary-border, transparent);
          box-shadow: 0 8px 18px var(--theme-components-button-primary-shadow, rgba(0,0,0,0.12));
        }
        .theme-btn-primary:hover {
          background: var(--theme-components-button-primary-hover-bg, var(--theme-primary-hover));
          filter: brightness(0.98);
        }

        .theme-btn-success {
          background: var(--theme-success);
          color: var(--theme-primary-contrast);
          box-shadow: 0 8px 18px rgba(34,197,94,0.25);
        }
        .theme-btn-success:hover { filter: brightness(0.98); }

        .theme-btn-secondary {
          background: var(--theme-components-button-secondary-bg, var(--theme-surface));
          color: var(--theme-components-button-secondary-text, var(--theme-text));
          border-color: var(--theme-components-button-secondary-border, var(--theme-border));
        }
        .theme-btn-secondary:hover {
          background: var(--theme-components-button-secondary-hover-bg, var(--theme-primary-softer));
        }

        /* Page header chip bg */
        .theme-soft {
          background: var(--theme-components-tag-info-bg, var(--theme-primary-softer));
          color: var(--theme-components-tag-info-text, var(--theme-primary));
          border: 1px solid var(--theme-components-tag-info-border, rgba(0,0,0,0));
          border-radius: 9999px;
          padding: 0.25rem 0.5rem;
          font-size: .75rem;
          font-weight: 600;
        }

        /* Table container background */
        .theme-table-wrap {
          background: var(--theme-card-bg, var(--theme-card));
          border: 1px solid var(--theme-border);
          border-radius: 1rem;
          box-shadow: 0 4px 14px var(--theme-components-card-shadow, rgba(0,0,0,0.06));
          overflow: hidden;
        }
      `}</style>

      <div className="mx-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="theme-heading text-3xl font-bold mb-2">User Management</h1>
            <p className="theme-muted flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage and track all users
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canBulk && (
              <button onClick={openBulk} className="theme-btn theme-btn-primary">
                <Upload className="w-4 h-4" />
                Bulk Upload
              </button>
            )}
            {canAdd && (
              <button onClick={openAdd} className="theme-btn theme-btn-success">
                + Add User
              </button>
            )}
          </div>
        </div>

        {/* Stats (uses its own component; it can read CSS vars from ThemeProvider if it uses them) */}
        <StatsCards
          totalUsers={cards.total_employee}
          activeUsers={cards.active_employee}
          branchesCount={cards.branches || branches.length}
          rolesCount={cards.roles || roles.length}
        />

        {/* Filters */}
        <div className="mb-6">
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
        </div>

        {/* Table */}
        <div className="theme-table-wrap">
          <UserTable
            users={users}
            branchMap={branchMap}
            onEdit={openEdit}
            onDelete={handleDelete}
            refreshUsers={() => fetchUsers({ page })}
            pagination={{ page, totalPages, total, limit, skip }}   // NEW: skip
            onPrev={prevPage}
            onNext={nextPage}
            goToPage={goToPage}
            loading={loading}
            codeToName={codeToName}
          />
        </div>

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

        {/* ⬇️ Bulk Upload Modal */}
        <BulkUserUploadModal
          key={`bulk-upload-${bulkKey}`}
          isOpen={bulkOpen}
          onClose={() => setBulkOpen(false)}
          onSuccess={() => {
            fetchUsers();
            setBulkOpen(false);
          }}
          roles={roles}
          branches={branches}
        />
      </div>
    </div>
  );
}
