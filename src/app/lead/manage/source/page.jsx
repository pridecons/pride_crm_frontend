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
} from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import { ErrorHandling } from "@/helper/ErrorHandling";

// ---- helpers ---------------------------------------------------------------
const getUserMeta = () => {
  try {
    const raw = Cookies.get("user_info");
    if (!raw) return { role: "", branch_id: null, branch_name: "" };
    const p = JSON.parse(raw);

    // robust role detection
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

export default function LeadSourcesPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const { role, branch_id: userBranchId, branch_name: userBranchName } =
    getUserMeta();
  const isSuperAdmin = role === "SUPERADMIN";

  const [branches, setBranches] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [sources, setSources] = useState([]);
  const [isCreateNew, setIsCreateNew] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    branch_id: isSuperAdmin ? "" : userBranchId || "",
  });

  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // explicit create/edit flag
  const isCreate = isCreateNew && !editingId;

  // Load branches (for name mapping + dropdown)
  const fetchBranches = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      const list = Array.isArray(data) ? data : [];
      setBranches(list);
      setBranchMap(
        Object.fromEntries(list.map((b) => [Number(b.id), b.name || `Branch-${b.id}`]))
      );
    } catch (err) {
      console.error("Failed to load branches:", err);
      ErrorHandling({ error: err, defaultError: "Failed to load branches"});
    }
  };

  // Load sources
  const fetchSources = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/lead-config/sources/?skip=0&limit=100"
      );
      setSources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Failed to load sources"});
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchBranches();

      // ensure non-superadmin branch name is mapped
      if (!isSuperAdmin && userBranchId && userBranchName) {
        setBranchMap((prev) => ({
          ...prev,
          [Number(userBranchId)]: userBranchName,
        }));
      }

      await fetchSources();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      branch_id: isSuperAdmin ? "" : userBranchId || "",
    });
    setEditingId(null);
    setIsCreateNew(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSuperAdmin && !form.branch_id) {
       ErrorHandling({defaultError: "Please select a branch"});
      return;
    }
    if (!isSuperAdmin && !form.branch_id) {
      ErrorHandling({defaultError: "No branch assigned to your account"});
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        // avoid Number("") → 0
        branch_id: form.branch_id === "" ? undefined : Number(form.branch_id),
      };

      if (editingId) {
        await axiosInstance.put(`/lead-config/sources/${editingId}`, payload);
        toast.success("Source updated successfully!");
      } else {
        // Create via the EXACT endpoint you provided (absolute URL)
        const payload = {
          name: form.name,
          description: form.description,
          branch_id: Number(form.branch_id),
        };

        await axiosInstance.post(
          "/lead-config/sources/",
          payload
        );

        toast.success("Source created successfully!");
      }
      resetForm();
      await fetchSources();
    } catch (err) {
      ErrorHandling({error: err, defaultError: "Save failed! Please try again."});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (src) => {
    setEditingId(src.id);
    setForm({
      name: src.name || "",
      description: src.description || "",
      // keep branch as-is; read-only for SuperAdmin in edit
      branch_id:
        src.branch_id ??
        (isSuperAdmin ? "" : userBranchId || ""),
    });
    setIsCreateNew(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this source?")) return;
    try {
      await axiosInstance.delete(`/lead-config/sources/${id}?force=false`);
      toast.success("Source deleted successfully!");
      await fetchSources();
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Delete failed! Please try again."});
    }
  };

  const filteredSources = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return (sources || []).filter((src) => {
      return (
        (src?.name || "").toLowerCase().includes(term) ||
        (src?.description || "").toLowerCase().includes(term) ||
        String(src?.branch_id || "").toLowerCase().includes(term)
      );
    });
  }, [sources, searchTerm]);

  // Show dropdown only for SuperAdmin on CREATE; read-only on EDIT
  const renderBranchField = (isCreateMode) => {
    if (isSuperAdmin) {
      if (isCreateMode) {
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Branch</label>
            <select
              value={String(form.branch_id ?? "")}
              onChange={(e) =>
                setForm((f) => ({ ...f, branch_id: e.target.value }))
              }
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
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
      // EDIT mode → read-only text (use numeric key for branchMap)
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700">Branch</label>
          <input
            type="text"
            value={
              branchMap[Number(form.branch_id)] ||
              (form.branch_id ? `Branch-${form.branch_id}` : "")
            }
            readOnly
            className="mt-1 block w-full border border-gray-200 rounded-md p-2 bg-gray-100 text-gray-600"
          />
        </div>
      );
    }

    // Non-superadmin: always read-only
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">Branch</label>
        <input
          type="text"
          value={userBranchName || (userBranchId ? `Branch-${userBranchId}` : "")}
          readOnly
          className="mt-1 block w-full border border-gray-200 rounded-md p-2 bg-gray-100 text-gray-600"
        />
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
              // ensure branches are available before opening create form
              if (isSuperAdmin && branches.length === 0) {
                try { await fetchBranches(); } catch {}
              }
              setForm({
                name: "",
                description: "",
                branch_id: isSuperAdmin ? "" : userBranchId || "",
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
              <p className="text-2xl font-bold text-purple-900">{filteredSources.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Form */}
      {isCreateNew && (
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Source" : "Create New Source"}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Source Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {renderBranchField(isCreate)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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
      )}

      {/* Search Bar */}
      <div className="flex items-center mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sources..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Source Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Branch
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSources.map((src) => (
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
            ))}

            {!loading && filteredSources.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
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
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
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
