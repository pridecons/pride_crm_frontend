"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, RefreshCw, Save } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { ErrorHandling } from "@/helper/ErrorHandling";

/** Optional: pretty labels for specific keys. */
const LABEL_OVERRIDES = {
  user_add_user: "Add User",
  user_edit_user: "Edit User",
  user_delete_user: "Delete User",
  user_view_user_details: "View User Details",
  user_all_roles: "All Roles (User)",
  lead_manage_page: "Lead Manage Page",
  lead_upload_page: "Lead Upload Page",
  lead_source_page: "Lead Source Page",
  lead_response_page: "Lead Response Page",
  new_lead_page: "New Lead Page",
  old_lead_page: "Old Lead Page",
  add_lead_page: "Add Lead Page",
  create_lead: "Create Lead",
  edit_lead: "Edit Lead",
  delete_lead: "Delete Lead",
  lead_transfer: "Lead Transfer",
  lead_recording_view: "Lead Recording View",
  lead_recording_upload: "Lead Recording Upload",
  client_page: "Client Page",
  client_comments: "Client Comments",
  client_story: "Client Story",
  client_invoice: "Client Invoice",
  payment_page: "Payment Page",
  permission_page: "Permission Page",
  fetch_limit_page: "Fetch Limit Page",
  fetch_limit_create_new: "Fetch Limit Create",
  fetch_limit_edit: "Fetch Limit Edit",
  fetch_limit_delete: "Fetch Limit Delete",
  email_page: "Email Page",
  email_add_temp: "Email Template Add",
  email_edit_temp: "Email Template Edit",
  email_view_temp: "Email Template View",
  email_delete_temp: "Email Template Delete",
  sms_page: "SMS Page",
  sms_add: "SMS Add",
  sms_edit: "SMS Edit",
  sms_delete: "SMS Delete",
  template: "Template",
  rational_status: "Rational Status",
  rational_edit: "Rational Edit",
  rational_download: "Rational Download",
  rational_pdf_model_view: "Rational PDF View",
  rational_pdf_model_download: "Rational PDF Download",
  rational_graf_model_view: "Rational Graph View",
  rational_add_recommadation: "Rational Add Recommendation",
  plane_page: "Plans Page",
  plans_create: "Plan Create",
  edit_plan: "Plan Edit",
  delete_plane: "Plan Delete",
  attandance_page: "Attendance Page",
  messanger_page: "Messenger Page",
  header_global_search: "Header Global Search",
  create_new_lead_response: "Create New Lead Response",
};

/** Turn snake_case into "Title Case" */
function humanizeKey(key) {
  if (!key) return "";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UserPermissionsModal({ isOpen, onClose, user }) {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && user?.employee_code) {
      fetchPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.employee_code]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/permissions/user/${user.employee_code}`);
      setPermissions(res.data || {});
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to load permissions"});
    } finally {
      setLoading(false);
    }
  };

  /** Only toggle boolean keys; ignore non-boolean values */
  const handleToggle = (key) => {
    setPermissions((prev) => {
      const value = prev?.[key];
      if (typeof value !== "boolean") return prev;
      return { ...prev, [key]: !value };
    });
  };

  /** Save ONLY boolean fields back to the API */
  const handleSave = async () => {
    setSaving(true);
    try {
      const booleanPayload = Object.fromEntries(
        Object.entries(permissions).filter(([_, v]) => typeof v === "boolean")
      );
      await axiosInstance.put(`/permissions/user/${user.employee_code}`, booleanPayload);
      toast.success("Permissions updated successfully!");
      onClose?.();
    } catch(err) {
       ErrorHandling({ error: err, defaultError: "Failed to updated permissions"});
    } finally {
      setSaving(false);
    }
  };

  /** Reset to defaults then reload */
  const handleReset = async () => {
    try {
      await axiosInstance.post(`/permissions/user/${user.employee_code}/reset-defaults`);
      toast.success("Permissions reset to default!");
      fetchPermissions();
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to reset permissions"});
    }
  };

  // Build entries from API. When closed, keep this cheap.
  const allEntries = useMemo(() => {
    return isOpen ? Object.entries(permissions || {}) : [];
  }, [permissions, isOpen]);

  // Filter by search (on key, pretty label, or value)
  const filteredEntries = useMemo(() => {
    const q = (search || "").toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(([k, v]) => {
      const label = LABEL_OVERRIDES[k] || humanizeKey(k);
      return (
        k.toLowerCase().includes(q) ||
        String(v).toLowerCase().includes(q) ||
        label.toLowerCase().includes(q)
      );
    });
  }, [allEntries, search]);

  // Guard AFTER hooks so hook order never changes
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">
            Set Permissions for {user?.name} ({user?.employee_code})
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-6 pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by key, label, or value…"
            className="w-full sm:max-w-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              <RefreshCw className="w-4 h-4" /> Reset Defaults
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Dynamic grid of ALL keys from API */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredEntries.map(([key, value]) => {
                  const label = LABEL_OVERRIDES[key] || humanizeKey(key);
                  const isBool = typeof value === "boolean";
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-xl shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-gray-800 font-medium">{label}</span>
                        <span className="text-xs text-gray-500 break-all">{key}</span>
                      </div>

                      {isBool ? (
                        <button
                          onClick={() => handleToggle(key)}
                          className={`w-14 h-7 flex items-center rounded-full p-1 transition ${
                            value ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"
                          }`}
                        >
                          <span className="w-5 h-5 bg-white rounded-full shadow-md" />
                        </button>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-md bg-white border text-gray-700">
                          {String(value)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Raw JSON viewer */}
              <details className="mt-6 rounded-xl bg-gray-50 border">
                <summary className="cursor-pointer px-4 py-2 font-medium text-gray-700">
                  Raw API response
                </summary>
                <pre className="p-4 text-sm overflow-auto">
{JSON.stringify(permissions, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between">
          <div />
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
