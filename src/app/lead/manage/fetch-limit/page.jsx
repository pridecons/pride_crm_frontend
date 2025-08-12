"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function FetchLimitConfigPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [form, setForm] = useState({
    role: "",
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

  useEffect(() => {
    fetchConfigs();
    fetchRoles();
    fetchBranches();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data } = await axiosInstance.get("/lead-fetch-config/?skip=0&limit=100");
      setConfigs(data);
    } catch {
      toast.error("Failed to load configurations");
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await axiosInstance.get("/profile-role/");
      setRoles(data);
    } catch {
      toast.error("Failed to load roles");
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await axiosInstance.get("/branches/?skip=0&limit=100&active_only=false");
      setBranches(data);
    } catch {
      toast.error("Failed to load branches");
    }
  };

  const resetForm = () => {
    setForm({
      role: "",
      branch_id: "",
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
      role: cfg.role,
      branch_id: String(cfg.branch_id),
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

    const payload = {
      role: form.role,
      branch_id: Number(form.branch_id),
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
    } catch {
      toast.error("Save failed! Please try again.");
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
    } catch {
      toast.error("Delete failed!");
    }
  };

  const filtered = configs.filter(
    (c) =>
      c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalConfigs = configs.length;
  const totalDailyLimit = configs.reduce((sum, c) => sum + c.daily_call_limit, 0);
  const averagePerRequest =
    configs.length > 0
      ? Math.round(
          configs.reduce((sum, c) => sum + c.per_request_limit, 0) / configs.length
        )
      : 0;
  const uniqueRoles = new Set(configs.map((c) => c.role)).size;

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-6">
        <span
          onClick={() => router.push("/dashboard")}
          className="cursor-pointer hover:underline"
        >
          Dashboard
        </span>
        <ChevronRight className="mx-2 w-4 h-4" />
        <span className="font-medium text-gray-700">Fetch Limits</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Fetch Limit Configuration
        </h1>
        {!isCreateNew && (
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
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                options={[{ value: "", label: "Select role" }, ...roles.map((r) => ({ value: r, label: r }))]}
                required
              />
              <SelectField
                icon={<Building />}
                label="Branch"
                value={form.branch_id}
                onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
                options={[{ value: "", label: "Select branch" }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))]}
                required
              />
              <InputField
                icon={<Clock />}
                label="Old Lead Remove (Days)"
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, per_request_limit: e.target.value }))
                }
                required
              />
              <InputField
                icon={<BarChart3 />}
                label="Daily Call Limit"
                type="number"
                value={form.daily_call_limit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, daily_call_limit: e.target.value }))
                }
                required
              />
              <InputField
                icon={<Download />}
                label="Last Fetch Limit"
                type="number"
                value={form.last_fetch_limit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, last_fetch_limit: e.target.value }))
                }
                required
              />
              <InputField
                icon={<Timer />}
                label="Assignment TTL (Hours)"
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
            className="pl-10 pr-4 py-2 border-gray-300 rounded-md w-72 focus:ring-indigo-500 focus:border-indigo-500"
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
                "Last Fetch",
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
                <td className="px-6 py-4">{cfg.role}</td>
                <td className="px-6 py-4">{cfg.per_request_limit}</td>
                <td className="px-6 py-4">{cfg.daily_call_limit}</td>
                <td className="px-6 py-4">{cfg.last_fetch_limit}</td>
                <td className="px-6 py-4">{cfg.old_lead_remove_days}</td>
                <td className="px-6 py-4">{cfg.assignment_ttl_hours}h</td>
                <td className="px-6 py-4 max-w-xs truncate" title={cfg.branch_name}>
                  {cfg.branch_name}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(cfg)}
                      className="p-2 rounded hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(cfg.id)}
                      className="p-2 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
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

function SelectField({ icon, label, options, ...props }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon}
        {label}
      </label>
      <select
        {...props}
        className="w-full border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
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
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon}
        {label}
      </label>
      <input
        {...props}
        className="w-full border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}
