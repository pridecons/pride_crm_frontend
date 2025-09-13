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
  Search, // ⬅️ added
} from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import LoadingState from "@/components/LoadingState"; // Adjust the import path if needed
import { ErrorHandling } from "@/helper/ErrorHandling";

// ---------- SearchFilter (from first page) ----------
function SearchFilter({ allItems, onFilter }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!allItems || allItems.length === 0) {
      onFilter([]);
      return;
    }

    // If search is empty, return all items
    if (!value.trim()) {
      onFilter(allItems);
      return;
    }

    // Filter items based on search term
    const filtered = allItems.filter((item) => {
      const searchValue = value.toLowerCase();
      return (
        item.toLowerCase().includes(searchValue) ||
        item.replace(/_/g, " ").toLowerCase().includes(searchValue)
      );
    });

    onFilter(filtered);
  };

  return (
    <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        placeholder="Search permissions..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg
                   focus:ring-2 focus:ring-blue-400 focus:border-transparent
                   transition-all duration-200 text-gray-900 placeholder-gray-500"
      />
    </div>
  );
}
// ----------------------------------------------------

// Get permission keys, filter out meta fields
const getPermissionKeys = (permObj) =>
  Object.keys(permObj || {}).filter((k) => !["user_id", "user", "id"].includes(k));

// Permission Icon helper
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
    
    // ⬇️ ADD NEW MAPPINGS FOR YOUR ACTUAL API PERMISSIONS
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

// Categorize dynamically
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
  const [permissions, setPermissions] = useState([]); // list of permission rows (user_id + booleans)
  const [usersByCode, setUsersByCode] = useState({}); // employee_code -> user object
  const [usersTotal, setUsersTotal] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState(""); // search for users list (left pane)

  // ⬇️ NEW: state to hold filtered permission keys (right pane)
  const [filteredPermissions, setFilteredPermissions] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  // When a user is selected / data loaded, initialize permission filter to all keys
  useEffect(() => {
    if (selectedUserPermissions) {
      const allPerms = getPermissionKeys(selectedUserPermissions);
      setFilteredPermissions(allPerms);
    } else {
      setFilteredPermissions([]);
    }
  }, [selectedUserPermissions]);

  // Helper to clear current selection
  const clearSelection = () => {
    setSelectedUser(null);
    setSelectedUserPermissions(null);
    setFilteredPermissions([]);
  };

  // Fetch permissions + users together and merge by employee_code/user_id
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [permRes, usersRes] = await Promise.all([
        axiosInstance.get("/permissions/?skip=0&limit=100"),
        axiosInstance.get("/users/?skip=0&limit=100&active_only=false"),
      ]);

      // ⬇️ FIXED: Handle the actual API response structure
      // The /permissions/ endpoint returns array of permission strings, not user permissions
      // We need to get user permissions separately or use the permissions from users API
      const usersArray = Array.isArray(usersRes?.data?.data) ? usersRes.data.data : [];

      // ⬇️ FIXED: Create usersByCode mapping correctly
      const map = {};
      for (const u of usersArray) {
        map[u.employee_code] = u;
      }

      // ⬇️ FIXED: Since /permissions/ returns available permissions list, not user permissions
      // We'll use the users data which should contain permissions for each user
      const permList = usersArray.map(user => ({
        user_id: user.employee_code,
        user: user,
        permissions: user.permissions || []
      }));

      setPermissions(permList);
      setUsersByCode(map);
      setUsersTotal(usersRes?.data?.pagination?.total ?? usersArray.length);
    } catch (err) {
      console.error(err);
       ErrorHandling({ error: err, defaultError: "Failed to load users/permissions"});
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

    // ✅ Get department ID from user
    const deptId = userData.department_id;
    if (!deptId) throw new Error("User does not have a department");

    // ✅ Fetch department details
    const deptRes = await axiosInstance.get(`/departments/${deptId}`);
    const availablePermissions = deptRes?.data?.available_permissions || [];

    // ✅ Build permissions object based on department permissions
    const permissionsObj = {};
    availablePermissions.forEach((perm) => {
      permissionsObj[perm] = permissions.includes(perm); // enabled if in user's permissions
    });

    // Add meta
    permissionsObj.user_id = userId;
    permissionsObj.user = userData;

    setSelectedUserPermissions(permissionsObj);
  } catch (err) {
    console.error(err);
    ErrorHandling({ error: err, defaultError: `Could not load user permissions for ${userId}` });
  } finally {
    setLoading(false);
  }
};

  const togglePermission = async (perm) => {
    try {
      const res = await axiosInstance.patch(`/permissions/user/${selectedUser}/toggle/${perm}`);
      toast.success(res.data?.message || `Toggled ${perm}`);
      // ⬇️ FIXED: Get user data and reload permissions
      const userData = usersByCode[selectedUser];
      if (userData) {
        loadUserPermissions(selectedUser, userData.permissions);
      }
    } catch (err) {
      console.error(err);
       ErrorHandling({ error: err, defaultError: `Failed to toggle ${perm}`});
    }
  };

  const resetToDefault = async () => {
    try {
      const res = await axiosInstance.post(`/permissions/user/${selectedUser}/reset-defaults`);
      toast.success(res.data?.message || "Reset to default");
      // ⬇️ FIXED: Get user data and reload permissions
      const userData = usersByCode[selectedUser];
      if (userData) {
        loadUserPermissions(selectedUser, userData.permissions);
      }
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Failed to reset permissions"});
    }
  };

 const handleUpdate = async () => {
    try {
      setSaving(true);
      
      // Convert permissions object to array of enabled permission names
      const enabledPermissions = getPermissionKeys(selectedUserPermissions)
        .filter(perm => selectedUserPermissions[perm]);
      
      const requestBody = {
        permissions: enabledPermissions
      };
      
      await axiosInstance.put(`/permissions/user/${selectedUser}`, requestBody);
      toast.success("Permissions updated successfully");
      await fetchAllPermissions();
      clearSelection();
    } catch (err) {
      console.error(err);
       ErrorHandling({ error: err, defaultError: "Update failed"});
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

  // ⬇️ NEW: get filtered permissions grouped by category (uses filteredPermissions)
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
    ? getPermissionKeys(selectedUserPermissions).filter((key) => selectedUserPermissions[key]).length
    : 0;

  const totalPermissions = selectedUserPermissions
    ? getPermissionKeys(selectedUserPermissions).length
    : 0;

  // ⬇️ FIXED: Derived "display list" of users with merged user info from usersByCode
  const mergedPermissionUsers = useMemo(() => {
    const list = permissions.map((row) => {
      const fromUsers = usersByCode[row.user_id];
      const name = fromUsers?.name ?? row.user?.name ?? row.user_id ?? "Unknown";
      const role = fromUsers?.profile_role?.name ?? row.user?.role ?? "Role not assigned";
      const email = fromUsers?.email ?? row.user?.email ?? "Email not available";
      return {
        ...row,
        _display: { name, role, email },
      };
    });

    // 🚫 Filter out SUPERADMIN
    const filtered = list.filter((r) => r._display.role?.toUpperCase() !== "SUPERADMIN");

    // simple search by name/role/email/user_id
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

  // ⬇️ NEW: wrapper to handle SearchFilter callback
  const handlePermissionFilter = (filtered) => {
    setFilteredPermissions(filtered);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-2">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <div className="bg-blue-100 rounded-full p-3">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              Permission Management
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Manage user permissions and access controls
            </p>
          </div>
          <button
            onClick={fetchAllPermissions}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {usersTotal || permissions.length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-full p-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Total Permissions
                </p>
                <p className="text-3xl font-bold text-gray-900">{totalPermissions}</p>
              </div>
              <div className="bg-green-50 rounded-full p-3">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Selected User
                </p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {selectedUser || "None"}
                </p>
              </div>
              <div className="bg-purple-50 rounded-full p-3">
                <User className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Enabled Permissions
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {enabledPermissions}/{totalPermissions}
                </p>
              </div>
              <div className="bg-amber-50 rounded-full p-3">
                <CheckCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enhanced Users List */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Users with Permissions</h2>
                </div>
                {/* Quick search for users */}
                <div className="w-56">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name/role/email"
                    className="w-full text-sm rounded-lg px-3 py-2 bg-white/90 outline-none focus:ring-2 ring-white/60 placeholder:text-gray-500"
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
                          className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                            isSelected
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "hover:bg-gray-50 border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`rounded-full p-2 ${
                                isSelected ? "bg-blue-100" : "bg-gray-100 group-hover:bg-gray-200"
                              }`}
                            >
                              <User
                                className={`w-4 h-4 ${
                                  isSelected ? "text-blue-600" : "text-gray-600"
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <p className={`text-xs ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                                {row.user_id}
                              </p>
                              <div className="flex justify-between gap-3">
                                <p className={`font-medium ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                                  {name}
                                </p>
                                <p className={`text-sm ${isSelected ? "text-blue-600" : "text-gray-500"}`}>
                                  {role}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{email}</p>
                            </div>
                            {isSelected && (
                              <div className="text-blue-600">
                                <Settings className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {mergedPermissionUsers.length === 0 && (
                      <div className="text-sm text-gray-500 px-1 py-4">No users found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Permissions Editor */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {loading && selectedUser && <LoadingState message="Loading user permissions..." />}

            {!loading && selectedUserPermissions ? (
              <>
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Permissions Editor</h2>
                      <p className="text-green-100 text-sm">
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
                  {/* Close Button */}
                  <button
                    onClick={clearSelection}
                    className="text-white hover:text-gray-200 transition"
                    title="Close Editor"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6">
                  {/* ⬇️ NEW: permission search box */}
                  <SearchFilter
                    allItems={getPermissionKeys(selectedUserPermissions)}
                    onFilter={handlePermissionFilter}
                  />

                  <div className="max-h-[450px] overflow-auto mb-6">
                    <div className="space-y-6">
                      {Object.keys(groupedPermissions).length > 0 ? (
                        Object.entries(groupedPermissions).map(([category, perms]) => (
                          <div key={category} className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-200 pb-2">
                              <div className="bg-blue-50 rounded-full p-1">
                                <Shield className="w-4 h-4 text-blue-600" />
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
                                    className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                      isChecked
                                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                    }`}
                                  >
                                    <div className="relative">
                                      <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isChecked}
                                        onChange={() => handleCheckboxChange(perm)}
                                      />
                                      <div
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                          isChecked
                                            ? "bg-green-500 border-green-500"
                                            : "bg-white border-gray-300 group-hover:border-gray-400"
                                        }`}
                                      >
                                        {isChecked && <CheckSquare className="w-3 h-3 text-white" />}
                                      </div>
                                    </div>

                                    <div
                                      className={`rounded-full p-2 ${
                                        isChecked ? "bg-green-100" : "bg-gray-100 group-hover:bg-gray-200"
                                      }`}
                                    >
                                      <IconComponent
                                        className={`w-4 h-4 ${isChecked ? "text-green-600" : "text-gray-600"}`}
                                      />
                                    </div>

                                    <div className="flex-1">
                                      <span
                                        className={`font-medium capitalize ${
                                          isChecked ? "text-green-900" : "text-gray-900"
                                        }`}
                                      >
                                        {perm.replace(/_/g, " ")}
                                      </span>
                                      <p className={`text-sm ${isChecked ? "text-green-600" : "text-gray-500"}`}>
                                        {isChecked ? "Enabled" : "Disabled"}
                                      </p>
                                    </div>

                                    <div className={`${isChecked ? "text-green-600" : "text-gray-400"}`}>
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
                          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No permissions found matching your search.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                    <button
                      onClick={resetToDefault}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset to Default
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      {saving ? (
                        <>
                          <LoadingState message="Saving..." />
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Update Permissions
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              !loading && (
                <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Permissions Editor</h2>
                  </div>
                </div>
              )
            )}

            {!selectedUserPermissions && !loading && (
              <div className="p-6 flex flex-col items-center justify-center py-24">
                <div className="bg-gray-100 rounded-full p-6 mb-6">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No User Selected</h3>
                <p className="text-gray-500 text-center max-w-sm">
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
