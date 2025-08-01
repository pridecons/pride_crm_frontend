"use client";

import { useEffect, useState } from "react";

import {
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
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
  Activity,
  CheckSquare,
  Square
} from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";

const PERMISSION_LIST = [
  "add_user", "edit_user", "delete_user",
  "add_lead", "edit_lead", "delete_lead",
  "view_users", "view_lead", "view_branch",
  "view_accounts", "view_research", "view_client",
  "view_payment", "view_invoice", "view_kyc",
  "approval", "internal_mailing", "chatting",
  "targets", "reports", "fetch_lead",
];

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllPermissions();
  }, []);

  const fetchAllPermissions = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        "/permissions/?skip=0&limit=100"
      );
      setPermissions(res.data);
    } catch (err) {
      toast.error("Failed to load permissions list");
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId) => {
    try {
      setSelectedUser(userId);
      setLoading(true);
      const res = await axiosInstance.get(
        `/permissions/user/${userId}`
      );
      setSelectedUserPermissions(res.data);
    } catch (err) {
      toast.error(`Could not load user permissions for ${userId}`);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (perm) => {
    try {
      const res = await axiosInstance.patch(
        `/permissions/user/${selectedUser}/toggle/${perm}`
      );
      toast.success(res.data.message);
      loadUserPermissions(selectedUser);
    } catch (err) {
      toast.error(`Failed to toggle ${perm}`);
    }
  };

  const resetToDefault = async () => {
    try {
      const res = await axiosInstance.post(
        `/permissions/user/${selectedUser}/reset-defaults`
      );
      toast.success(res.data.message);
      loadUserPermissions(selectedUser);
    } catch (err) {
      toast.error("Failed to reset permissions");
    }
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      await axiosInstance.put(
        `/permissions/user/${selectedUser}`,
        selectedUserPermissions
      );
      toast.success("Permissions updated successfully");
      fetchAllPermissions();
    } catch (err) {
      toast.error("Update failed");
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
      fetch_lead: Download,
    };
    return iconMap[perm] || Settings;
  };

  const getPermissionCategory = (perm) => {
    if (perm.includes('user')) return 'User Management';
    if (perm.includes('lead')) return 'Lead Management';
    if (perm.includes('view_')) return 'View Access';
    if (perm.includes('payment') || perm.includes('invoice') || perm.includes('accounts')) return 'Financial';
    return 'General';
  };

  const groupedPermissions = PERMISSION_LIST.reduce((acc, perm) => {
    const category = getPermissionCategory(perm);
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {});

  const enabledPermissions = selectedUserPermissions
    ? Object.keys(selectedUserPermissions).filter(key => selectedUserPermissions[key]).length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
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
                <p className="text-3xl font-bold text-gray-900">{permissions.length}</p>
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
                <p className="text-3xl font-bold text-gray-900">{PERMISSION_LIST.length}</p>
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
                  {enabledPermissions}/{PERMISSION_LIST.length}
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
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">Users with Permissions</h2>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                  <p className="text-gray-500">Loading users...</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <div className="space-y-2">
                    {permissions.map((user) => (
                      <div
                        key={user.user_id}
                        onClick={() => loadUserPermissions(user.user_id)}
                        className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 border ${selectedUser === user.user_id
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "hover:bg-gray-50 border-gray-100 hover:border-gray-200"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-full p-2 ${selectedUser === user.user_id
                            ? "bg-blue-100"
                            : "bg-gray-100 group-hover:bg-gray-200"
                            }`}>
                            <User className={`w-4 h-4 ${selectedUser === user.user_id
                              ? "text-blue-600"
                              : "text-gray-600"
                              }`} />
                          </div>
                          <div className="flex-1">
                            <p className={`text-xs ${selectedUser === user.user_id
                              ? "text-blue-900"
                              : "text-gray-900"
                              }`}>
                              {user.user_id}
                            </p>
                            <div className="flex justify-between">
                            <p className={`font-medium ${selectedUser === user.user_id ? "text-blue-900" : "text-gray-900"}`}>
                              {user.user?.name || user.user_id}
                            </p>
                            <p className={`text-sm ${selectedUser === user.user_id ? "text-blue-600" : "text-gray-500"}`}>
                              {user.user?.role || "Role not assigned"}
                            </p>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {user.user?.email || "Email not available"}
                            </p>
                          </div>
                          {selectedUser === user.user_id && (
                            <div className="text-blue-600">
                              <Settings className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Permissions Editor */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {selectedUserPermissions ? (
              <>
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        Permissions Editor
                      </h2>
                      <p className="text-green-100 text-sm">
                        Editing:
                        <span className="font-medium">
                          {selectedUserPermissions?.user?.name || selectedUser}
                          ({selectedUserPermissions?.user?.role || 'Role N/A'})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedUserPermissions(null);
                    }}
                    className="text-white hover:text-gray-200 transition"
                    title="Close Editor"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>


                <div className="p-6">
                  <div className="max-h-[450px] overflow-auto mb-6">
                    <div className="space-y-6">
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
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
                                  className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${isChecked
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
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${isChecked
                                      ? "bg-green-500 border-green-500"
                                      : "bg-white border-gray-300 group-hover:border-gray-400"
                                      }`}>
                                      {isChecked && (
                                        <CheckSquare className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                  </div>

                                  <div className={`rounded-full p-2 ${isChecked ? "bg-green-100" : "bg-gray-100 group-hover:bg-gray-200"
                                    }`}>
                                    <IconComponent className={`w-4 h-4 ${isChecked ? "text-green-600" : "text-gray-600"
                                      }`} />
                                  </div>

                                  <div className="flex-1">
                                    <span className={`font-medium capitalize ${isChecked ? "text-green-900" : "text-gray-900"
                                      }`}>
                                      {perm.replace(/_/g, " ")}
                                    </span>
                                    <p className={`text-sm ${isChecked ? "text-green-600" : "text-gray-500"
                                      }`}>
                                      {isChecked ? "Enabled" : "Disabled"}
                                    </p>
                                  </div>

                                  <div className={`${isChecked ? "text-green-600" : "text-gray-400"
                                    }`}>
                                    {isChecked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
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
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Permissions Editor</h2>
                </div>
              </div>
            )}

            {!selectedUserPermissions && (
              <div className="p-6 flex flex-col items-center justify-center py-24">
                <div className="bg-gray-100 rounded-full p-6 mb-6">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No User Selected
                </h3>
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