"use client";
import { useEffect, useState, useRef } from "react";
import { axiosInstance } from "@/api/Axios";
import { usePermissions } from "@/context/PermissionsContext";

const emptyForm = {
  title: "",
  template: "",
  dltTemplateId: "",
  messageType: "TRANSACTIONAL",
  sourceAddress: "",
  allowedRoles: [], // role names
};

export default function SMSTemplatesSimplePage() {
  const { hasPermission } = usePermissions();
  const [templates, setTemplates] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null); // store whole tpl

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await axiosInstance.get("/sms-templates/");
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMsg("Failed to fetch templates: " + (error?.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  // ---------- Separate functions: ADD vs EDIT ----------
  const createTemplate = async (form) => {
    setMsg("");
    const payload = {
      title: form.title,
      template: form.template,
      dltTemplateId: form.dltTemplateId,
      messageType: form.messageType,
      sourceAddress: form.sourceAddress
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allowedRoles: form.allowedRoles, // array of role names
    };
    await axiosInstance.post("/sms-templates/", payload);
  };

  const updateTemplate = async (id, form) => {
    setMsg("");
    const payload = {
      title: form.title,
      template: form.template,
      dltTemplateId: form.dltTemplateId,
      messageType: form.messageType,
      sourceAddress: form.sourceAddress
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allowedRoles: form.allowedRoles, // array of role names
    };
    await axiosInstance.put(`/sms-templates/${id}`, payload);
  };
  // -----------------------------------------------------

  const openForCreate = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const openForEdit = (tpl) => {
    setEditingTemplate(tpl);
    setModalOpen(true);
  };

  const handleModalSubmit = async (form) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, form);
        setMsg("Template updated!");
      } else {
        await createTemplate(form);
        setMsg("Template created!");
      }
      setModalOpen(false);
      setEditingTemplate(null);
      await fetchTemplates();
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
      fetchTemplates();
    } catch (error) {
      setMsg(
        "Delete failed: " +
        (error?.response?.data?.message || error?.message || String(error))
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-700 py-10 px-5">
      <div className="max-w-screen-xl mx-auto font-sans">
        {/* Header */}
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
            {hasPermission("sms_add") && (
              <button
                onClick={openForCreate}
                className="px-3 py-2 bg-gradient-to-br from-indigo-500 to-purple-700 text-white rounded-xl shadow-lg flex items-center gap-2 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add
              </button>
            )}
          </div>
        </div>

        {/* Alert */}
        {msg && (
          <div
            className={`flex items-center gap-3 p-5 mb-6 rounded-lg shadow-md text-lg font-semibold ${msg.toLowerCase().includes("fail")
                ? "bg-red-50 border-2 border-red-400 text-red-600"
                : "bg-sky-50 border-2 border-sky-300 text-sky-800"
              }`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {msg.toLowerCase().includes("fail") ? (
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />
              ) : (
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3" />
              )}
            </svg>
            {msg}
          </div>
        )}

        {/* Table */}
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
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                >
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
                {hasPermission("sms_add") && (
                  <button
                    className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-700 text-white rounded-lg font-semibold text-sm transition-transform duration-300 hover:scale-[1.02]"
                    onClick={openForCreate}
                  >
                    Create First Template
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm divide-y">
                <thead>
                  <tr className="bg-white">
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      ID
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      Title
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      Template
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      DLT ID
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      Type
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      Source
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      Roles
                    </th>
                    <th className="px-5 py-4 font-bold text-left text-gray-700 border-b-2 border-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl) => {
                    const roles = (tpl.allowed_roles || []).filter(
                      (r) => r !== "SUPERADMIN")
                    ;
                    
                    return (
                      <tr key={tpl.id} className="odd:bg-white even:bg-gray-50">
                        <td className="px-5 py-4">
                          <span className="inline-block bg-gradient-to-br from-indigo-500 to-purple-700 text-white px-3 py-1 rounded-full text-xs font-bold">
                            #{tpl.id}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-gray-800">
                          {tpl.title}
                        </td>
                        <td className="px-5 py-4 text-gray-600 max-w-xs truncate">
                          {tpl.template}
                        </td>
                        <td className="px-5 py-4">
                          <code className="bg-gray-100 px-2 py-1 rounded text-[13px] text-gray-700">
                            {tpl.dlt_template_id
}
                          </code>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block text-xs font-semibold px-3 py-1 rounded ${(tpl.message_type || "").toUpperCase() ===
                                "TRANSACTIONAL"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {(tpl.message_type || "").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-[13px]">
                          {(tpl.source_address || []).join(", ")}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {roles.slice(0, 2).map((r) => (
                              <span
                                key={r}
                                className="inline-block bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[11px] font-medium"
                              >
                                {r}
                              </span>
                            ))}
                            {roles.length > 2 && (
                              <span className="text-gray-500 text-[11px] font-medium">
                                +{roles.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {hasPermission("sms_edit") && (
                              <button
                                onClick={() => openForEdit(tpl)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                              >
                                Edit
                              </button>
                            )}
                            {hasPermission("sms_delete") && (
                              <button
                                onClick={() => handleDelete(tpl.id)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <TemplateModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingTemplate(null);
          }}
          initialForm={
            editingTemplate
              ? {
                title: editingTemplate.title || "",
                template: editingTemplate.template || "",
                dltTemplateId: editingTemplate.dltTemplateId || "",
                messageType: (
                  editingTemplate.messageType || "TRANSACTIONAL"
                ).toUpperCase(),
                sourceAddress: (editingTemplate.sourceAddress || []).join(
                  ", "
                ),
                allowedRoles: (editingTemplate.allowedRoles || []).filter(
                  (r) => r !== "SUPERADMIN"
                ), // names
              }
              : emptyForm
          }
          onSubmit={handleModalSubmit}
          editing={Boolean(editingTemplate)}
        />
      )}
    </div>
  );
}

function TemplateModal({ open, onClose, initialForm, onSubmit, editing }) {
  const [form, setForm] = useState(initialForm);
  const [roles, setRoles] = useState([]); // role names (excluding SUPERADMIN)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateType, setTemplateType] = useState("Rational");
  const roleDropdownRef = useRef(null);

  // ---- Dynamic {#var#} builder state ----
  const rational_val = [
    { name: "#var#", value: "#var#" },
    { name: "Recommendation", value: "recommendation" },
    { name: "Stock Name", value: "stock_name" },
    { name: "Entry Price", value: "entry_price" },
    { name: "Targets", value: "targets" },
    { name: "Stop Loss", value: "stop_loss" },
  ];

  // Text parts around {#var#} tokens
  const [textParts, setTextParts] = useState([]);       // ["CASH:BUY ", " TARGET ", " STOP LOSS ", " www..."]
  const [varSelections, setVarSelections] = useState([]); // ["stock_name", "targets", "stop_loss"]

  // Parse initial form.template into parts + selections
  useEffect(() => {
    setForm(initialForm);
    hydrateBuilderFromTemplate(initialForm?.template || "");
  }, [initialForm]);

  // Load roles on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await axiosInstance.get("/profile-role/");
        const list = Array.isArray(res.data) ? res.data : [];
        // const names = list.map((r) => r?.name).filter((n) => n && n !== "SUPERADMIN");
        setRoles(list);
      } catch {
        setRoles([]);
      }
    })();
  }, [open]);

  // Close role dropdown on outside click
  const selectedRolesString =
    form.allowedRoles.length === 0
      ? "Select roles"
      : roles
        .filter((r) => form.allowedRoles.includes(String(r.id)))
        .map((r) => r.name)
        .join(", ");

  // ✅ Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setShowRoleDropdown(false);
      }
    };
    if (showRoleDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRoleDropdown]);

  // Generic input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // If user edits the raw template textarea directly, re-hydrate the builder
    if (name === "template") {
      hydrateBuilderFromTemplate(value || "");
    }
  };

  // Roles toggle helpers
  const toggleRole = (id) => {
    setForm((prev) => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(id)
        ? prev.allowedRoles.filter((r) => r !== id)
        : [...prev.allowedRoles, id],
    }));
  };
  const selectAllRoles = (e) => {
    if (e.target.checked) {
      setForm((prev) => ({
        ...prev,
        allowedRoles: roles.map((r) => String(r.id)), // सिर्फ IDs
      }));
    } else {
      setForm((prev) => ({ ...prev, allowedRoles: [] }));
    }
  };

  // ---- Builder helpers ----

  // Break template into text parts and {#var#} tokens
  function hydrateBuilderFromTemplate(tpl) {
    // Split on {#var#}
    const parts = tpl.split("{#var#}");
    // How many dropdowns we need:
    const tokenCount = Math.max(0, parts.length - 1);

    
    const inferredSelections = [];
    for (let i = 0; i < tokenCount; i++) {
      // Default to first item if no inference
      inferredSelections.push(rational_val[0].value);
    }

    setTextParts(parts);
    setVarSelections((prev) => {
      // If length changed, reset to defaults; else keep old
      return prev.length === tokenCount ? prev : inferredSelections;
    });

    // Also compile once so form.template mirrors any existing {#var#} as {token}
    compileTemplate(parts, varSelections.length === tokenCount ? varSelections : inferredSelections);
  }

  // Build final template string by interleaving textParts and selections → "{token}" format
  function compileTemplate(parts, selections) {
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      out += parts[i];
      if (i < selections.length) {
        out += `{${selections[i]}}`; // final curly-brace token
      }
    }
    setForm((prev) => ({ ...prev, template: out }));
  }

  // When a dropdown changes
  const handleVarChange = (idx, val) => {
    const next = [...varSelections];
    next[idx] = val;
    setVarSelections(next);
    compileTemplate(textParts, next);
  };

  // When a text chunk changes (user edits parts inline in builder)
  const handleTextPartChange = (idx, val) => {
    const next = [...textParts];
    next[idx] = val;
    setTextParts(next);
    compileTemplate(next, varSelections);
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // const selectedRolesString =
  //   form.allowedRoles?.length ? form.allowedRoles.join(", ") : "Select roles";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1100] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-[modalSlideIn_0.3s_ease-out]">
        <style>
          {`@keyframes modalSlideIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }`}
        </style>

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-t-2xl px-10 py-8 relative">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
            {editing ? "Edit Template" : "Create New Template"}
          </h2>
          <p className="text-base font-medium text-white/80 m-0">
            {editing ? "Update your SMS template configuration" : "Configure your new SMS template"}
          </p>
          <button
            className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition transform duration-200 ease-in-out hover:scale-110"
            onClick={onClose}
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-10">
          <form onSubmit={handleSubmit}>
            {/* Title + DLT ID */}
            <div className="flex gap-6 mb-6">
              <div className="flex-1">
                <label className="block">
                  <span className="block font-semibold text-gray-700 text-base mb-2">Title</span>
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
              <div className="flex-1">
                <label className="block">
                  <span className="block font-semibold text-gray-700 text-base mb-2">DLT Template ID</span>
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

            {/* Type + Source */}
            <div className="flex gap-6 mb-6">
              <div className="flex-1">
                <label className="block">
                  <span className="block font-semibold text-gray-700 text-base mb-2">Message Type</span>
                  <select
                    name="messageType"
                    value={form.messageType}
                    onChange={handleChange}
                    required
                    className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white pr-10 appearance-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  >
                    <option value="TRANSACTIONAL">Transactional</option>
                    <option value="PROMOTIONAL">Promotional</option>
                    <option value="Explicit">Service Explicit</option>
                    <option value="Implicit">Service Implicit</option>
                  </select>
                </label>
              </div>
              <div className="flex-1">
                <label className="block">
                  <span className="block font-semibold text-gray-700 text-base mb-2">Source Address</span>
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

            {/* Template type (your custom field) */}
            <div className="flex gap-6 mb-6">
              <div className="flex-1">
                <label className="block">
                  <span className="block font-semibold text-gray-700 text-base mb-2">Template Type</span>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white pr-10 appearance-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  >
                    <option value="Rational">Rational</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              {/* Allowed Roles */}
              <div className="flex-1">
                <span className="block font-semibold text-gray-700 text-base mb-2">Allowed Roles</span>
                <div ref={roleDropdownRef} className="relative mt-2">
                  <div
                    className={`w-full p-3.5 border-2 rounded-xl bg-white cursor-pointer flex items-center justify-between min-h-[48px] transition ${showRoleDropdown ? "border-indigo-500 ring-2 ring-indigo-100" : "border-gray-200"
                      }`}
                    onClick={() => setShowRoleDropdown((s) => !s)}
                  >
                    <span className={`text-[15px] ${form.allowedRoles.length ? "text-gray-700" : "text-gray-400"}`}>
                      {selectedRolesString}
                    </span>
                    <svg width="20" height="20" className={`w-5 h-5 fill-indigo-500 transition-transform ${showRoleDropdown ? "rotate-180" : ""}`} viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </div>

                  {showRoleDropdown && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-indigo-500 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-50 p-4 mt-1 max-h-52 overflow-y-auto">
                      {roles.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center p-3">Loading roles...</div>
                      ) : (
                        <>
                          <label className="flex items-center gap-3 px-3 py-2 rounded mb-1 font-semibold text-base bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.allowedRoles.length === roles.length}
                              onChange={selectAllRoles}
                              className="w-4 h-4 accent-indigo-600 cursor-pointer"
                            />
                            <span className="text-gray-800">Select All</span>
                          </label>

                          {roles.map((roleName) => (
                            <label key={roleName?.id} className="flex items-center gap-3 px-3 py-2 rounded mb-1 font-medium text-base hover:bg-gray-50 transition cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.allowedRoles.includes(String(roleName?.id))}
                                onChange={() => toggleRole(String(roleName?.id))}
                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                              />
                              <span className="text-gray-700">{roleName?.name}</span>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Raw Template Textarea */}
            <div className="mb-6">
              <label className="block">
                <span className="block font-semibold text-gray-700 text-base mb-2">Template Content</span>
                <textarea
                  name="template"
                  value={form.template}
                  onChange={handleChange}
                  required
                  className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition min-h-[120px] resize-y"
                  placeholder='Use {#var#} where you want a variable, e.g. "CASH:BUY {#var#} TARGET {#var#} STOP LOSS {#var#} ..."'
                  autoComplete="off"
                />
              </label>
            </div>

            {/* Dynamic Variable Builder */}
            {textParts.length > 0 && (textParts.length - 1 >= 0) && (
              <div className="mb-8">
                <span className="block font-semibold text-gray-700 text-base mb-2">
                  Dynamic Variable Builder
                </span>
                <div className="p-4 border-2 border-indigo-100 rounded-xl bg-indigo-50/30">
                  <div className="flex flex-wrap gap-2 overflow-y-auto">
                    {textParts.map((part, idx) => (
                      <div key={`part-${idx}`} className="flex items-center gap-2">
                        {/* Editable text chunk */}
                        <input
                          value={part}
                          disabled
                          onChange={(e) => handleTextPartChange(idx, e.target.value)}
                          className="px-2 py-1 border rounded-md text-sm max-w-xs"
                        />
                        {/* Insert dropdown between parts */}
                        {idx < textParts.length - 1 && (
                          <select
                            value={varSelections[idx] || rational_val[0].value}
                            onChange={(e) => handleVarChange(idx, e.target.value)}
                            className="px-2 py-1 border rounded-md text-sm"
                          >
                            {rational_val.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Preview of compiled template */}
                  <div className="mt-4 text-sm">
                    <span className="font-semibold text-gray-700 mr-2">Preview:</span>
                    <code className="bg-white border rounded px-2 py-1 break-words">
                      {form.template}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-base font-bold rounded-xl text-white transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg ${editing
                    ? "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                    : "bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  } ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {editing ? "Update Template" : "Create Template"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-4 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-semibold text-base transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

