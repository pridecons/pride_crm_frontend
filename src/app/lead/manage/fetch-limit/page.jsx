"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Settings,
  Users,
  Building,
  Clock,
  Target,
  BarChart3,
  Download,
  Timer,
  TrendingUp,
  Search,
  ChevronRight,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import { ErrorHandling } from "@/helper/ErrorHandling";

export default function FetchLimitConfigPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  // --- existing state ---
  const [configs, setConfigs] = useState([]);
  const [roles, setRoles] = useState([]); // [{id, name}, ...]
  const [branches, setBranches] = useState([]);
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [form, setForm] = useState({
    role_id: "",
    branch_id: "",
    per_request_limit: "",
    daily_call_limit: "",
    assignment_ttl_hours: "",
    last_fetch_limit: "",
    old_lead_remove_days: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW: auth-derived role & branch (from cookie) ---
  const [role, setRole] = useState(null);
  const [myBranchId, setMyBranchId] = useState(null);
  const isSuperAdmin = String(role || "").toUpperCase() === "SUPERADMIN";

  // Map role_id -> role_name
  const roleMap = useMemo(
    () =>
      Object.fromEntries((roles || []).map((r) => [String(r.id), String(r.name)])),
    [roles]
  );
  const getRoleName = (cfg) =>
    roleMap[String(cfg.role_id)] || cfg.role_name || String(cfg.role_id);

  // --- read user_info cookie once ---
  useEffect(() => {
    try {
      const raw = Cookies.get("user_info");
      if (raw) {
        const u = JSON.parse(raw);

        const r =
          u?.role_name ||
          u?.role ||
          u?.user?.role_name ||
          u?.user?.role ||
          u?.user_info?.role_name ||
          u?.user_info?.role ||
          null;

        const b =
          u?.branch_id ||
          u?.branch?.id ||
          u?.user?.branch_id ||
          u?.user?.branch?.id ||
          u?.user_info?.branch_id ||
          u?.user_info?.branch?.id ||
          null;

        if (r) setRole(String(r).toUpperCase());
        if (b != null) setMyBranchId(String(b));
      }
    } catch (e) {
      console.warn("Failed to parse user_info cookie:", e);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
    fetchRoles();
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, myBranchId]); // refetch when we learn role/branch

  // --- fetchers with branch gating ---
  const fetchConfigs = async () => {
    try {
      // Prefer server-side filtering if available
      if (!isSuperAdmin && myBranchId) {
        try {
          const { data } = await axiosInstance.get(
            `/lead-fetch-config/?branch_id=${myBranchId}`
          );
          setConfigs(Array.isArray(data) ? data : []);
          return;
        } catch (e) {
          console.warn("Server branch filter failed, falling back to client filter:", e);
        }
      }

      // Fallback: fetch all and client-filter later
      const { data } = await axiosInstance.get("/lead-fetch-config/");
      setConfigs(Array.isArray(data) ? data : []);
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to load configurations" });
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await axiosInstance.get("/profile-role/");
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to load roles" });
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      const all = Array.isArray(data) ? data : [];
      if (isSuperAdmin) {
        setBranches(all);
      } else if (myBranchId) {
        const mine = all.find((b) => String(b.id) === String(myBranchId));
        setBranches(mine ? [mine] : []); // non-SA only sees own branch in dropdowns
      } else {
        setBranches([]); // unknown branch, keep empty
      }
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to load branches" });
    }
  };

  // --- form helpers / lifecycle ---
  const resetForm = () => {
    setForm({
      role_id: "",
      branch_id: isSuperAdmin ? "" : String(myBranchId || ""), // lock branch for non-SA
      per_request_limit: "",
      daily_call_limit: "",
      assignment_ttl_hours: "",
      last_fetch_limit: "",
      old_lead_remove_days: "",
    });
    setEditingId(null);
    setIsCreateNew(false);
  };

  const handleCreateClick = () => {
    resetForm();
    setIsCreateNew(true);
  };

  const handleEditClick = (cfg) => {
    setEditingId(cfg.id);
    setForm({
      role_id: String(cfg.role_id),
      // lock to own branch if not superadmin
      branch_id: String(isSuperAdmin ? cfg.branch_id : myBranchId || cfg.branch_id),
      per_request_limit: String(cfg.per_request_limit),
      daily_call_limit: String(cfg.daily_call_limit),
      assignment_ttl_hours: String(cfg.assignment_ttl_hours),
      last_fetch_limit: String(cfg.last_fetch_limit),
      old_lead_remove_days: String(cfg.old_lead_remove_days ?? ""),
    });
    setIsCreateNew(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // force branch for non-superadmin
    const branch_id_final = isSuperAdmin ? form.branch_id : myBranchId;

    const payload = {
      role_id: String(form.role_id),
      branch_id: Number(branch_id_final),
      per_request_limit: Number(form.per_request_limit),
      daily_call_limit: Number(form.daily_call_limit),
      assignment_ttl_hours: Number(form.assignment_ttl_hours),
      last_fetch_limit: Number(form.last_fetch_limit),
      old_lead_remove_days: Number(form.old_lead_remove_days),
    };

    try {
      if (editingId) {
        await axiosInstance.put(`/lead-fetch-config/${editingId}`, payload);
        toast.success("Configuration updated");
      } else {
        await axiosInstance.post("/lead-fetch-config/", payload);
        toast.success("Configuration created");
      }
      await fetchConfigs();
      resetForm();
    } catch (error) {
      ErrorHandling({ error, defaultError: "Save failed! Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this configuration?")) return;
    try {
      await axiosInstance.delete(`/lead-fetch-config/${id}`);
      toast.success("Deleted");
      await fetchConfigs();
    } catch (error) {
      ErrorHandling({ error, defaultError: "Delete failed!" });
    }
  };

  // --- DATA GATING ---
  // Gate to branch for non-superadmin
  const branchGated = useMemo(() => {
    if (isSuperAdmin) return configs;
    if (!myBranchId) return []; // if we don't know user's branch yet, show none
    return configs.filter((c) => String(c.branch_id) === String(myBranchId));
  }, [configs, isSuperAdmin, myBranchId]);

  // Search against gated data
  const filtered = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return branchGated.filter((c) => {
      const rn = getRoleName(c)?.toLowerCase?.() || "";
      const bn = (c.branch_name || "").toLowerCase();
      return rn.includes(q) || bn.includes(q);
    });
  }, [branchGated, searchTerm, getRoleName]);

  // Stats computed from gated data
  const totalConfigs = branchGated.length;
  const totalDailyLimit = branchGated.reduce((sum, c) => sum + (c.daily_call_limit || 0), 0);
  const averagePerRequest =
    branchGated.length > 0
      ? Math.round(
          branchGated.reduce((sum, c) => sum + (c.per_request_limit || 0), 0) /
            branchGated.length
        )
      : 0;
  const uniqueRoles = new Set(branchGated.map((c) => getRoleName(c))).size;

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-6">
        <span onClick={() => router.push("/dashboard")} className="cursor-pointer hover:underline">
          Dashboard
        </span>
        <ChevronRight className="mx-2 w-4 h-4" />
        <span className="font-medium text-gray-700">Fetch Limits</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Fetch Limit Configuration</h1>
        {hasPermission("fetch_limit_create_new") && !isCreateNew && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create New
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Settings />} label="Total Configs" value={totalConfigs} color="indigo" />
        <StatCard icon={<BarChart3 />} label="Total Daily Limit" value={totalDailyLimit} color="blue" />
        <StatCard icon={<TrendingUp />} label="Avg Per Request" value={averagePerRequest} color="green" />
        <StatCard icon={<Users />} label="Unique Roles" value={uniqueRoles} color="purple" />
      </div>

      {/* Form */}
      {isCreateNew && (
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Configuration" : "Create Configuration"}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                icon={<Users />}
                label="Role"
                value={form.role_id}
                onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                options={[
                  { value: "", label: "Select role" },
                  ...roles.map((r) => ({ value: String(r.id), label: r.name })),
                ]}
                required
              />

              {/* Branch: SUPERADMIN can choose; others see locked branch */}
              {isSuperAdmin ? (
                <SelectField
                  icon={<Building />}
                  label="Branch"
                  value={form.branch_id}
                  onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
                  options={[
                    { value: "", label: "Select branch" },
                    ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                  ]}
                  required
                />
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building />
                    Branch
                  </label>
                  {/* hidden input to submit branch */}
                  <input type="hidden" value={myBranchId || ""} />
                  <div className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-700">
                    {branches?.[0]?.name || "Your Branch"}
                  </div>
                </div>
              )}

              <InputField
                icon={<Clock />}
                label="Old Lead Remove (days)"
                type="number"
                value={form.old_lead_remove_days}
                onChange={(e) =>
                  setForm((f) => ({ ...f, old_lead_remove_days: e.target.value }))
                }
                required
              />
              <InputField
                icon={<Target />}
                label="Per Request Limit"
                type="number"
                value={form.per_request_limit}
                onChange={(e) => setForm((f) => ({ ...f, per_request_limit: e.target.value }))}
                required
              />
              <InputField
                icon={<BarChart3 />}
                label="Daily Call Limit"
                type="number"
                value={form.daily_call_limit}
                onChange={(e) => setForm((f) => ({ ...f, daily_call_limit: e.target.value }))}
                required
              />
              <InputField
                icon={<Download />}
                label="Last Fetch Threshold"
                type="number"
                value={form.last_fetch_limit}
                onChange={(e) => setForm((f) => ({ ...f, last_fetch_limit: e.target.value }))}
                required
              />
              <InputField
                icon={<Timer />}
                label="Assignment TTL (hours)"
                type="number"
                value={form.assignment_ttl_hours}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assignment_ttl_hours: e.target.value }))
                }
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingId ? "Update" : "Create"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by role or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-72 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "ID",
                "Role",
                "Per Request",
                "Daily Limit",
                "Refetch Threshold",
                "Old Lead Remove",
                "TTL (hrs)",
                "Branch",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((cfg) => (
              <tr key={cfg.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">#{cfg.id}</td>
                <td className="px-6 py-4">{getRoleName(cfg)}</td>
                <td className="px-6 py-4">{cfg.per_request_limit}</td>
                <td className="px-6 py-4">{cfg.daily_call_limit}</td>
                <td className="px-6 py-4">{cfg.last_fetch_limit}</td>
                <td className="px-6 py-4">{cfg.old_lead_remove_days}</td>
                <td className="px-6 py-4">{cfg.assignment_ttl_hours}h</td>
                <td className="px-6 py-4 max-w-xs truncate" title={cfg.branch_address}>
                  {cfg.branch_name}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {hasPermission("fetch_limit_edit") && (
                      <button
                        onClick={() => handleEditClick(cfg)}
                        className="p-2 rounded hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                    )}
                    {hasPermission("fetch_limit_delete") && (
                      <button
                        onClick={() => handleDelete(cfg.id)}
                        className="p-2 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm
                    ? `No configurations match "${searchTerm}".`
                    : "No configurations found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`bg-${color}-50 rounded-xl p-4 border border-${color}-100`}>
      <div className="flex items-center gap-3">
        <div className={`bg-${color}-100 rounded-full p-2`}>{icon}</div>
        <div>
          <p className={`text-sm font-medium text-${color}-600`}>{label}</p>
          <p className={`text-2xl font-bold text-${color}-900`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function SelectField({ icon, label, options = [], value, onChange, placeholder = "Select…" }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon}
          {label}
        </label>
      )}
      <select
        value={value ?? ""}
        onChange={onChange}
        className="w-full border border-gray-500 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputField({ icon, label, ...props }) {
  return (
    <div className="space-y-2 border-gray-700">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon}
        {label}
      </label>
      <input
        {...props}
        className="w-full border border-gray-500 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}
