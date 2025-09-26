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
  Database,
  Search,
  CheckCircle,
  Building,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import { ErrorHandling } from "@/helper/ErrorHandling";

/* --------------------------- helpers --------------------------- */
const getUserMeta = () => {
  try {
    const raw = Cookies.get("user_info");
    if (!raw) return { role: "", branch_id: null, branch_name: "" };
    const p = JSON.parse(raw);

    const rawRole =
      p?.role ??
      p?.role_name ??
      p?.user?.role ??
      p?.user?.role_name ??
      p?.user?.profile?.role ??
      p?.user?.profile?.role_name ??
      "";
    const role = String(rawRole).trim().toUpperCase();

    const branch_id =
      p?.branch_id ??
      p?.user?.branch_id ??
      p?.branch?.id ??
      p?.user?.branch?.id ??
      null;

    const branch_name =
      p?.branch_name ||
      p?.branch?.name ||
      p?.user?.branch_name ||
      p?.user?.branch?.name ||
      (branch_id ? `Branch-${branch_id}` : "");

    return { role, branch_id, branch_name };
  } catch {
    return { role: "", branch_id: null, branch_name: "" };
  }
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function LeadSourcesPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const { role, branch_id: userBranchId, branch_name: userBranchName } =
    getUserMeta();
  const isSuperAdmin = role === "SUPERADMIN";

  const [branches, setBranches] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [sources, setSources] = useState([]);
  const [roles, setRoles] = useState([]); // from /profile-role/

  const [isCreateNew, setIsCreateNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    branch_id: isSuperAdmin ? "" : userBranchId || "",
    fetch_configs: [], // [{ role_id, per_request_limit, daily_call_limit }]
  });

  const isCreate = isCreateNew && !editingId;

  const showBranchColumn = isSuperAdmin;
  const tableCols = showBranchColumn ? 6 : 5; // ID, Name, Desc, (Branch?), Fetch Configs, Actions

  /* --------------------------- load data --------------------------- */
  const fetchBranches = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      const list = Array.isArray(data) ? data : [];
      setBranches(list);
      setBranchMap(
        Object.fromEntries(
          list.map((b) => [Number(b.id), b.name || `Branch-${b.id}`])
        )
      );
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Failed to load branches",
      });
    }
  };

  const fetchSources = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/lead-config/sources/?skip=0&limit=100"
      );
      setSources(Array.isArray(data) ? data : []);
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Failed to load sources",
      });
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/profile-role/?skip=0&limit=50&order_by=hierarchy_level"
      );
    // Expecting array of profiles [{id, name, ...}]
      const list = Array.isArray(data) ? data.filter((r) => r?.is_active) : [];
      setRoles(list);
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Failed to load profiles",
      });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchBranches(), fetchSources(), fetchRoles()]);

      if (!isSuperAdmin && userBranchId && userBranchName) {
        setBranchMap((prev) => ({
          ...prev,
          [Number(userBranchId)]: userBranchName,
        }));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- role visibility + defaults --------------------------- */
  // Roles a non-superadmin is allowed to see (hide SUPERADMIN)
  const visibleRoles = useMemo(() => {
    if (isSuperAdmin) return roles;
    return roles.filter(
      (r) =>
        String(r?.name ?? r?.role ?? "").trim().toUpperCase() !== "SUPERADMIN"
    );
  }, [roles, isSuperAdmin]);

  // Make 4 default configs from first available visible roles
  const makeDefaultConfigs = () => {
    const picks = [];
    for (const r of visibleRoles) {
      if (picks.length >= 4) break;
      picks.push({
        role_id: r.id,
        per_request_limit: 50,
        daily_call_limit: 2,
      });
    }
    return picks;
  };

  /* --------------------------- utils --------------------------- */
  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      branch_id: isSuperAdmin ? "" : userBranchId || "",
      fetch_configs: [],
    });
    setEditingId(null);
    setIsCreateNew(false);
  };

  const roleAlreadyUsed = (role_id) =>
    form.fetch_configs.some((fc) => Number(fc.role_id) === Number(role_id));

  const addFetchConfig = () => {
    // pick first available visible role
    const firstFree = visibleRoles.find((r) => !roleAlreadyUsed(r.id));
    if (!firstFree) return;
    setForm((f) => ({
      ...f,
      fetch_configs: [
        {
          role_id: firstFree.id,
          per_request_limit: 50,
          daily_call_limit: 2,
        },
         ...f.fetch_configs,
      ],
    }));
    toast.success("Added new fetch configuration");
  };

  const updateFetchConfig = (idx, patch) => {
    setForm((f) => {
      const next = [...f.fetch_configs];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, fetch_configs: next };
    });
  };

  const removeFetchConfig = (idx) => {
    setForm((f) => {
      const next = [...f.fetch_configs];
      next.splice(idx, 1);
      return { ...f, fetch_configs: next };
    });
  };

  const canAddConfig = visibleRoles.some((r) => !roleAlreadyUsed(r.id));

  /* --------------------------- submit --------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Branch checks
    if (isSuperAdmin && !form.branch_id) {
      ErrorHandling({ defaultError: "Please select a branch" });
      return;
    }
    if (!isSuperAdmin && !form.branch_id) {
      ErrorHandling({ defaultError: "No branch assigned to your account" });
      return;
    }

    // Validate fetch configs (allow zero, but if present they must be valid)
    const cleanedFetchConfigs = (form.fetch_configs || [])
      .filter((fc) => fc && fc.role_id)
      .map((fc) => ({
        role_id: Number(fc.role_id),
        per_request_limit: Math.max(1, toInt(fc.per_request_limit)),
        daily_call_limit: Math.max(1, toInt(fc.daily_call_limit)),
      }));

    // prevent duplicates
    const seen = new Set();
    for (const fc of cleanedFetchConfigs) {
      const key = String(fc.role_id);
      if (seen.has(key)) {
        ErrorHandling({
          defaultError: "Duplicate roles in fetch configs. Please remove duplicates.",
        });
        return;
      }
      seen.add(key);
    }

    setIsSubmitting(true);
    try {
      const branchIdToSend = isSuperAdmin ? Number(form.branch_id) : Number(userBranchId);
      const payload = {
        name: form.name,
        description: form.description,
        branch_id: Number(branchIdToSend),
        fetch_configs: cleanedFetchConfigs,
      };

      if (editingId) {
        await axiosInstance.put(`/lead-config/sources/${editingId}`, payload);
        toast.success("Source updated successfully!");
      } else {
        await axiosInstance.post(`/lead-config/sources/`, payload);
        toast.success("Source created successfully!");
      }

      resetForm();
      await fetchSources();
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Save failed! Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------- edit / delete --------------------------- */
  const handleEdit = (src) => {
    setEditingId(src.id);
    setIsCreateNew(true);

    const fromApi = Array.isArray(src.fetch_configs) ? src.fetch_configs : [];
    setForm({
      name: src.name || "",
      description: src.description || "",
      branch_id: isSuperAdmin ? (src.branch_id ?? "") : (userBranchId || ""),
      fetch_configs: fromApi.map((fc) => ({
        role_id: fc.role_id ?? "",
        per_request_limit: fc.per_request_limit ?? 50,
        daily_call_limit: fc.daily_call_limit ?? 2,
      })),
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this source?")) return;
    try {
      await axiosInstance.delete(`/lead-config/sources/${id}?force=false`);
      toast.success("Source deleted successfully!");
      await fetchSources();
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Delete failed! Please try again.",
      });
    }
  };

  /* --------------------------- filters --------------------------- */
  const filteredSources = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return (sources || []).filter((src) => {
      const roleNames =
        (src.fetch_configs || [])
          .map((fc) => {
            const r = roles.find((x) => x.id === fc.role_id);
            return r?.name || "";
          })
          .join(", ") || "";
      return (
        (src?.name || "").toLowerCase().includes(term) ||
        (src?.description || "").toLowerCase().includes(term) ||
        String(src?.branch_id || "").toLowerCase().includes(term) ||
        roleNames.toLowerCase().includes(term)
      );
    });
  }, [sources, searchTerm, roles]);

  /* --------------------------- UI --------------------------- */
  const renderBranchField = (isCreateMode) => {
    // Hide completely for non-superadmins, but branch_id is still set in form state
    if (!isSuperAdmin) return null;

    if (isCreateMode) {
      return (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Branch <span className="text-red-500">*</span>
          </label>
          <select
            value={String(form.branch_id ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            required
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          >
            <option value="" disabled>
              {branches.length ? "Select branch…" : "Loading branches…"}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name || `Branch-${b.id}`}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // EDIT mode → read-only view for SUPERADMIN
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">Branch</label>
        <input
          type="text"
          value={
            branchMap[Number(form.branch_id)] ||
            (form.branch_id ? `Branch-${form.branch_id}` : "")
          }
          readOnly
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
        />
      </div>
    );
  };

  const renderFetchConfigs = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Fetch Configurations
            </h3>
            <p className="text-xs text-gray-500 mt-1">Set role-specific fetch limits</p>
          </div>
          <button
            type="button"
            onClick={addFetchConfig}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-lg hover:from-indigo-600 hover:to-blue-700 transition-all shadow-sm"
            disabled={!canAddConfig}
          >
            <Plus className="w-4 h-4" />
            Add Config
          </button>
        </div>

        {form.fetch_configs?.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No fetch configurations added</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Config" to set role-specific limits</p>
          </div>
        )}

        <div className="space-y-3">
          {form.fetch_configs?.map((fc, idx) => {
            const usedIds = new Set(
              form.fetch_configs.map((x, i) => (i === idx ? null : Number(x.role_id)))
            );
            const currentId = Number(fc.role_id ?? 0);
            const currentRole = roles.find((r) => Number(r.id) === currentId);
            const currentInVisible = visibleRoles.some(
              (r) => Number(r.id) === currentId
            );

            return (
              <div
                key={idx}
                className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Profile Role
                    </label>
                    <select
                      value={String(fc.role_id ?? "")}
                      onChange={(e) =>
                        updateFetchConfig(idx, { role_id: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    >
                      <option value="" disabled>
                        Select profile…
                      </option>

                      {/* If current role is hidden (e.g., SUPERADMIN), keep it as a non-selectable option */}
                      {!currentInVisible && currentRole && (
                        <option value={String(currentRole.id)} disabled>
                          {currentRole.name} (hidden)
                        </option>
                      )}

                      {visibleRoles.map((r) => (
                        <option
                          key={r.id}
                          value={String(r.id)}
                          disabled={usedIds.has(Number(r.id))}
                        >
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Per-Request Limit
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={fc.per_request_limit ?? ""}
                      onChange={(e) =>
                        updateFetchConfig(idx, {
                          per_request_limit: toInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Daily Call Limit
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={fc.daily_call_limit ?? ""}
                      onChange={(e) =>
                        updateFetchConfig(idx, {
                          daily_call_limit: toInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeFetchConfig(idx)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      title="Remove config"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        {!isCreateNew && hasPermission("create_lead") && (
          <button
            onClick={async () => {
              setEditingId(null);
              if (isSuperAdmin && branches.length === 0) {
                try {
                  await fetchBranches();
                } catch {}
              }
              setForm({
                name: "",
                description: "",
                branch_id: isSuperAdmin ? "" : userBranchId || "",
                fetch_configs: makeDefaultConfigs(), // default 4 configs
              });
              setIsCreateNew(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create New Source
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600">Total Sources</p>
              <p className="text-2xl font-bold text-blue-900">{sources.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-900">{sources.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-full p-2">
              <Search className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-600">Filtered</p>
              <p className="text-2xl font-bold text-purple-900">
                {filteredSources.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Create / Edit Form Modal */}
      {isCreateNew && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-5 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? "Edit Lead Source" : "Create New Lead Source"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingId ? "Update source configuration" : "Set up a new lead source"}
                  </p>
                </div>
                <button 
                  onClick={resetForm} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Basic Information
                </h3>
                
                <div className={`grid grid-cols-1 ${isSuperAdmin ? "md:grid-cols-2" : ""} gap-5`}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Source Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      placeholder="Enter source name"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {renderBranchField(isCreate)}
                </div>

                <div className="mt-5">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    required
                    placeholder="Describe this lead source"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>

              {/* Fetch Configurations Section */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                {renderFetchConfigs()}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all font-medium shadow-lg shadow-green-500/25"
                >
                  {isSubmitting
                    ? editingId
                      ? "Updating..."
                      : "Creating..."
                    : editingId
                    ? "Update Source"
                    : "Create Source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sources…"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
              {showBranchColumn && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Branch</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fetch Configs</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSources.map((src) => {
              const fc = Array.isArray(src.fetch_configs) ? src.fetch_configs : [];
              const fcPreview =
                fc
                  .map((x) => {
                    const rr = roles.find((r) => r.id === x.role_id);
                    return rr
                      ? `${rr.name} (${x.per_request_limit}/${x.daily_call_limit})`
                      : `#${x.role_id} (${x.per_request_limit}/${x.daily_call_limit})`;
                  })
                  .join(", ") || "—";

              return (
                <tr key={src.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      #{src.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 rounded-full p-1">
                        <Database className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">{src.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p
                      className="text-sm text-gray-600 truncate max-w-xs"
                      title={src.description}
                    >
                      {src.description}
                    </p>
                  </td>
                  {showBranchColumn && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <div className="bg-gray-100 rounded-full p-1">
                          <Building className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-900">
                          {branchMap[Number(src.branch_id)] ||
                            src.branch_name ||
                            src?.branch?.name ||
                            (src.branch_id != null ? `Branch-${src.branch_id}` : "—")}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700" title={fcPreview}>
                      {fc.length ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                            {fc.length} role(s)
                          </span>
                          <span className="hidden xl:inline">{fcPreview}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {hasPermission("edit_lead") && (
                        <button
                          onClick={() => handleEdit(src)}
                          className="p-2 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {hasPermission("delete_lead") && (
                        <button
                          onClick={() => handleDelete(src.id)}
                          className="p-2 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && filteredSources.length === 0 && (
              <tr>
                <td colSpan={tableCols} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Database className="w-12 h-12 text-gray-400" />
                    <p className="text-gray-500">
                      {searchTerm
                        ? `No sources match "${searchTerm}".`
                        : "No sources available."}
                    </p>
                  </div>
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={tableCols} className="px-6 py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}