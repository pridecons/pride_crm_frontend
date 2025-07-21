"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Database,
  User,
  FileText,
  Save,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from "lucide-react";

const SourceModel = ({ open, setOpen }) => {
  const [sources, setSources] = useState([]);
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    created_by: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsCreateNew(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 1) Ask before creating/updating
    const action = editingId ? "update this source" : "create this source";
    if (!window.confirm(`Are you sure you want to ${action}?`)) {
      return;
    }

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (src) => {
    setEditingId(src.id);
    setForm({
      name: src.name,
      description: src.description,
      created_by: src.created_by,
    });
    setIsCreateNew(true);
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

  const filteredSources = sources.filter(src =>
    src.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    src.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    src.created_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Source Management
                </h2>
                <p className="text-blue-100 text-sm">
                  {editingId ? "Edit existing source" : "Manage lead sources"}
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
          {/* Stats Bar */}
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

          {/* Form Section */}
          {isCreateNew ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-full p-2">
                  {editingId ? <Edit className="w-5 h-5 text-green-600" /> : <Plus className="w-5 h-5 text-green-600" />}
                </div>
                <h3 className="text-lg font-semibold text-green-900">
                  {editingId ? "Edit Source" : "Create New Source"}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <FileText className="w-4 h-4" />
                      Source Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                      placeholder="Enter source name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {!editingId && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <User className="w-4 h-4" />
                        Created By
                      </label>
                      <input
                        type="text"
                        value={form.created_by}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, created_by: e.target.value }))
                        }
                        required
                        placeholder="Enter creator name"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4" />
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    required
                    placeholder="Enter source description"
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
                  >
                    <Cancel className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {editingId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingId ? "Update Source" : "Create Source"}
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
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl shadow-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Create New Source
              </button>
            </div>
          )}

          {/* Search and Sources List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-gray-600" />
                  Existing Sources
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Source Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created By</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSources.map((src) => (
                    <tr key={src.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          #{src.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 rounded-full p-2">
                            <Database className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{src.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-xs truncate" title={src.description}>
                          {src.description}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-100 rounded-full p-1">
                            <User className="w-3 h-3 text-gray-600" />
                          </div>
                          <span className="text-sm text-gray-900">{src.created_by}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(src)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit Source"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(src.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete Source"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSources.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="bg-gray-100 rounded-full p-6 mb-4">
                            <Database className="w-12 h-12 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? "No sources found" : "No sources available"}
                          </h3>
                          <p className="text-gray-500 text-center max-w-sm">
                            {searchTerm 
                              ? `No sources match "${searchTerm}". Try adjusting your search.`
                              : "Get started by creating your first source."
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

export default SourceModel;