"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";

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
  });
  const [editingId, setEditingId] = useState(null);

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
        "/api/v1/lead-fetch-config/?skip=0&limit=100"
      );
      setConfigs(data);
    } catch (err) {
      console.error("Failed to load configs:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await axiosInstance.get("/api/v1/profile-role/");
      setRoles(data);
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/api/v1/branches/?skip=0&limit=100&active_only=false"
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
    });
    setEditingId(null);
    setIsCreateNew(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = editingId ? "update this config" : "create this config";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    const payload = {
      role: form.role,
      branch_id: Number(form.branch_id),
      per_request_limit: Number(form.per_request_limit),
      daily_call_limit: Number(form.daily_call_limit),
      assignment_ttl_hours: Number(form.assignment_ttl_hours),
    };

    try {
      if (editingId) {
        await axiosInstance.put(`/api/v1/lead-fetch-config/${editingId}`, payload);
        setOpen(false);
      } else {
        await axiosInstance.post("/api/v1/lead-fetch-config/", payload);
        const again = window.confirm("Config created! Add another?");
        if (again) {
          resetForm();
          await fetchConfigs();
          return;
        }
        setOpen(false);
      }
      await fetchConfigs();
      resetForm();
    } catch (err) {
      console.error("Save failed:", err);
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
    });
    setIsCreateNew(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this config?")) return;
    try {
      await axiosInstance.delete(`/api/v1/lead-fetch-config/${id}`);
      await fetchConfigs();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit Fetch Limit" : "Add New Fetch Limit"}
          </h2>
         <button
  onClick={() => {
    resetForm();
    setOpen(false);
  }}
  className="text-gray-500 hover:text-gray-800"
>
  ✕
</button>

        </div>

        {/* Form */}
        {isCreateNew ? (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {/* Role dropdown */}
            <div>
              <label className="block text-sm font-medium">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                required
                className="mt-1 w-full border px-2 py-1 rounded"
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch dropdown */}
            <div>
              <label className="block text-sm font-medium">Branch</label>
              <select
                value={form.branch_id}
                onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
                required
                className="mt-1 w-full border px-2 py-1 rounded"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Numeric fields */}
            {[
              { label: "Per Request Limit", name: "per_request_limit" },
              { label: "Daily Call Limit", name: "daily_call_limit" },
              { label: "Assignment TTL (hrs)", name: "assignment_ttl_hours" },
            ].map(({ label, name }) => (
              <div key={name}>
                <label className="block text-sm font-medium">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={form[name]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [name]: e.target.value }))
                  }
                  required
                  className="mt-1 w-full border px-2 py-1 rounded"
                />
              </div>
            ))}

            <div className="flex justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setIsCreateNew(true)}
              className="
                inline-flex items-center px-4 py-2
                bg-green-600 hover:bg-green-700
                text-white rounded-lg shadow
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
              "
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Fetch Limit
            </button>
          </div>
        )}

        <hr className="mb-4" />

        {/* Existing Configs */}
        <h3 className="text-lg font-medium mb-2">Existing Fetch Limits</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">ID</th>
                <th className="border px-2 py-1 text-left">Role</th>
                <th className="border px-2 py-1 text-left">Per Req</th>
                <th className="border px-2 py-1 text-left">Daily</th>
                <th className="border px-2 py-1 text-left">TTL (hrs)</th>
                <th className="border px-2 py-1 text-left">Branch Name</th>
                <th className="border px-2 py-1 text-left">Branch Addr</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((cfg) => (
                <tr key={cfg.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{cfg.id}</td>
                  <td className="border px-2 py-1">{cfg.role}</td>
                  <td className="border px-2 py-1">{cfg.per_request_limit}</td>
                  <td className="border px-2 py-1">{cfg.daily_call_limit}</td>
                  <td className="border px-2 py-1">{cfg.assignment_ttl_hours}</td>
                  <td className="border px-2 py-1">{cfg.branch_name}</td>
                  <td className="border px-2 py-1 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(cfg)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cfg.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {configs.length === 0 && (
                <tr>
                  <td colSpan={9} className="border px-2 py-4 text-center text-gray-500">
                    No fetch limits configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FetchLimitModel;


