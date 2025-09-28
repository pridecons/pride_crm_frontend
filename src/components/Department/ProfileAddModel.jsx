"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import PermissionsModal from "./permission";

export default function ProfileModal({
  isOpen,
  onClose,
  onSave,
  profile,
}) {
  const isEdit = !!profile;

  const [name, setName] = useState("");
  const [hierarchyLevel, setHierarchyLevel] = useState(1);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [departmentPermissions, setDepartmentPermissions] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);

  const [openPermModal, setOpenPermModal] = useState(false);

  // Prefill when editing
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setHierarchyLevel(profile.hierarchy_level || 1);
      setDescription(profile.description || "");
      setIsActive(profile.is_active ?? true);
      setSelectedPerms(
        Array.isArray(profile.default_permissions)
          ? profile.default_permissions
          : []
      );
      setSelectedDepartmentId(profile.department_id || null);
    } else {
      setName("");
      setHierarchyLevel(1);
      setDescription("");
      setIsActive(true);
      setSelectedPerms([]);
      setSelectedDepartmentId(null);
    }
  }, [profile]);

  // Fetch all departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axiosInstance.get(
          "/departments/?skip=0&limit=50&order_by=name"
        );
        setDepartments(res.data || []);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch permissions of the selected department
  useEffect(() => {
    const fetchDepartmentPermissions = async () => {
      if (selectedDepartmentId) {
        try {
          const res = await axiosInstance.get(
            `/departments/${selectedDepartmentId}`
          );
          setDepartmentPermissions(res.data.available_permissions || []);
        } catch (err) {
          console.error("Error fetching department permissions:", err);
          setDepartmentPermissions([]);
        }
      }
    };
    fetchDepartmentPermissions();
  }, [selectedDepartmentId]);

  const handlePermChange = (perms) => {
    setSelectedPerms(perms);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      department_id: Number(selectedDepartmentId),
      hierarchy_level: Number(hierarchyLevel),
      default_permissions: selectedPerms,
      description,
      is_active: isActive,
    };
    try {
      let res;
      if (isEdit) {
        res = await axiosInstance.patch(`/profile-role/${profile.id}`, payload);
      } else {
        res = await axiosInstance.post("/profile-role/", payload);
      }
      onSave(res.data);
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  if (!isOpen) return null;

  const selectedDepartment = departments.find((dept) => dept.id === selectedDepartmentId);

  // shared field class + theme styles
  const fieldBase = "w-full rounded-xl transition outline-none";
  const fieldTheme = {
    background: "var(--theme-card-bg, #ffffff)",
    color: "var(--theme-text, #0f172a)",
    borderColor: "var(--theme-border, #e5e7eb)",
  };
  const placeholderCss = `
    .themed-input::placeholder { color: var(--theme-text-muted, #6b7280); opacity: 1; }
    .themed-textarea::placeholder { color: var(--theme-text-muted, #6b7280); opacity: 1; }
  `;
  const focusTheme = {
    boxShadow:
      "0 0 0 4px color-mix(in oklab, var(--theme-primary, #4f46e5) 18%, transparent)",
    borderColor: "var(--theme-primary, #4f46e5)",
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: "var(--theme-modal-backdrop, color-mix(in oklab, #000 60%, transparent))",
        backdropFilter: "blur(6px)",
      }}
    >
      <style>{placeholderCss}</style>

      <div
        className="rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto border"
        style={{
          background: "var(--theme-card-bg, #ffffff)",
          borderColor: "var(--theme-border, #e5e7eb)",
          color: "var(--theme-text, #0f172a)",
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center p-8 pb-6 border-b"
          style={{
            borderColor: "var(--theme-border, #e5e7eb)",
            background:
              "linear-gradient(90deg, color-mix(in oklab, var(--theme-primary, #4f46e5) 9%, transparent), color-mix(in oklab, var(--theme-accent, #7c3aed) 9%, transparent))",
          }}
        >
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {isEdit ? "Edit Profile" : "Create New Profile"}
            </h2>
            <p style={{ color: "var(--theme-text-muted, #6b7280)" }}>
              {isEdit
                ? "Update profile information and permissions"
                : "Define a new role with specific permissions"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors duration-200"
            style={{ color: "var(--theme-text-muted, #6b7280)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "color-mix(in oklab, var(--theme-text, #0f172a) 8%, transparent)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Name */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Profile Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. Senior Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${fieldBase} themed-input px-4 py-3 border`}
                style={fieldTheme}
                onFocus={(e) => Object.assign(e.currentTarget.style, { ...fieldTheme, ...focusTheme })}
                onBlur={(e) => Object.assign(e.currentTarget.style, fieldTheme)}
                required
              />
            </div>

            {/* Department Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Department <span style={{ color: "#ef4444" }}>*</span></label>
              <div className="relative">
                <select
                  className={`${fieldBase} px-4 py-3 border`}
                  style={{
                    ...fieldTheme,
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                  }}
                  value={selectedDepartmentId || ""}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  onFocus={(e) => Object.assign(e.currentTarget.style, { ...fieldTheme, ...focusTheme })}
                  onBlur={(e) => Object.assign(e.currentTarget.style, fieldTheme)}
                  required
                >
                  <option value="" disabled>
                    Choose a department
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>

                {/* custom caret via CSS variable color */}
                <div
                  className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
                  style={{ color: "var(--theme-text-muted, #6b7280)" }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {selectedDepartment && (
                <p className="text-xs" style={{ color: "var(--theme-primary, #4f46e5)" }}>
                  Selected: {selectedDepartment.name}
                </p>
              )}
            </div>

            {/* Hierarchy Level */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Hierarchy Level</label>
              <input
                type="number"
                placeholder="1"
                value={hierarchyLevel}
                onChange={(e) => setHierarchyLevel(e.target.value)}
                className={`${fieldBase} px-4 py-3 border`}
                style={fieldTheme}
                onFocus={(e) => Object.assign(e.currentTarget.style, { ...fieldTheme, ...focusTheme })}
                onBlur={(e) => Object.assign(e.currentTarget.style, fieldTheme)}
                min="1"
              />
              <p className="text-xs" style={{ color: "var(--theme-text-muted, #6b7280)" }}>
                Lower numbers indicate higher authority
              </p>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Default Permissions</label>
              <button
                type="button"
                onClick={() => setOpenPermModal(true)}
                className="w-full rounded-xl px-4 py-3 font-medium shadow-lg transition-all duration-200"
                style={{
                  color: "#fff",
                  background:
                    "linear-gradient(90deg, var(--theme-primary, #4f46e5), var(--theme-accent, #7c3aed))",
                  opacity: selectedDepartmentId ? 1 : 0.6,
                  cursor: selectedDepartmentId ? "pointer" : "not-allowed",
                }}
                disabled={!selectedDepartmentId}
              >
                {!selectedDepartmentId
                  ? "Select Department First"
                  : `Select Permissions (${selectedPerms.length} selected)`}
              </button>

              {selectedPerms.length > 0 && (
                <div
                  className="p-4 rounded-xl border mt-2"
                  style={{
                    background: "var(--theme-primary-weak, rgba(79,70,229,0.06))",
                    borderColor: "color-mix(in oklab, var(--theme-primary, #4f46e5) 40%, transparent)",
                  }}
                >
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: "var(--theme-primary, #4f46e5)" }}
                  >
                    Selected Permissions:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPerms.map((perm, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
                        style={{
                          background: "var(--theme-primary-weak, rgba(79,70,229,0.08))",
                          color: "var(--theme-primary, #4f46e5)",
                          borderColor:
                            "color-mix(in oklab, var(--theme-primary, #4f46e5) 35%, transparent)",
                        }}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description - Full Width */}
            <div className="lg:col-span-2 space-y-2">
              <label className="block text-sm font-semibold">Description</label>
              <textarea
                placeholder="Describe the role responsibilities and scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${fieldBase} themed-textarea px-4 py-3 border resize-none`}
                rows={3}
                style={fieldTheme}
                onFocus={(e) => Object.assign(e.currentTarget.style, { ...fieldTheme, ...focusTheme })}
                onBlur={(e) => Object.assign(e.currentTarget.style, fieldTheme)}
              />
            </div>

            {/* Active Status */}
            <div className="lg:col-span-2">
              <div
                className="flex items-center space-x-3 rounded-xl p-4"
                style={{ background: "var(--theme-primary-weak, rgba(79,70,229,0.05))" }}
              >
                <input
                  type="checkbox"
                  id="profile-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded"
                  style={{
                    accentColor: "var(--theme-success, #16a34a)",
                    border: "2px solid var(--theme-border, #e5e7eb)",
                  }}
                />
                <div>
                  <label htmlFor="profile-active" className="text-sm font-medium cursor-pointer">
                    Active Profile
                  </label>
                  <p className="text-xs" style={{ color: "var(--theme-text-muted, #6b7280)" }}>
                    Active profiles can be assigned to users
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className="lg:col-span-2 flex justify-end gap-3 pt-6 border-t"
              style={{ borderColor: "var(--theme-border, #e5e7eb)" }}
            >
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-medium transition-all duration-200"
                style={{
                  background: "transparent",
                  color: "var(--theme-text, #0f172a)",
                  border: "1px solid var(--theme-border, #e5e7eb)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "color-mix(in oklab, var(--theme-text, #0f172a) 6%, transparent)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-8 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
                style={{
                  color: "#fff",
                  background:
                    "linear-gradient(90deg, var(--theme-success, #16a34a), color-mix(in oklab, var(--theme-success, #16a34a) 85%, var(--theme-success-weak, #22c55e)))",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.filter = "brightness(0.98)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
              >
                {isEdit ? "Update Profile" : "Create Profile"}
              </button>
            </div>
          </form>
        </div>

        <PermissionsModal
          isOpen={openPermModal}
          onClose={() => setOpenPermModal(false)}
          selectedPermissions={selectedPerms}
          onChange={handlePermChange}
          availablePermissions={departmentPermissions}
        />
      </div>
    </div>
  );
}

