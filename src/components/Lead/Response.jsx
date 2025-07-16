"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";

const ResponseModel = ({ open, setOpen }) => {
  const [responses, setResponses] = useState([]);
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [form, setForm] = useState({ name: "", lead_limit: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (open) fetchResponses();
  }, [open]);

  const fetchResponses = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/lead-config/responses/?skip=0&limit=100"
      );
      setResponses(data);
    } catch (err) {
      console.error("Failed to load responses:", err);
    }
  };

  const resetForm = () => {
    setForm({ name: "", lead_limit: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = editingId ? "update this response" : "create this response";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    try {
      if (editingId) {
        await axiosInstance.put(
          `/lead-config/responses/${editingId}`,
          { name: form.name, lead_limit: Number(form.lead_limit) }
        );
        setOpen(false);
      } else {
        await axiosInstance.post("/lead-config/responses/", {
          name: form.name,
          lead_limit: Number(form.lead_limit),
        });
        const again = window.confirm(
          "Response created! Create another?"
        );
        if (again) {
          resetForm();
          await fetchResponses();
          return;
        }
        setOpen(false);
      }
      await fetchResponses();
      setIsCreateNew(false);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleEdit = (resp) => {
    setEditingId(resp.id);
    setForm({ name: resp.name, lead_limit: resp.lead_limit.toString() });
    setIsCreateNew(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this response?")) return;
    try {
      await axiosInstance.delete(
        `/lead-config/responses/${id}?force=false`
      );
      await fetchResponses();
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
            {editingId ? "Edit Response" : "Add New Response"}
          </h2>
          <button
            onClick={() => {
              resetForm();
              setIsCreateNew(false);
              setOpen(false);
            }}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        {/* New / Create Form */}
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
              <label className="block text-sm font-medium">Lead Limit</label>
              <input
                type="number"
                min={0}
                value={form.lead_limit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lead_limit: e.target.value }))
                }
                required
                className="mt-1 w-full border px-2 py-1 rounded"
              />
            </div>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Response
            </button>
          </div>
        )}

        <hr className="mb-4" />

        {/* Existing Responses */}
        <h3 className="text-lg font-medium mb-2">Existing Responses</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">ID</th>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Lead Limit</th>
                <th className="border px-2 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((resp) => (
                <tr key={resp.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{resp.id}</td>
                  <td className="border px-2 py-1">{resp.name}</td>
                  <td className="border px-2 py-1">{resp.lead_limit}</td>
                  <td className="border px-2 py-1 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(resp)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(resp.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {responses.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="border px-2 py-4 text-center text-gray-500"
                  >
                    No responses found.
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

export default ResponseModel;
