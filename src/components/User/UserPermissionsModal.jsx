"use client";

import { useEffect, useState } from "react";
import { X, Loader2, RefreshCw, Save } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";

const PERMISSION_LABELS = {
  add_user: "Add User",
  edit_user: "Edit User",
  delete_user: "Delete User",
  add_lead: "Add Lead",
  edit_lead: "Edit Lead",
  delete_lead: "Delete Lead",
  view_users: "View Users",
  view_lead: "View Leads",
  view_branch: "View Branch",
  view_accounts: "View Accounts",
  view_research: "View Research",
  view_client: "View Client",
  view_payment: "View Payment",
  view_invoice: "View Invoice",
  view_kyc: "View KYC",
  approval: "Approval",
  internal_mailing: "Internal Mailing",
  chatting: "Chatting",
  targets: "Targets",
  reports: "Reports",
  fetch_lead: "Fetch Lead",
};

export default function UserPermissionsModal({ isOpen, onClose, user }) {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.employee_code) {
      fetchPermissions();
    }
  }, [user]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/permissions/user/${user.employee_code}`);
      setPermissions(res.data);
    } catch (err) {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(`/permissions/user/${user.employee_code}`, permissions);
      toast.success("Permissions updated successfully!");
      onClose();
    } catch {
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await axiosInstance.post(`/permissions/user/${user.employee_code}/reset-defaults`);
      toast.success("Permissions reset to default!");
      fetchPermissions();
    } catch {
      toast.error("Failed to reset permissions");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">
            Set Permissions for {user?.name} ({user?.employee_code})
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-xl shadow-sm"
                >
                  <span className="text-gray-700 font-medium">{label}</span>
                  <button
                    onClick={() => handleToggle(key)}
                    className={`w-14 h-7 flex items-center rounded-full p-1 transition ${
                      permissions[key]
                        ? "bg-green-500 justify-end"
                        : "bg-gray-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 bg-white rounded-full shadow-md"></span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            <RefreshCw className="w-4 h-4" /> Reset Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
