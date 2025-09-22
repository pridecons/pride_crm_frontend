"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { axiosInstance } from "@/api/Axios";
import {
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { ErrorHandling } from "@/helper/ErrorHandling";

export default function LeadResponsesPage() {
  const router = useRouter();
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/lead-config/responses/?skip=0&limit=100"
      );
      setResponses(data);
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Failed to load responsess" });
    }
  };

  const resetForm = () => {
    setForm({ name: "" });
    setEditingId(null);
    setIsFormVisible(false);
  };

  const handleCreateClick = () => {
    resetForm();
    setIsFormVisible(true);
  };

  const handleEditClick = (resp) => {
    setForm({ name: resp.name });
    setEditingId(resp.id);
    setIsFormVisible(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = editingId ? "update this response" : "create this response";
    if (!confirm(`Are you sure you want to ${action}?`)) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await axiosInstance.put(`/lead-config/responses/${editingId}`, {
          name: form.name,
        });
        toast.success("Response updated!");
      } else {
        await axiosInstance.post("/lead-config/responses/", {
          name: form.name,
        });
        toast.success("Response created!");
      }
      resetForm();
      await fetchResponses();
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Save failed!" });

    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this response?")) return;
    try {
      await axiosInstance.delete(`/lead-config/responses/${id}?force=false`);
      toast.success("Deleted");
      await fetchResponses();
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Delete failed!" });
    }
  };

  const filtered = responses.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        {!isFormVisible && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create New Response
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-full p-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-600">
                Total Responses
              </p>
              <p className="text-2xl font-bold text-purple-900">
                {responses.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 rounded-full p-2">
              <Search className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600">Filtered</p>
              <p className="text-2xl font-bold text-amber-900">
                {filtered.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {isFormVisible && (
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Response" : "Create New Response"}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Response Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmitting
                  ? editingId
                    ? "Updating..."
                    : "Creating..."
                  : editingId
                    ? "Update Response"
                    : "Create Response"}
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
            placeholder="Search responses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm leading-tight">
          {/* set fixed, narrow columns to avoid huge gaps */}
          <colgroup>
            <col className="w-20" />        {/* ID */}
            <col />                         {/* Name (stretches) */}
            <col className="w-28" />        {/* Actions */}
          </colgroup>

          <thead className="bg-gray-50">
            <tr className="text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-center">Name</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filtered.map((resp) => (
              <tr key={resp.id} className="hover:bg-gray-50 align-middle">
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">#{resp.id}</td>

                {/* NAME centered (no left/right gap) */}
                <td className="px-3 py-2 text-center text-gray-900 whitespace-nowrap">
                  {resp.name}
                </td>

                {/* compact actions — no extra padding */}
                <td className="px-2 py-1">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEditClick(resp)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-indigo-50"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4 text-indigo-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(resp.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-gray-500">
                  No responses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
