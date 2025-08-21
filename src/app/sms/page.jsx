"use client";
import { useEffect, useState, useRef } from "react";
import { axiosInstance } from "@/api/Axios";

const emptyForm = {
  title: "",
  template: "",
  dltTemplateId: "",
  messageType: "TRANSACTIONAL",
  sourceAddress: "",
  allowedRoles: [],
};

export default function SMSTemplatesSimplePage() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [roles, setRoles] = useState([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const roleDropdownRef = useRef();

  useEffect(() => {
    fetchRoles();
    fetchTemplates();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setShowRoleDropdown(false);
      }
    }
    if (showRoleDropdown) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showRoleDropdown]);

  const fetchRoles = async () => {
    try {
      const res = await axiosInstance.get("/profile-role/");
      setRoles(res.data.filter(r => r !== "SUPERADMIN"));
    } catch (error) {
      setMsg("Failed to fetch roles: " + (error?.message || String(error)));
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await axiosInstance.get("/sms-templates/");
      setTemplates(res.data);
    } catch (error) {
      setMsg("Failed to fetch templates: " + (error?.message || String(error)));
    }
    setLoading(false);
  };

  const openModal = (tpl = null) => {
    if (tpl) {
      setForm({
        title: tpl.title,
        template: tpl.template,
        dltTemplateId: tpl.dlt_template_id,
        messageType: tpl.message_type?.toUpperCase() || "TRANSACTIONAL",
        sourceAddress: (tpl.source_address || []).join(", "),
        allowedRoles: (tpl.allowed_roles || []).filter(r => r !== "SUPERADMIN"),
      });
      setEditingId(tpl.id);
    } else {
      setForm(emptyForm);
      setEditingId(null);
    }
    setMsg("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setShowRoleDropdown(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Handle role checkbox
  const handleRoleToggle = (role) => {
    setForm((prev) => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(role)
        ? prev.allowedRoles.filter((r) => r !== role)
        : [...prev.allowedRoles, role],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    const payload = {
      title: form.title,
      template: form.template,
      dltTemplateId: form.dltTemplateId,
      messageType: form.messageType,
      sourceAddress: form.sourceAddress
        .split(",")
        .map((s) => s.trim())
        .filter((s) => !!s),
      allowedRoles: form.allowedRoles,
    };
    try {
      if (editingId) {
        await axiosInstance.put(`/sms-templates/${editingId}`, payload);
        setMsg("Template updated!");
      } else {
        await axiosInstance.post("/sms-templates/", payload);
        setMsg("Template created!");
      }
      closeModal();
      fetchTemplates();
    } catch (error) {
      setMsg(
        "Save failed: " +
        (error?.response?.data?.message || error?.message || String(error))
      );
    }
  };

  const handleDelete = async (id) => {
    setMsg("");
    try {
      await axiosInstance.delete(`/sms-templates/${id}`);
      setMsg("Template deleted!");
      setDeleteId(null);
      fetchTemplates();
    } catch (error) {
      setMsg(
        "Delete failed: " +
        (error?.response?.data?.message || error?.message || String(error))
      );
    }
  };

  const selectedRolesString = form.allowedRoles.length
    ? form.allowedRoles.join(", ")
    : "Select roles";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-700 py-10 px-5">
      <div className="max-w-screen-xl mx-auto font-sans">
        {/* Header Section */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl px-10 py-4 mb-8 shadow-lg border border-white/20">
          <div className="flex flex-wrap justify-between items-center gap-5">
            <div>
              <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-br from-indigo-500 to-purple-700 bg-clip-text text-transparent tracking-tight">
                SMS Templates
              </h1>
              <p className="m-0 text-lg font-medium text-gray-500">
                Manage your SMS templates and messaging configurations
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="px-3 py-2 bg-gradient-to-br from-indigo-500 to-purple-700 text-white rounded-xl shadow-lg flex items-center gap-2 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {msg && (
          <div className={`flex items-center gap-3 p-5 mb-6 rounded-lg shadow-md text-lg font-semibold ${msg.includes("failed") || msg.includes("Failed")
              ? "bg-red-50 border-2 border-red-400 text-red-600"
              : "bg-sky-50 border-2 border-sky-300 text-sky-800"
            }`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {msg.includes("failed") || msg.includes("Failed") ? (
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />
              ) : (
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3" />
              )}
            </svg>
            {msg}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg border border-white/20">
          {loading ? (
            <div className="flex flex-col items-center gap-5 py-20 px-10 text-center">
              <div className="w-16 h-16 border-8 border-gray-200 border-t-8 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="m-0 text-lg font-medium text-gray-500">
                Loading templates...
              </p>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-6 py-20 px-10 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="mb-2 text-2xl font-bold text-gray-800">
                  No templates found
                </h3>
                <p className="mb-6 text-base text-gray-500">
                  Get started by creating your first SMS template
                </p>
                <button
                  className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-700 text-white rounded-lg font-semibold text-sm transition-transform duration-300 hover:scale-[1.02]"
                  onClick={() => openModal()}
                >
                  Create First Template
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm divide-y">
                <thead>
                  <tr className="bg-white hover:bg-sky-50 hover:scale-[1.002] transition-transform duration-200 ease-in-out">
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                        </svg>
                        ID
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
                        </svg>
                        Title
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Template
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M12 2v4 M8 6h8" />
                        </svg>
                        DLT ID
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2h-7l-4 4z" />
                        </svg>
                        Type
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" />
                        </svg>
                        Source
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                        </svg>
                        Roles
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl, index) => (
                    <tr
                      key={tpl.id}
                      className={`transition-transform duration-200 ease-in-out ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-sky-50 hover:scale-[1.002]`}
                    >
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <span className="inline-block bg-gradient-to-br from-indigo-500 to-purple-700 text-white px-3 py-1 rounded-full text-xs font-bold">
                          #{tpl.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <div className="font-semibold text-gray-800">{tpl.title}</div>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <div className="max-w-xs truncate text-gray-600">
                          {tpl.template}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <code className="bg-gray-100 px-2 py-1 rounded text-[13px] text-gray-700">
                          {tpl.dlt_template_id}
                        </code>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded ${tpl.message_type === "TRANSACTIONAL"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                          }`}>
                          {tpl.message_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <div className="text-gray-500 text-[13px]">
                          {(tpl.source_address || []).join(", ")}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {(tpl.allowed_roles || [])
                            .filter(r => r !== "SUPERADMIN")
                            .slice(0, 2)
                            .map(role => (
                              <span key={role} className="inline-block bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[11px] font-medium">
                                {role}
                              </span>
                            ))}
                          {(tpl.allowed_roles || []).filter(r => r !== "SUPERADMIN").length > 2 && (
                            <span className="text-gray-500 text-[11px] font-medium">
                              +{(tpl.allowed_roles || []).filter(r => r !== "SUPERADMIN").length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(tpl)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-transform duration-200 ease-in-out hover:-translate-y-1 flex items-center gap-1"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(tpl.id)}
                            className="px-4 py-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold text-sm transition-transform duration-200 ease-in-out hover:-translate-y-1 flex items-center gap-1"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                          </button>
                          {deleteId === tpl.id && (
                            <div className="flex items-center gap-2 ml-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                              <span className="text-red-600 font-semibold text-[13px]">
                                Confirm?
                              </span>
                              <button
                                className="px-2 py-1 text-xs bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded font-semibold transition-transform duration-200 ease-in-out hover:-translate-y-1"
                                onClick={() => handleDelete(tpl.id)}
                              >
                                Yes
                              </button>
                              <button
                                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition"
                                onClick={() => setDeleteId(null)}
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1100] flex items-center justify-center p-5">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-[modalSlideIn_0.3s_ease-out]">
              <style>
                {`@keyframes modalSlideIn { 
                  from { opacity: 0; transform: scale(0.9) translateY(20px); } 
                  to { opacity: 1; transform: scale(1) translateY(0); } 
                }`}
              </style>

              {/* Modal Header */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-t-2xl px-10 py-8 relative">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                  {editingId ? "Edit Template" : "Create New Template"}
                </h2>
                <p className="text-base font-medium text-white/80 m-0">
                  {editingId ? "Update your SMS template configuration" : "Configure your new SMS template"}
                </p>
                <button
                  className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition transform duration-200 ease-in-out hover:scale-110"
                  onClick={closeModal}
                  title="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-10">
                <form onSubmit={handleSubmit}>
                  {/* Row 1: Title and DLT ID */}
                  <div className="flex gap-6 mb-6">
                    <div className="flex-1 min-w-0">
                      <label className="block w-full">
                        <span className="block font-semibold text-gray-700 text-base mb-2">
                          Title
                        </span>
                        <input
                          type="text"
                          name="title"
                          value={form.title}
                          onChange={handleChange}
                          required
                          className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                          placeholder="Enter template title"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block w-full">
                        <span className="block font-semibold text-gray-700 text-base mb-2">
                          DLT Template ID
                        </span>
                        <input
                          type="text"
                          name="dltTemplateId"
                          value={form.dltTemplateId}
                          onChange={handleChange}
                          required
                          className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                          placeholder="Enter DLT template ID"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Row 2: Message Type and Source Address */}
                  <div className="flex gap-6 mb-6">
                    <div className="flex-1 min-w-0">
                      <label className="block w-full">
                        <span className="block font-semibold text-gray-700 text-base mb-2">
                          Message Type
                        </span>
                        <select
                          name="messageType"
                          value={form.messageType}
                          onChange={handleChange}
                          required
                          className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white bg-[url('data:image/svg+xml;utf8,<svg…/>')] bg-no-repeat bg-[right_12px_center] bg-[length:16px] pr-10 appearance-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                        >
                          <option value="TRANSACTIONAL">Transactional</option>
                          <option value="PROMOTIONAL">Promotional</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block w-full">
                        <span className="block font-semibold text-gray-700 text-base mb-2">
                          Source Address
                        </span>
                        <input
                          type="text"
                          name="sourceAddress"
                          value={form.sourceAddress}
                          onChange={handleChange}
                          required
                          className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                          placeholder="PRIDTT, etc (comma separated)"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Row 3: Template Content */}
                  <div className="mb-6">
                    <label className="block w-full">
                      <span className="block font-semibold text-gray-700 text-base mb-2">
                        Template Content
                      </span>
                      <textarea
                        name="template"
                        value={form.template}
                        onChange={handleChange}
                        required
                        className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition min-h-[120px] resize-y"
                        placeholder="Enter your SMS template content..."
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  {/* Row 4: Allowed Roles */}
                  <div className="mb-8">
                    <div className="block w-full">
                      <span className="block font-semibold text-gray-700 text-base mb-2">
                        Allowed Roles
                      </span>
                      <div
                        ref={roleDropdownRef}
                        className="relative mt-2"
                      >
                        <div
                          className={`w-full p-3.5 border-2 rounded-xl bg-white cursor-pointer flex items-center justify-between min-h-[48px] transition ${showRoleDropdown
                              ? "border-indigo-500 ring-2 ring-indigo-100"
                              : "border-gray-200"
                            }`}
                          onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        >
                          <span className={`text-[15px] ${form.allowedRoles.length ? "text-gray-700" : "text-gray-400"}`}>
                            {selectedRolesString}
                          </span>
                          <svg
                            width="20"
                            height="20"
                            className={`w-5 h-5 fill-indigo-500 transition-transform duration-200 ease-in-out ${showRoleDropdown ? "rotate-180" : ""
                              }`}
                            viewBox="0 0 24 24"
                          >
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </div>
                        {showRoleDropdown && (
                          <div className="absolute top-full left-0 right-0 bg-white border-2 border-indigo-500 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-50 p-4 mt-1 max-h-52 overflow-y-auto">
                            {roles.length === 0 ? (
                              <div className="text-gray-400 text-sm text-center p-3">
                                Loading roles...
                              </div>
                            ) : (
                              <>
                                {/* ✅ Select All Option */}
                                <label
                                  className="flex items-center gap-3 px-3 py-2 rounded mb-1 font-semibold text-base bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={form.allowedRoles.length === roles.length} // all selected
                                    onChange={() => {
                                      if (form.allowedRoles.length === roles.length) {
                                        // Unselect all
                                        setForm((prev) => ({ ...prev, allowedRoles: [] }));
                                      } else {
                                        // Select all
                                        setForm((prev) => ({ ...prev, allowedRoles: roles }));
                                      }
                                    }}
                                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                  />
                                  <span className="text-gray-800">Select All</span>
                                </label>

                                {/* ✅ Individual Roles */}
                                {roles.map((role) => (
                                  <label
                                    key={role}
                                    className="flex items-center gap-3 px-3 py-2 rounded mb-1 font-medium text-base hover:bg-gray-50 transition cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={form.allowedRoles.includes(role)}
                                      onChange={() => handleRoleToggle(role)}
                                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                    />
                                    <span className="text-gray-700">{role}</span>
                                  </label>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-100">
                    <button
                      type="submit"
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-base font-bold rounded-xl text-white transition-transform duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg ${editingId
                          ? "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                          : "bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                        }`}
                    >
                      {editingId ? (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Update Template
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Create Template
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-4 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-semibold text-base transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}