"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { axiosInstance } from "@/api/Axios";
import { Plus, Edit, Trash2, MessageSquare, Search, X } from "lucide-react";
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
      ErrorHandling({ error: err, defaultError: "Failed to load responses" });
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
    <div className="p-6 bg-[var(--theme-background)] text-[var(--theme-text)]">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        {!isFormVisible && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[var(--theme-primary-contrast)] shadow-sm transition
                       bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)]"
          >
            <Plus className="w-5 h-5" />
            Create New Response
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Total */}
        <div className="rounded-xl p-4 border bg-[var(--theme-primary-softer)] border-[var(--theme-border)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-[var(--theme-primary-soft)]">
              <MessageSquare className="w-5 h-5 text-[var(--theme-primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--theme-text-muted)]">
                Total Responses
              </p>
              <p className="text-2xl font-bold text-[var(--theme-text)]">
                {responses.length}
              </p>
            </div>
          </div>
        </div>

        {/* Spacer card to keep layout symmetric on small screens */}
        <div className="rounded-xl p-4 border bg-[var(--theme-surface)] border-[var(--theme-border)] sm:col-span-1 hidden sm:block" />

        {/* Filtered */}
        <div className="rounded-xl p-4 border bg-[var(--theme-warning, #f59e0b)]/10 border-[var(--theme-border)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-[var(--theme-warning, #f59e0b)]/15">
              <Search className="w-5 h-5 text-[var(--theme-warning, #f59e0b)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--theme-text-muted)]">
                Filtered
              </p>
              <p className="text-2xl font-bold text-[var(--theme-text)]">
                {filtered.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {isFormVisible && (
        <div className="rounded-2xl p-6 mb-6 border shadow bg-[var(--theme-surface)] border-[var(--theme-border)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--theme-text)]">
              {editingId ? "Edit Response" : "Create New Response"}
            </h2>
            <button
              onClick={resetForm}
              className="text-[var(--theme-text-muted)] hover:bg-[var(--theme-primary-softer)] rounded-lg p-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--theme-text)]">
                Response Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1 block w-full rounded-md p-2
                           bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)]
                           border border-[var(--theme-components-input-border)]
                           placeholder:text-[var(--theme-components-input-placeholder)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg transition-colors
                           bg-[var(--theme-components-button-secondary-bg)]
                           text-[var(--theme-components-button-secondary-text)]
                           border border-[var(--theme-components-button-secondary-border)]
                           hover:bg-[var(--theme-components-button-secondary-hoverBg)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg shadow-sm transition
                           text-[var(--theme-components-button-primary-text)]
                           bg-[var(--theme-components-button-primary-bg)]
                           hover:bg-[var(--theme-components-button-primary-hoverBg)]"
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
          <Search className="absolute left-3 top-2 w-4 h-4 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            placeholder="Search responses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-md w-64
                       bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)]
                       border border-[var(--theme-components-input-border)]
                       placeholder:text-[var(--theme-components-input-placeholder)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl shadow overflow-x-auto bg-[var(--theme-surface)] border border-[var(--theme-border)]">
        <table className="min-w-full table-fixed divide-y divide-[var(--theme-border)] text-sm leading-tight">
          <colgroup>
            <col className="w-20" />
            <col />
            <col className="w-28" />
          </colgroup>

          <thead className="bg-[var(--theme-surface)]">
            <tr className="text-xs uppercase tracking-wide text-[var(--theme-text-muted)]">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-center">Name</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--theme-border)]">
            {filtered.map((resp) => (
              <tr
                key={resp.id}
                className="hover:bg-[var(--theme-primary-softer)] align-middle"
              >
                <td className="px-3 py-2 text-[var(--theme-text-muted)] whitespace-nowrap">
                  #{resp.id}
                </td>

                <td className="px-3 py-2 text-center text-[var(--theme-text)] whitespace-nowrap">
                  {resp.name}
                </td>

                <td className="px-2 py-1">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEditClick(resp)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--theme-primary-softer)]"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4 text-[var(--theme-primary)]" />
                    </button>
                    <button
                      onClick={() => handleDelete(resp.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--theme-danger-soft)]"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-[var(--theme-danger)]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-center text-[var(--theme-text-muted)]"
                >
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
