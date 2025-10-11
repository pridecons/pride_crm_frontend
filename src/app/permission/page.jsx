"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  Save,
  Users,
  Settings,
  User,
  Lock,
  Unlock,
  Eye,
  Edit,
  Trash2,
  Plus,
  UserCheck,
  Building,
  DollarSign,
  FileText,
  MessageSquare,
  Target,
  BarChart3,
  Download,
  CheckSquare,
  Search,
} from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import LoadingState from "@/components/LoadingState";
import { ErrorHandling } from "@/helper/ErrorHandling";

/* ========= THEME HELPERS =========
   These components/styles only use CSS variables.
   Define them once in your app (light/dark):
   :root {
     --theme-page-bg: #0b1220;            // example (dark)
     --theme-text: #e6edf3;
     --theme-text-muted: #94a3b8;
     --theme-card-bg: #0f172a;
     --theme-input-bg: #0f172a;
     --theme-border: #253042;
     --theme-primary: #3b82f6;
     --theme-primary-contrast: #ffffff;
     --theme-primary-soft: color-mix(in oklab, var(--theme-primary) 12%, transparent);
     --theme-success: #22c55e;
     --theme-success-soft: color-mix(in oklab, var(--theme-success) 14%, transparent);
     --theme-warning: #f59e0b;
     --theme-warning-soft: color-mix(in oklab, var(--theme-warning) 16%, transparent);
     --theme-danger: #ef4444;
     --theme-danger-soft: color-mix(in oklab, var(--theme-danger) 16%, transparent);
   }
*/
const styles = {
  page: {
    background: "var(--theme-page-bg)",
    color: "var(--theme-text)",
  },
  card: {
    background: "var(--theme-card-bg)",
    borderColor: "var(--theme-border)",
    color: "var(--theme-text)",
  },
  headerPrimary: {
    background:
      "linear-gradient(90deg, color-mix(in oklab, var(--theme-primary) 22%, transparent), color-mix(in oklab, var(--theme-primary) 32%, transparent))",
    borderBottom: "1px solid var(--theme-border)",
  },
  headerSecondary: (hueVar) => ({
    background:
      `linear-gradient(90deg, color-mix(in oklab, var(${hueVar}) 22%, transparent), color-mix(in oklab, var(${hueVar}) 32%, transparent))`,
    borderBottom: "1px solid var(--theme-border)",
  }),
  softPill: (baseVar) => ({
    background: `color-mix(in oklab, var(${baseVar}) 12%, transparent)`,
    color: "var(--theme-text)",
    border: `1px solid color-mix(in oklab, var(${baseVar}) 24%, var(--theme-border))`,
  }),
  input: {
    background: "var(--theme-input-bg)",
    color: "var(--theme-text)",
    borderColor: "var(--theme-border)",
  },
  inputFocus: {
    boxShadow:
      "0 0 0 4px color-mix(in oklab, var(--theme-primary) 18%, transparent)",
    borderColor: "var(--theme-primary)",
  },
  placeholder: `
    .theme-perms input::placeholder { color: var(--theme-text-muted); opacity: 1; }
  `,
  btn: (baseVar) => ({
    background:
      `linear-gradient(90deg, color-mix(in oklab, var(${baseVar}) 60%, var(${baseVar}) 60%), var(${baseVar}))`,
    color: "var(--theme-primary-contrast)",
    boxShadow: "0 6px 16px 0 color-mix(in oklab, var(${baseVar}) 26%, transparent)",
  }),
  btnNeutral: {
    background: "transparent",
    color: "var(--theme-text)",
    borderColor: "var(--theme-border)",
  },
  chipOn: {
    background: "var(--theme-success-soft)",
    border: "1px solid color-mix(in oklab, var(--theme-success) 28%, var(--theme-border))",
    color: "var(--theme-text)",
  },
  chipOff: {
    background: "rgba(148,163,184,0.08)",
    border: "1px solid var(--theme-border)",
    color: "var(--theme-text)",
  },
  ringPrimary: {
    boxShadow:
      "0 0 0 4px color-mix(in oklab, var(--theme-primary) 18%, transparent)",
  },
};

// ---------- SearchFilter ----------
function SearchFilter({ allItems, onFilter }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!allItems || allItems.length === 0) {
      onFilter([]);
      return;
    }
    if (!value.trim()) {
      onFilter(allItems);
      return;
    }

    const filtered = allItems.filter((item) => {
      const s = value.toLowerCase();
      return (
        item.toLowerCase().includes(s) ||
        item.replace(/_/g, " ").toLowerCase().includes(s)
      );
    });
    onFilter(filtered);
  };

  return (
    <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4" style={{ color: "var(--theme-text-muted)" }} />
      </div>
      <input
        type="text"
        placeholder="Search permissions..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="w-full pl-10 pr-4 py-2 rounded-lg transition-all duration-200"
        style={{
          ...styles.input,
          border: "1px solid var(--theme-border)",
        }}
        onFocus={(e) => Object.assign(e.currentTarget.style, styles.inputFocus)}
        onBlur={(e) => Object.assign(e.currentTarget.style, styles.input)}
      />
    </div>
  );
}

// ---------- helpers ----------
const getPermissionKeys = (permObj) =>
  Object.keys(permObj || {}).filter((k) => !["user_id", "user", "id"].includes(k));

const getPermissionIcon = (perm) => {
  const iconMap = {
    add_user: Plus,
    edit_user: Edit,
    delete_user: Trash2,
    add_lead: Plus,
    edit_lead: Edit,
    delete_lead: Trash2,
    view_users: Users,
    view_lead: Eye,
    view_branch: Building,
    view_accounts: DollarSign,
    view_research: BarChart3,
    view_client: UserCheck,
    view_payment: DollarSign,
    view_invoice: FileText,
    view_kyc: Shield,
    approval: CheckCircle,
    internal_mailing: MessageSquare,
    chatting: MessageSquare,
    targets: Target,
    reports: BarChart3,
    lead_recording_view: Eye,
    lead_recording_upload: Plus,
    lead_story_view: Eye,
    lead_transfer: RefreshCw,
    lead_branch_view: Building,
    create_lead: Plus,
    create_new_lead_response: Plus,
    edit_response: Edit,
    delete_response: Trash2,
    user_add_user: Plus,
    user_all_roles: Users,
    user_all_branches: Building,
    user_view_user_details: Eye,
    user_edit_user: Edit,
    user_delete_user: Trash2,
    fetch_limit_create_new: Plus,
    fetch_limit_edit: Edit,
    fetch_limit_delete: Trash2,
    plans_create: Plus,
    edit_plan: Edit,
    delete_plane: Trash2,
    client_select_branch: Building,
    client_invoice: FileText,
    client_story: Eye,
    client_comments: MessageSquare,
    lead_manage_page: Target,
    plane_page: FileText,
    attandance_page: CheckCircle,
    client_page: UserCheck,
    lead_source_page: Target,
    lead_response_page: MessageSquare,
    user_page: Users,
    permission_page: Shield,
    lead_upload_page: Plus,
    fetch_limit_page: Settings,
    add_lead_page: Plus,
    payment_page: DollarSign,
    messanger_page: MessageSquare,
    template: FileText,
    sms_page: MessageSquare,
    email_page: MessageSquare,
    branch_page: Building,
    old_lead_page: FileText,
    new_lead_page: FileText,
    rational_download: Download,
    rational_pdf_model_download: Download,
    rational_pdf_model_view: Eye,
    rational_graf_model_view: BarChart3,
    rational_status: CheckCircle,
    rational_edit: Edit,
    rational_add_recommadation: Plus,
    email_add_temp: Plus,
    email_view_temp: Eye,
    email_edit_temp: Edit,
    email_delete_temp: Trash2,
    sms_add: Plus,
    sms_edit: Edit,
    sms_delete: Trash2,
    branch_add: Plus,
    branch_edit: Edit,
    branch_details: Eye,
    branch_agreement_view: Eye,
    header_global_search: Search,
  };
  return iconMap[perm] || Settings;
};

const getPermissionCategory = (perm) => {
  if (perm.includes("user")) return "User Management";
  if (perm.includes("lead")) return "Lead Management";
  if (perm.includes("view_")) return "View Access";
  if (perm.includes("payment") || perm.includes("invoice") || perm.includes("accounts"))
    return "Financial";
  if (perm.includes("client")) return "Client Management";
  if (perm.includes("branch")) return "Branch Management";
  if (perm.includes("rational")) return "Reports & Analytics";
  if (perm.includes("sms") || perm.includes("email") || perm.includes("messanger"))
    return "Communication";
  if (perm.includes("plan")) return "Plans & Services";
  if (perm.includes("_page")) return "Page Access";
  if (perm.includes("fetch_limit")) return "System Limits";
  return "General";
};

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [usersByCode, setUsersByCode] = useState({});
  const [usersTotal, setUsersTotal] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");

  const [filteredPermissions, setFilteredPermissions] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedUserPermissions) {
      const allPerms = getPermissionKeys(selectedUserPermissions);
      setFilteredPermissions(allPerms);
    } else {
      setFilteredPermissions([]);
    }
  }, [selectedUserPermissions]);

  const clearSelection = () => {
    setSelectedUser(null);
    setSelectedUserPermissions(null);
    setFilteredPermissions([]);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [permRes, usersRes] = await Promise.all([
        axiosInstance.get("/permissions/?skip=0&limit=100"),
        axiosInstance.get("/users/?skip=0&limit=100&active_only=false"),
      ]);

      const usersArray = Array.isArray(usersRes?.data?.data)
        ? usersRes.data.data
        : [];

      const map = {};
      for (const u of usersArray) map[u.employee_code] = u;

      const permList = usersArray.map((user) => ({
        user_id: user.employee_code,
        user,
        permissions: user.permissions || [],
      }));

      setPermissions(permList);
      setUsersByCode(map);
      setUsersTotal(usersRes?.data?.pagination?.total ?? usersArray.length);
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Failed to load users/permissions" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPermissions = async () => {
    await fetchAllData();
  };

  const loadUserPermissions = async (userId, permissions = []) => {
    try {
      setSelectedUser(userId);
      setLoading(true);

      const userData = usersByCode[userId];
      if (!userData) throw new Error("User data not found");

      const deptId = userData.department_id;
      if (!deptId) throw new Error("User does not have a department");

      const deptRes = await axiosInstance.get(`/departments/${deptId}`);
      const availablePermissions = deptRes?.data?.available_permissions || [];

      const permissionsObj = {};
      availablePermissions.forEach((perm) => {
        permissionsObj[perm] = permissions.includes(perm);
      });

      permissionsObj.user_id = userId;
      permissionsObj.user = userData;

      setSelectedUserPermissions(permissionsObj);
    } catch (err) {
      console.error(err);
      ErrorHandling({
        error: err,
        defaultError: `Could not load user permissions for ${userId}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (perm) => {
    try {
      const res = await axiosInstance.patch(
        `/permissions/user/${selectedUser}/toggle/${perm}`
      );
      toast.success(res.data?.message || `Toggled ${perm}`);
      const userData = usersByCode[selectedUser];
      if (userData) {
        loadUserPermissions(selectedUser, userData.permissions);
      }
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: `Failed to toggle ${perm}` });
    }
  };

  const resetToDefault = async () => {
    try {
      const res = await axiosInstance.post(
        `/permissions/user/${selectedUser}/reset-defaults`
      );
      toast.success(res.data?.message || "Reset to default");
      const userData = usersByCode[selectedUser];
      if (userData) {
        loadUserPermissions(selectedUser, userData.permissions);
      }
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Failed to reset permissions" });
    }
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      const enabledPermissions = getPermissionKeys(selectedUserPermissions).filter(
        (p) => selectedUserPermissions[p]
      );
      await axiosInstance.put(`/permissions/user/${selectedUser}`, {
        permissions: enabledPermissions,
      });
      toast.success("Permissions updated successfully");
      await fetchAllPermissions();
      clearSelection();
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (perm) => {
    setSelectedUserPermissions((prev) => ({
      ...prev,
      [perm]: !prev[perm],
    }));
  };

  const groupedPermissions =
    selectedUserPermissions && filteredPermissions.length > 0
      ? filteredPermissions.reduce((acc, perm) => {
          const category = getPermissionCategory(perm);
          if (!acc[category]) acc[category] = [];
          acc[category].push(perm);
          return acc;
        }, {})
      : {};

  const enabledPermissions = selectedUserPermissions
    ? getPermissionKeys(selectedUserPermissions).filter(
        (key) => selectedUserPermissions[key]
      ).length
    : 0;

  const totalPermissions = selectedUserPermissions
    ? getPermissionKeys(selectedUserPermissions).length
    : 0;

  const mergedPermissionUsers = useMemo(() => {
    const list = permissions.map((row) => {
      const fromUsers = usersByCode[row.user_id];
      const name = fromUsers?.name ?? row.user?.name ?? row.user_id ?? "Unknown";
      const role =
        fromUsers?.profile_role?.name ?? row.user?.role ?? "Role not assigned";
      const email =
        fromUsers?.email ?? row.user?.email ?? "Email not available";
      return {
        ...row,
        _display: { name, role, email },
      };
    });

    const filtered = list.filter(
      (r) => r._display.role?.toUpperCase() !== "SUPERADMIN"
    );

    const q = query.trim().toLowerCase();
    if (!q) return filtered;

    return filtered.filter((r) => {
      const { name, role, email } = r._display;
      return (
        (name || "").toLowerCase().includes(q) ||
        (role || "").toLowerCase().includes(q) ||
        (email || "").toLowerCase().includes(q) ||
        (r.user_id || "").toLowerCase().includes(q)
      );
    });
  }, [permissions, usersByCode, query]);

  const handlePermissionFilter = (filtered) => {
    setFilteredPermissions(filtered);
  };

  return (
    <div className="theme-perms min-h-screen p-4 sm:p-6 lg:p-8" style={styles.page}>
      <style dangerouslySetInnerHTML={{ __html: styles.placeholder }} />
      <div className="mx-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: "var(--theme-text)" }}>
              <div className="rounded-full p-3" style={styles.softPill("--theme-primary")}>
                <Shield className="w-8 h-8" style={{ color: "var(--theme-primary)" }} />
              </div>
              Permission Management
            </h1>
            <p className="flex items-center gap-2" style={{ color: "var(--theme-text-muted)" }}>
              <Settings className="w-4 h-4" />
              Manage user permissions and access controls
            </p>
          </div>
          <button
            onClick={fetchAllPermissions}
            className="px-6 py-3 rounded-xl transition-all duration-200"
            style={styles.btn("--theme-primary")}
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[ 
            {
              title: "Total Users",
              value: usersTotal || permissions.length,
              icon: <Users className="w-6 h-6" style={{ color: "var(--theme-primary)" }} />,
              pill: styles.softPill("--theme-primary"),
            },
            {
              title: "Total Permissions",
              value: totalPermissions,
              icon: <Shield className="w-6 h-6" style={{ color: "var(--theme-success)" }} />,
              pill: styles.softPill("--theme-success"),
            },
            {
              title: "Selected User",
              value: selectedUser || "None",
              icon: <User className="w-6 h-6" style={{ color: "var(--theme-warning)" }} />,
              pill: styles.softPill("--theme-warning"),
            },
            {
              title: "Enabled Permissions",
              value: `${enabledPermissions}/${totalPermissions}`,
              icon: <CheckCircle className="w-6 h-6" style={{ color: "var(--theme-warning)" }} />,
              pill: styles.softPill("--theme-warning"),
            },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl shadow-lg px-3 py-6 border" style={styles.card}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide mb-1" style={{ color: "var(--theme-text-muted)" }}>
                    {c.title}
                  </p>
                  <p className="text-xl font-bold" style={{ color: "var(--theme-text)" }}>
                    {c.value}
                  </p>
                </div>
                <div className="rounded-full p-3" style={c.pill}>
                  {c.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Users list */}
          <div className="rounded-2xl border overflow-hidden shadow-lg" style={styles.card}>
            <div className="px-6 py-4" style={styles.headerPrimary}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2" style={{ background: "color-mix(in oklab, var(--theme-primary) 20%, transparent)" }}>
                    <Users className="w-5 h-5" style={{ color: "var(--theme-primary-contrast)", color: "var(--theme-text)" }} />
                  </div>
                  <h2 className="text-xl font-semibold" style={{ color: "var(--theme-primary-contrast)",
                    color: "var(--theme-text)"
                   }}>
                    Users with Permissions
                  </h2>
                </div>
                <div className="w-56">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name/role/email"
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none transition"
                    style={{
                      ...styles.input,
                      border: "1px solid var(--theme-border)",
                      background: "color-mix(in oklab, var(--theme-card-bg) 85%, white 15%)",
                    }}
                    onFocus={(e) => Object.assign(e.currentTarget.style, { ...styles.input, ...styles.inputFocus })}
                    onBlur={(e) => Object.assign(e.currentTarget.style, {
                      ...styles.input,
                      border: "1px solid var(--theme-border)",
                      background: "color-mix(in oklab, var(--theme-card-bg) 85%, white 15%)",
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <LoadingState message="Loading users..." />
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <div className="space-y-2">
                    {mergedPermissionUsers?.map((row) => {
                      const isSelected = selectedUser === row.user_id;
                      const { name, email, role } = row._display;

                      return (
                        <div
                          key={row.user_id}
                          onClick={() => loadUserPermissions(row.user_id, row.permissions)}
                          className="group p-4 rounded-xl cursor-pointer transition-all duration-200 border"
                          style={{
                            background: isSelected ? "color-mix(in oklab, var(--theme-primary) 10%, transparent)" : "transparent",
                            borderColor: isSelected ? "color-mix(in oklab, var(--theme-primary) 40%, var(--theme-border))" : "var(--theme-border)",
                            color: "var(--theme-text)",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="rounded-full p-2"
                              style={{
                                background: isSelected
                                  ? "color-mix(in oklab, var(--theme-primary) 18%, transparent)"
                                  : "rgba(148,163,184,0.12)",
                              }}
                            >
                              <User
                                className="w-4 h-4"
                                style={{ color: isSelected ? "var(--theme-primary)" : "var(--theme-text-muted)" }}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                                {row.user_id}
                              </p>
                              <div className="flex justify-between gap-3">
                                <p className="font-medium" style={{ color: "var(--theme-text)" }}>
                                  {name}
                                </p>
                                <p className="text-sm" style={{ color: isSelected ? "var(--theme-primary)" : "var(--theme-text-muted)" }}>
                                  {role}
                                </p>
                              </div>
                              <p className="text-xs truncate" style={{ color: "var(--theme-text-muted)" }}>
                                {email}
                              </p>
                            </div>
                            {isSelected && (
                              <div style={{ color: "var(--theme-primary)" }}>
                                <Settings className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {mergedPermissionUsers.length === 0 && (
                      <div className="text-sm px-1 py-4" style={{ color: "var(--theme-text-muted)" }}>
                        No users found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Permissions editor */}
          <div className="rounded-2xl border overflow-hidden shadow-lg" style={styles.card}>
            {loading && selectedUser && <LoadingState message="Loading user permissions..." />}

            {!loading && selectedUserPermissions ? (
              <>
                <div className="px-6 py-4 flex justify-between items-center" style={styles.headerSecondary("--theme-success")}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2" style={{ background: "color-mix(in oklab, var(--theme-primary) 20%, transparent)" }}> 
                      <Settings className="w-5 h-5" style={{ color: "var(--theme-primary-contrast)", color: "var(--theme-text)" }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold" style={{ color: "var(--theme-primary-contrast)",
                    color: "var(--theme-text)"
                   }}>
                        Permissions Editor
                      </h2>
                      <p className="text-sm" style={{ color: "color-mix(in oklab, var(--theme-primary-contrast) 70%, transparent)",color: "var(--theme-text)" }}>
                        Editing:{" "}
                        <span className="font-medium">
                          {usersByCode[selectedUser]?.name ||
                            selectedUserPermissions?.user?.name ||
                            selectedUser}
                          {" ("}
                          {usersByCode[selectedUser]?.profile_role?.name ||
                            selectedUserPermissions?.user?.role ||
                            "Role N/A"}
                          {")"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="transition"
                    title="Close Editor"
                    style={{ color: "var(--theme-primary-contrast)" , color: "var(--theme-text)"}}
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6">
                  <SearchFilter
                    allItems={getPermissionKeys(selectedUserPermissions)}
                    onFilter={handlePermissionFilter}
                  />

                  <div className="max-h-[450px] overflow-auto mb-6">
                    <div className="space-y-6">
                      {Object.keys(groupedPermissions).length > 0 ? (
                        Object.entries(groupedPermissions).map(([category, perms]) => (
                          <div key={category} className="space-y-3">
                            <h3
                              className="text-lg font-semibold flex items-center gap-2 pb-2"
                              style={{ color: "var(--theme-text)", borderBottom: "1px solid var(--theme-border)" }}
                            >
                              <div className="rounded-full p-1" style={styles.softPill("--theme-primary")}>
                                <Shield className="w-4 h-4" style={{ color: "var(--theme-primary)" }} />
                              </div>
                              {category}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                              {perms.map((perm) => {
                                const IconComponent = getPermissionIcon(perm);
                                const isChecked = selectedUserPermissions[perm] || false;

                                return (
                                  <label
                                    key={perm}
                                    className="group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200"
                                    style={isChecked ? styles.chipOn : styles.chipOff}
                                    onClick={(e) => {
                                      // keep existing external toggle API usage optional
                                      e.preventDefault();
                                      handleCheckboxChange(perm);
                                    }}
                                  >
                                    <div className="relative">
                                      <input type="checkbox" className="sr-only" checked={isChecked} readOnly />
                                      <div
                                        className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200"
                                        style={{
                                          borderColor: isChecked ? "var(--theme-success)" : "var(--theme-border)",
                                          background: isChecked ? "var(--theme-success)" : "transparent",
                                        }}
                                      >
                                        {isChecked && <CheckSquare className="w-3 h-3" style={{ color: "#fff" }} />}
                                      </div>
                                    </div>

                                    <div
                                      className="rounded-full p-2"
                                      style={{
                                        background: isChecked
                                          ? "color-mix(in oklab, var(--theme-success) 20%, transparent)"
                                          : "rgba(148,163,184,0.12)",
                                      }}
                                    >
                                      <IconComponent
                                        className="w-4 h-4"
                                        style={{
                                          color: isChecked
                                            ? "var(--theme-success)"
                                            : "var(--theme-text-muted)",
                                        }}
                                      />
                                    </div>

                                    <div className="flex-1">
                                      <span
                                        className="font-medium capitalize"
                                        style={{ color: "var(--theme-text)" }}
                                      >
                                        {perm.replace(/_/g, " ")}
                                      </span>
                                      <p
                                        className="text-sm"
                                        style={{
                                          color: isChecked
                                            ? "var(--theme-success)"
                                            : "var(--theme-text-muted)",
                                        }}
                                      >
                                        {isChecked ? "Enabled" : "Disabled"}
                                      </p>
                                    </div>

                                    <div
                                      style={{
                                        color: isChecked
                                          ? "var(--theme-success)"
                                          : "var(--theme-text-muted)",
                                      }}
                                    >
                                      {isChecked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Search className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--theme-text-muted)" }} />
                          <p style={{ color: "var(--theme-text-muted)" }}>
                            No permissions found matching your search.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6" style={{ borderTop: "1px solid var(--theme-border)" }}>
                    <button
                      onClick={resetToDefault}
                      className="px-6 py-3 rounded-xl transition-all duration-200"
                      style={styles.btn("--theme-warning")}
                    >
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Reset to Default
                      </span>
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={styles.btn("--theme-primary")}
                    >
                      {saving ? (
                        <LoadingState message="Saving..." />
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          Update Permissions
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              !loading && (
                <div className="px-6 py-4" style={styles.headerSecondary("--theme-border")}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2" style={{ background: "rgba(255,255,255,0.12)" }}>
                      <Settings className="w-5 h-5" style={{ color: "var(--theme-primary-contrast)" }} />
                    </div>
                    <h2 className="text-xl font-semibold" style={{ color: "var(--theme-primary-contrast)" }}>
                      Permissions Editor
                    </h2>
                  </div>
                </div>
              )
            )}

            {!selectedUserPermissions && !loading && (
              <div className="p-6 flex flex-col items-center justify-center py-24">
                <div className="rounded-full p-6 mb-6" style={{ background: "rgba(148,163,184,0.12)" }}>
                  <User className="w-12 h-12" style={{ color: "var(--theme-text-muted)" }} />
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: "var(--theme-text)" }}>
                  No User Selected
                </h3>
                <p className="text-center max-w-sm" style={{ color: "var(--theme-text-muted)" }}>
                  Select a user from the list to view and edit their permissions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
