"use client";
import React, { useEffect, useState } from "react";
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
  Save,
  Search,
  Shield,
  Activity,
  TrendingUp,
  Hash,
  MapPin,
  Timer,
  Download
} from "lucide-react";

const FetchLimitModel = ({ open, setOpen }) => {
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
    old_lead_remove_days: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchConfigs();
      fetchRoles();
      fetchBranches();
    }
  }, [open]);

  const fetchConfigs = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/lead-fetch-config/?skip=0&limit=100"
      );
      setConfigs(data);
    } catch (err) {
      console.error("Failed to load configs:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await axiosInstance.get("/profile-role/");
      setRoles(data);
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      setBranches(data);
    } catch (err) {
      console.error("Failed to load branches:", err);
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
      old_lead_remove_days: ""
    });
    setEditingId(null);
    setIsCreateNew(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = editingId ? "update this config" : "create this config";

    const payload = {
      role: form.role,
      branch_id: Number(form.branch_id),
      per_request_limit: Number(form.per_request_limit),
      daily_call_limit: Number(form.daily_call_limit),
      assignment_ttl_hours: Number(form.assignment_ttl_hours),
      last_fetch_limit: Number(form.last_fetch_limit),
      old_lead_remove_days: Number(form.old_lead_remove_days),
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        await axiosInstance.put(
          `/lead-fetch-config/${editingId}`,
          payload
        );
        setOpen(false);
      } else {
        await axiosInstance.post("/lead-fetch-config/", payload);
        resetForm();
        await fetchConfigs();
        return;
      }
      await fetchConfigs();
      resetForm();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (cfg) => {
    setEditingId(cfg.id);
    setForm({
      role: cfg.role,
      branch_id: cfg.branch_id.toString(),
      per_request_limit: cfg.per_request_limit.toString(),
      daily_call_limit: cfg.daily_call_limit.toString(),
      assignment_ttl_hours: cfg.assignment_ttl_hours.toString(),
      last_fetch_limit: cfg.last_fetch_limit.toString(),
      old_lead_remove_days: cfg.old_lead_remove_days?.toString() ?? ""
    });
    setIsCreateNew(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this config?")) return;
    try {
      await axiosInstance.delete(`/lead-fetch-config/${id}`);
      await fetchConfigs();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filteredConfigs = configs.filter(cfg =>
    cfg.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cfg.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const totalConfigs = configs.length;
  const totalDailyLimit = configs.reduce((sum, cfg) => sum + cfg.daily_call_limit, 0);
  const averagePerRequest = configs.length > 0 ? Math.round(configs.reduce((sum, cfg) => sum + cfg.per_request_limit, 0) / configs.length) : 0;
  const uniqueRoles = [...new Set(configs.map(cfg => cfg.role))].length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Fetch Limit Configuration
                </h2>
                <p className="text-indigo-100 text-sm">
                  {editingId ? "Edit existing fetch limits" : "Manage lead fetch limits and permissions"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Enhanced Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 rounded-full p-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-600">Total Configs</p>
                  <p className="text-2xl font-bold text-indigo-900">{totalConfigs}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Daily Limit</p>
                  <p className="text-2xl font-bold text-blue-900">{totalDailyLimit}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">Avg Per Request</p>
                  <p className="text-2xl font-bold text-green-900">{averagePerRequest}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-600">Unique Roles</p>
                  <p className="text-2xl font-bold text-purple-900">{uniqueRoles}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Form Section */}
          {isCreateNew ? (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 mb-6 border border-emerald-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-100 rounded-full p-2">
                  {editingId ? <Edit className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                </div>
                <h3 className="text-lg font-semibold text-emerald-900">
                  {editingId ? "Edit Fetch Limit Configuration" : "Create New Fetch Limit Configuration"}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Role and Branch Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Users className="w-4 h-4" />
                      Role
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, role: e.target.value }))
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white"
                    >
                      <option value="">Select role</option>
                      {roles.map((r) => (
                        <option key={r?.id} value={r?.id}>
                          {r?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Building className="w-4 h-4" />
                      Branch
                    </label>
                    <select
                      value={form.branch_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, branch_id: e.target.value }))
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white"
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Clock className="w-4 h-4" />
                      Old Lead Remove (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.old_lead_remove_days}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, old_lead_remove_days: e.target.value }))
                      }
                      required
                      placeholder="Enter days after which old leads are removed"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Limit Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Target className="w-4 h-4" />
                      Per Request Limit
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.per_request_limit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, per_request_limit: e.target.value }))
                      }
                      required
                      placeholder="Enter per request limit"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <BarChart3 className="w-4 h-4" />
                      Daily Call Limit
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.daily_call_limit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, daily_call_limit: e.target.value }))
                      }
                      required
                      placeholder="Enter daily call limit"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Download className="w-4 h-4" />
                      Last Fetch Limit
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.last_fetch_limit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, last_fetch_limit: e.target.value }))
                      }
                      required
                      placeholder="Enter last fetch limit"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Timer className="w-4 h-4" />
                      Assignment TTL (Hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.assignment_ttl_hours}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, assignment_ttl_hours: e.target.value }))
                      }
                      required
                      placeholder="Enter TTL in hours"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {editingId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingId ? "Update Configuration" : "Create Configuration"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <button
                onClick={() => setIsCreateNew(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Create New Fetch Limit
              </button>
            </div>
          )}

          {/* Enhanced Configurations List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Existing Fetch Limit Configurations
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by role or branch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 w-72"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Per Request</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Daily Limit</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Fetch</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Old Lead Remove (Days)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">TTL (hrs)</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredConfigs.map((cfg) => (
                    <tr key={cfg.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          #{cfg.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-purple-100 rounded-full p-1">
                            <Users className="w-3 h-3 text-purple-600" />
                          </div>
                          <span className="font-medium text-gray-900">{cfg.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 rounded-full p-1">
                            <Target className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{cfg.per_request_limit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 rounded-full p-1">
                            <BarChart3 className="w-3 h-3 text-green-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{cfg.daily_call_limit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-amber-100 rounded-full p-1">
                            <Download className="w-3 h-3 text-amber-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{cfg.last_fetch_limit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-yellow-100 rounded-full p-1">
                            <Clock className="w-3 h-3 text-yellow-600" />
                          </div>
                          <span className="text-sm text-gray-900">
                            {cfg.old_lead_remove_days}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-red-100 rounded-full p-1">
                            <Timer className="w-3 h-3 text-red-600" />
                          </div>
                          <span className="text-sm text-gray-900">{cfg.assignment_ttl_hours}h</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-100 rounded-full p-1">
                            <Building className="w-3 h-3 text-gray-600" />
                          </div>
                          <span className="text-sm text-gray-900 max-w-32 truncate" title={cfg.branch_name}>
                            {cfg.branch_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(cfg)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit Configuration"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cfg.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete Configuration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredConfigs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="bg-gray-100 rounded-full p-6 mb-4">
                            <Settings className="w-12 h-12 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? "No configurations found" : "No fetch limits configured"}
                          </h3>
                          <p className="text-gray-500 text-center max-w-sm">
                            {searchTerm
                              ? `No configurations match "${searchTerm}". Try adjusting your search.`
                              : "Get started by creating your first fetch limit configuration."
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FetchLimitModel;