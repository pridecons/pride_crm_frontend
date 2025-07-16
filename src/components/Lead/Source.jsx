"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";

const SourceModel = ({ open, setOpen }) => {
  const [sources, setSources] = useState([]);
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    created_by: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (open) fetchSources();
  }, [open]);

  const fetchSources = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/lead-config/sources/?skip=0&limit=100"
      );
      setSources(data);
    } catch (err) {
      console.error("Failed to load sources:", err);
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", created_by: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 1) Ask before creating/updating
    const action = editingId ? "update this source" : "create this source";
    if (!window.confirm(`Are you sure you want to ${action}?`)) {
      return;
    }

    try {
      if (editingId) {
        await axiosInstance.put(`/lead-config/sources/${editingId}`, {
          name: form.name,
          description: form.description,
        });
        // after update just close
        setOpen(false);
      } else {
        await axiosInstance.post("/lead-config/sources/", form);
        // 2) After create, ask if they want to create another
        const again = window.confirm(
          "Source created successfully! Would you like to create another one?"
        );
        if (again) {
          resetForm();
          await fetchSources();
          return; // stay open, fresh form
        }
        // if not, close modal
        setOpen(false);
      }
      // in both cases, refresh list
      await fetchSources();
      setIsCreateNew(false);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleEdit = (src) => {
    setEditingId(src.id);
    setForm({
      name: src.name,
      description: src.description,
      created_by: src.created_by,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this source?")) return;
    try {
      await axiosInstance.delete(
        `/lead-config/sources/${id}?force=false`
      );
      await fetchSources();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit Source" : "Add New Source"}
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
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                className="mt-1 w-full border px-2 py-1 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                required
                className="mt-1 w-full border px-2 py-1 rounded"
              />
            </div>
            {!editingId && (
              <div>
                <label className="block text-sm font-medium">Created By</label>
                <input
                  type="text"
                  value={form.created_by}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, created_by: e.target.value }))
                  }
                  required
                  className="mt-1 w-full border px-2 py-1 rounded"
                />
              </div>
            )}
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
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setIsCreateNew(true)}
              className="
        inline-flex items-center
        px-4 py-2
        bg-green-600 hover:bg-green-700
        text-white font-medium
        rounded-lg shadow
        transition
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Source
            </button>
          </div>
        )}

        <hr className="mb-4" />

        {/* List of Sources */}
        <h3 className="text-lg font-medium mb-2">Existing Sources</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">ID</th>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Description</th>
                <th className="border px-2 py-1 text-left">Created By</th>
                <th className="border px-2 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src) => (
                <tr key={src.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{src.id}</td>
                  <td className="border px-2 py-1">{src.name}</td>
                  <td className="border px-2 py-1">{src.description}</td>
                  <td className="border px-2 py-1">{src.created_by}</td>
                  <td className="border px-2 py-1 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(src)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(src.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="border px-2 py-4 text-center text-gray-500"
                  >
                    No sources found.
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

export default SourceModel;
