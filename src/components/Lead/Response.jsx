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
  TrendingUp,
} from "lucide-react";

const ResponseModel = ({ open, setOpen }) => {
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState({ name: "", lead_limit: "" });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (open) fetchResponses();
  }, [open]);

  const fetchResponses = async () => {
    try {
      const { data } = await axiosInstance.get("/lead-config/responses/?skip=0&limit=100");
      setResponses(data);
    } catch (err) {
      console.error("Failed to load responses:", err);
    }
  };

  const resetForm = () => {
    setForm({ name: "", lead_limit: "" });
    setEditingId(null);
    setIsFormVisible(false);
  };

  const handleEdit = (resp) => {
    setForm({ name: resp.name, lead_limit: String(resp.lead_limit) });
    setEditingId(resp.id);
    setIsFormVisible(true);
  };

  const fetchResponseById = async (id) => {
    try {
      const { data } = await axiosInstance.get(`/lead-config/responses/${id}`);
      setOpen(true); // ✅ ensure modal is visible
      handleEdit(data); // ✅ show form
    } catch (err) {
      console.error("Failed to fetch response:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = editingId ? "update this response" : "create this response";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await axiosInstance.put(`/lead-config/responses/${editingId}`, {
          name: form.name,
          lead_limit: Number(form.lead_limit),
        });
        setOpen(false);
      } else {
        await axiosInstance.post("/lead-config/responses/", {
          name: form.name,
          lead_limit: Number(form.lead_limit),
        });
        const again = window.confirm("Response created! Create another?");
        if (again) {
          resetForm();
          await fetchResponses();
          return;
        }
        setOpen(false);
      }
      await fetchResponses();
      setIsFormVisible(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this response?")) return;
    try {
      await axiosInstance.delete(`/lead-config/responses/${id}?force=false`);
      await fetchResponses();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filteredResponses = responses.filter((resp) =>
    resp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLeadLimit = responses.reduce(
    (sum, resp) => sum + (Number(resp.lead_limit) || 0),
    0
  );

  const averageLeadLimit =
    responses.length > 0 && !isNaN(totalLeadLimit)
      ? Math.round(totalLeadLimit / responses.length)
      : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
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
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <StatCard icon={<MessageSquare />} label="Total Responses" value={responses.length} color="purple" />
            <StatCard icon={<Target />} label="Total Lead Limit" value={totalLeadLimit} color="blue" />
            <StatCard icon={<TrendingUp />} label="Average Limit" value={averageLeadLimit} color="green" />
            <StatCard icon={<Search />} label="Filtered" value={filteredResponses.length} color="amber" />
          </div>

          {/* Form */}
          {isFormVisible ? (
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
                  <InputField
                    label="Response Name"
                    icon={<FileText className="w-4 h-4" />}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                  <InputField
                    type="number"
                    label="Lead Limit"
                    icon={<Target className="w-4 h-4" />}
                    value={form.lead_limit}
                    onChange={(e) => setForm((f) => ({ ...f, lead_limit: e.target.value }))}
                    required
                    min={0}
                  />
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
                onClick={() => {
                  resetForm();
                  setIsFormVisible(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Create New Response
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Lead Limit</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResponses.map((resp) => (
                    <tr key={resp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">#{resp.id}</td>
                      <td className="px-6 py-4">{resp.name}</td>
                      <td className="px-6 py-4">{resp.lead_limit}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => fetchResponseById(resp.id)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(resp.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredResponses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center px-6 py-12 text-gray-500">
                        No responses found.
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

const StatCard = ({ icon, label, value, color }) => (
  <div className={`bg-${color}-50 rounded-xl p-4 border border-${color}-100`}>
    <div className="flex items-center gap-3">
      <div className={`bg-${color}-100 rounded-full p-2`}>{icon}</div>
      <div>
        <p className={`text-sm font-medium text-${color}-600`}>{label}</p>
        <p className={`text-2xl font-bold text-${color}-900`}>{value}</p>
      </div>
    </div>
  </div>
);

const InputField = ({ label, icon, ...props }) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      {icon}
      {label}
    </label>
    <input
      {...props}
      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
    />
  </div>
);

export default ResponseModel;
