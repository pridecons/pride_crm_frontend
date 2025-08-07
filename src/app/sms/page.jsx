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
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-10 mb-8 shadow-lg border border-white/20">
          <div className="flex flex-wrap justify-between items-center gap-5">
            <div>
              <h1 className="text-5xl font-extrabold mb-3
                bg-gradient-to-br from-indigo-500 to-purple-700
                bg-clip-text text-transparent tracking-tight">
                SMS Templates
              </h1>
              <p className="m-0 text-lg font-medium text-gray-500">
                Manage your SMS templates and messaging configurations
              </p>
            </div>
            <button
              className="px-8 py-4 bg-gradient-to-br from-indigo-500 to-purple-700 text-white rounded-xl shadow-lg flex items-center gap-2
            transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add New Template
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {msg && (
          <div className={`flex items-center gap-3 p-5 mb-6 rounded-lg shadow-md text-lg font-semibold
                 ${msg.includes("failed")
              ? "bg-red-50 border-2 border-red-400 text-red-600"
              : "bg-sky-50 border-2 border-sky-300 text-sky-800"}`}>
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
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden
                 shadow-lg border border-white/20">
          {loading ? (
            <div className="flex flex-col items-center gap-5 py-20 px-10 text-center">
              <div className="w-16 h-16 border-8 border-gray-200 border-t-8 border-t-indigo-500 rounded-full animate-spin"></div>
              <style>
                {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
              </style>
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
                <button className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-700
+                   text-white rounded-lg font-semibold text-sm
+                   transition-transform duration-300 hover:scale-[1.02]"
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                        </svg>
                        ID
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
                        </svg>
                        Title
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Template
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M12 2v4 M8 6h8" />
                        </svg>
                        DLT ID
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2h-7l-4 4z" />
                        </svg>
                        Type
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" />
                        </svg>
                        Source
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                        </svg>
                        Roles
                      </div>
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                      className={`transition-transform duration-200 ease-in-out ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-sky-50 hover:scale-[1.002]`}
                    >
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <span className="inline-block bg-gradient-to-br from-indigo-500 to-purple-700
                  text-white px-3 py-1 rounded-full text-xs font-bold">
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
                        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded
     ${tpl.message_type === "TRANSACTIONAL"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"}`}>
                          {tpl.message_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <div style={{ color: "#6b7280", fontSize: "13px" }}>
                          {(tpl.source_address || []).join(", ")}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          maxWidth: "150px"
                        }}>
                          {(tpl.allowed_roles || [])
                            .filter(r => r !== "SUPERADMIN")
                            .slice(0, 2)
                            .map(role => (
                              <span key={role} className="inline-block bg-green-50 text-green-700 px-1.5 py-0.5
                 rounded text-[11px] font-medium">
                                {role}
                              </span>
                            ))}
                          {(tpl.allowed_roles || []).filter(r => r !== "SUPERADMIN").length > 2 && (
                            <span style={{
                              color: "#6b7280",
                              fontSize: "11px",
                              fontWeight: "500"
                            }}>
                              +{(tpl.allowed_roles || []).filter(r => r !== "SUPERADMIN").length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-800 align-middle">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            style={enhancedEditBtn}
                            onClick={() => openModal(tpl)}
                            title="Edit Template"
                            onMouseEnter={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            style={enhancedDeleteBtn}
                            onClick={() => setDeleteId(tpl.id)}
                            title="Delete Template"
                            onMouseEnter={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                          </button>
                          {deleteId === tpl.id && (
                            <div className="flex items-center gap-2 ml-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                              <span style={{
                                color: "#dc2626",
                                fontWeight: "600",
                                fontSize: "13px"
                              }}>
                                Confirm?
                              </span>
                              <button
                                style={{
                                  ...enhancedDeleteBtn,
                                  padding: "4px 8px",
                                  fontSize: "12px"
                                }}
                                onClick={() => handleDelete(tpl.id)}
                              >
                                Yes
                              </button>
                              <button
                                style={{
                                  ...enhancedEditBtn,
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)"
                                }}
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
            <div className="flex flex-wrap justify-between items-center gap-5">
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
                  style={{
                    position: "absolute",
                    right: "24px",
                    top: "24px",
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onClick={closeModal}
                  title="Close"
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(255, 255, 255, 0.3)";
                    e.target.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(255, 255, 255, 0.2)";
                    e.target.style.transform = "scale(1)";
                  }}
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
                          Field Label
                        </span>
                        <input
                          type="text"
                          name="title"
                          value={form.title}
                          onChange={handleChange}
                          required
                          style={enhancedInput}
                          placeholder="Enter template title"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block w-full">
                        <span className="block font-semibold text-gray-700 text-base mb-2">DLT Template ID</span>
                        <input
                          type="text"
                          name="dltTemplateId"
                          value={form.dltTemplateId}
                          onChange={handleChange}
                          required
                          style={enhancedInput}
                          placeholder="Enter DLT template ID"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Row 2: Message Type and Source Address */}
                  <div style={enhancedFormRow}>
                    <div style={enhancedFormGroup}>
                      <label style={enhancedLabel}>
                        <span style={enhancedLabelText}>Message Type</span>
                        <select
                          name="messageType"
                          value={form.messageType}
                          onChange={handleChange}
                          required
                          style={{
                            ...enhancedInput,
                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg fill="#667eea" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')}")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 12px center",
                            backgroundSize: "16px",
                            paddingRight: "40px",
                            appearance: "none"
                          }}
                        >
                          <option value="TRANSACTIONAL">Transactional</option>
                          <option value="PROMOTIONAL">Promotional</option>
                        </select>
                      </label>
                    </div>
                    <div style={enhancedFormGroup}>
                      <label style={enhancedLabel}>
                        <span style={enhancedLabelText}>Source Address</span>
                        <input
                          type="text"
                          name="sourceAddress"
                          value={form.sourceAddress}
                          onChange={handleChange}
                          required
                          style={enhancedInput}
                          placeholder="PRIDTT, etc (comma separated)"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Row 3: Template Content */}
                  <div style={{ marginBottom: "24px" }}>
                    <label style={enhancedLabel}>
                      <span style={enhancedLabelText}>Template Content</span>
                      <textarea
                        name="template"
                        value={form.template}
                        onChange={handleChange}
                        required
                        style={{
                          ...enhancedInput,
                          minHeight: "120px",
                          resize: "vertical",
                          fontFamily: "inherit"
                        }}
                        placeholder="Enter your SMS template content..."
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  {/* Row 4: Allowed Roles */}
                  <div style={{ marginBottom: "32px" }}>
                    <div style={enhancedLabel}>
                      <span style={enhancedLabelText}>Allowed Roles</span>
                      <div
                        ref={roleDropdownRef}
                        style={{ position: "relative", marginTop: "8px" }}
                      >
                        <div
                          style={{
                            ...enhancedInput,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            minHeight: "48px",
                            borderColor: showRoleDropdown ? "#667eea" : "#e5e7eb",
                            boxShadow: showRoleDropdown ? "0 0 0 3px rgba(102, 126, 234, 0.1)" : "none"
                          }}
                          onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        >
                          <span style={{
                            color: form.allowedRoles.length ? "#374151" : "#9ca3af",
                            fontSize: "15px"
                          }}>
                            {selectedRolesString}
                          </span>
                          <svg
                            width="20"
                            height="20"
                            style={{
                              transform: showRoleDropdown ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s ease",
                              fill: "#667eea"
                            }}
                            viewBox="0 0 24 24"
                          >
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </div>
                        {showRoleDropdown && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              background: "#ffffff",
                              border: "2px solid #667eea",
                              borderRadius: "12px",
                              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                              zIndex: 200,
                              padding: "16px",
                              marginTop: "4px",
                              maxHeight: "200px",
                              overflowY: "auto"
                            }}
                          >
                            {roles.length === 0 ? (
                              <div style={{
                                color: "#9ca3af",
                                fontSize: "14px",
                                textAlign: "center",
                                padding: "12px"
                              }}>
                                Loading roles...
                              </div>
                            ) : (
                              roles.map((role) => (
                                <label key={role} style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  cursor: "pointer",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  marginBottom: "4px",
                                  transition: "background 0.15s ease",
                                  fontSize: "15px",
                                  fontWeight: "500"
                                }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background = "#f8fafc";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background = "transparent";
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={form.allowedRoles.includes(role)}
                                    onChange={() => handleRoleToggle(role)}
                                    style={{
                                      width: "18px",
                                      height: "18px",
                                      accentColor: "#667eea",
                                      cursor: "pointer"
                                    }}
                                  />
                                  <span style={{ color: "#374151" }}>{role}</span>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div style={{
                    display: "flex",
                    gap: "16px",
                    paddingTop: "24px",
                    borderTop: "1px solid #f3f4f6"
                  }}>
                    <button
                      type="submit"
                      style={{
                        flex: "1",
                        padding: "16px 24px",
                        background: editingId
                          ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: "700",
                        fontSize: "16px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow = editingId
                          ? "0 8px 32px rgba(139, 92, 246, 0.4)"
                          : "0 8px 32px rgba(102, 126, 234, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                      }}
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
                      style={{
                        flex: "0 0 auto",
                        padding: "16px 24px",
                        background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                        color: "#374151",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: "600",
                        fontSize: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)";
                      }}
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
    </div >
  );
}

// Enhanced styles
const enhancedFormRow = {
  display: "flex",
  gap: "24px",
  marginBottom: "24px"
};

const enhancedFormGroup = {
  flex: "1",
  minWidth: "0"
};

const enhancedLabel = {
  display: "block",
  width: "100%"
};

const enhancedLabelText = {
  display: "block",
  fontWeight: "600",
  color: "#374151",
  fontSize: "15px",
  marginBottom: "8px"
};

const enhancedInput = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "12px",
  border: "2px solid #e5e7eb",
  fontSize: "15px",
  background: "#ffffff",
  transition: "all 0.2s ease",
  fontFamily: "inherit",
  outline: "none",
  ":focus": {
    borderColor: "#667eea",
    boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)"
  }
};

const enhancedTh = {
  padding: "16px 20px",
  fontWeight: "700",
  color: "#374151",
  fontSize: "14px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid #e5e7eb"
};

const enhancedTd = {
  padding: "16px 20px",
  fontSize: "14px",
  verticalAlign: "middle",
  color: "#374151",
  border: "none"
};

const enhancedEditBtn = {
  padding: "8px 16px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  gap: "6px"
};

const enhancedDeleteBtn = {
  padding: "8px 16px",
  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  gap: "6px"
};