"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import {
  X,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Target,
  FileText,
  Save,
  Search,
  Hash,
  TrendingUp,
  CheckCircle,
  Activity
} from "lucide-react";

const ResponseModel = ({ open, setOpen }) => {
  const [responses, setResponses] = useState([]);
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [form, setForm] = useState({ name: "", lead_limit: "" });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsCreateNew(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = editingId ? "update this response" : "create this response";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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

  const filteredResponses = responses.filter(resp =>
    resp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLeadLimit = responses.reduce((sum, resp) => sum + resp.lead_limit, 0);
  const averageLeadLimit = responses.length > 0 ? Math.round(totalLeadLimit / responses.length) : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Response Management
                </h2>
                <p className="text-purple-100 text-sm">
                  {editingId ? "Edit existing response" : "Manage lead responses and limits"}
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Responses</p>
                  <p className="text-2xl font-bold text-purple-900">{responses.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Lead Limit</p>
                  <p className="text-2xl font-bold text-blue-900">{totalLeadLimit}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">Average Limit</p>
                  <p className="text-2xl font-bold text-green-900">{averageLeadLimit}</p>
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
                  <p className="text-2xl font-bold text-amber-900">{filteredResponses.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          {isCreateNew ? (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 mb-6 border border-emerald-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-100 rounded-full p-2">
                  {editingId ? <Edit className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                </div>
                <h3 className="text-lg font-semibold text-emerald-900">
                  {editingId ? "Edit Response" : "Create New Response"}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <FileText className="w-4 h-4" />
                      Response Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                      placeholder="Enter response name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Target className="w-4 h-4" />
                      Lead Limit
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.lead_limit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lead_limit: e.target.value }))
                      }
                      required
                      placeholder="Enter lead limit"
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
                    <Cancel className="w-4 h-4" />
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
                        {editingId ? "Update Response" : "Create Response"}
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
                Create New Response
              </button>
            </div>
          )}

          {/* Search and Responses List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  Existing Responses
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search responses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Response Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead Limit</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResponses.map((resp) => (
                    <tr key={resp.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          #{resp.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 rounded-full p-2">
                            <MessageSquare className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="font-medium text-gray-900">{resp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 rounded-full p-1">
                            <Target className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{resp.lead_limit}</span>
                          <span className="text-xs text-gray-500">leads</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(resp)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit Response"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(resp.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete Response"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredResponses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="bg-gray-100 rounded-full p-6 mb-4">
                            <MessageSquare className="w-12 h-12 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? "No responses found" : "No responses available"}
                          </h3>
                          <p className="text-gray-500 text-center max-w-sm">
                            {searchTerm 
                              ? `No responses match "${searchTerm}". Try adjusting your search.`
                              : "Get started by creating your first response configuration."
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

export default ResponseModel;