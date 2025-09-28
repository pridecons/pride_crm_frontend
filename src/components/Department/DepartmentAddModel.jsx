"use client";

import { axiosInstance } from "@/api/Axios";
import { useState, useEffect } from "react";
import PermissionsModal from "./permission";

export default function AddDepartmentModal({ isOpen, onClose, onSave, department }) {
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [openPermModal, setOpenPermModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Prefill form if editing
  useEffect(() => {
    if (department) {
      setNewDeptName(department.name || "");
      setNewDeptDesc(department.description || "");
      setIsActive(department.is_active ?? true);
      setSelectedPerms(department.available_permissions || []);
    } else {
      setNewDeptName("");
      setNewDeptDesc("");
      setIsActive(true);
      setSelectedPerms([]);
    }
  }, [department, isOpen]);

  // Fetch permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await axiosInstance.get("/permissions/");
        setAvailablePermissions(res.data || []);
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setLoading(true);
      }
    };
    if (isOpen) fetchPermissions();
  }, [isOpen]);

  const handlePermChange = (perms) => {
    setSelectedPerms(perms);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newDeptName,
        description: newDeptDesc,
        is_active: isActive,
        available_permissions: selectedPerms,
      };

      let res;
      if (department) {
        res = await axiosInstance.patch(`/departments/${department.id}`, payload);
      } else {
        res = await axiosInstance.post("/departments/", payload);
      }

      onSave(res.data);
      onClose();
    } catch (error) {
      console.error("Error saving department:", error);
    }
  };

  if (!isOpen) return null;

  // shared themed field styles
  const fieldBase = "w-full rounded-xl transition outline-none";
  const fieldTheme = {
    background: "var(--theme-card-bg, #ffffff)",
    color: "var(--theme-text, #0f172a)",
    borderColor: "var(--theme-border, #e5e7eb)",
  };
  const focusTheme = {
    boxShadow:
      "0 0 0 4px color-mix(in oklab, var(--theme-primary, #4f46e5) 18%, transparent)",
    borderColor: "var(--theme-primary, #4f46e5)",
  };
  const placeholderCss = `
    .themed-input::placeholder { color: var(--theme-text-muted, #6b7280); opacity: 1; }
    .themed-textarea::placeholder { color: var(--theme-text-muted, #6b7280); opacity: 1; }
  `;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background:
          "var(--theme-modal-backdrop, color-mix(in oklab, #000 60%, transparent))",
        backdropFilter: "blur(6px)",
      }}
    >
      <style>{placeholderCss}</style>

      <div
        className="rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border"
        style={{
          background: "var(--theme-card-bg, #ffffff)",
          borderColor: "var(--theme-border, #e5e7eb)",
          color: "var(--theme-text, #0f172a)",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {department ? "Edit Department" : "Create New Department"}
            </h2>
            <p style={{ color: "var(--theme-text-muted, #6b7280)" }}>
              {department
                ? "Update department information"
                : "Add a new department to your organization"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors duration-200"
            style={{ color: "var(--theme-text-muted, #6b7280)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "color-mix(in oklab, var(--theme-text, #0f172a) 8%, transparent)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Department Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              Department Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className={`${fieldBase} themed-input px-4 py-3 border`}
              style={fieldTheme}
              onFocus={(e) =>
                Object.assign(e.currentTarget.style, { ...fieldTheme, ...focusTheme })
              }
              onBlur={(e) => Object.assign(e.currentTarget.style, fieldTheme)}
              placeholder="Enter department name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Description</label>
            <textarea
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
              className={`${fieldBase} themed-textarea px-4 py-3 border resize-none`}
              style={fieldTheme}
              onFocus={(e) =>
                Object.assign(e.currentTarget.style, { ...fieldTheme, ...focusTheme })
              }
              onBlur={(e) => Object.assign(e.currentTarget.style, fieldTheme)}
              placeholder="Enter department description"
              rows={3}
            />
          </div>

          {/* Permissions Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold">Default Permissions</label>
            <button
              type="button"
              onClick={() => setOpenPermModal(true)}
              className="w-full rounded-xl px-4 py-3 font-medium shadow-lg transition-all duration-200"
              style={{
                color: "#fff",
                background:
                  "linear-gradient(90deg, var(--theme-primary, #4f46e5), color-mix(in oklab, var(--theme-primary, #4f46e5) 85%, var(--theme-accent, #7c3aed)))",
              }}
            >
              Select Permissions ({selectedPerms.length} selected)
            </button>

            {selectedPerms.length > 0 && (
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--theme-primary-weak, rgba(79,70,229,0.06))",
                  borderColor:
                    "color-mix(in oklab, var(--theme-primary, #4f46e5) 40%, transparent)",
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
                        background:
                          "var(--theme-primary-weak, rgba(79,70,229,0.08))",
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

          <PermissionsModal
            isOpen={openPermModal}
            onClose={() => setOpenPermModal(false)}
            selectedPermissions={selectedPerms}
            onChange={handlePermChange}
            availablePermissions={availablePermissions}
          />

          {/* Active Status */}
          <div
            className="flex items-center space-x-3 rounded-xl p-4"
            style={{
              background:
                "color-mix(in oklab, var(--theme-text, #0f172a) 4%, transparent)",
            }}
          >
            <input
              type="checkbox"
              id="active-status"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded"
              style={{
                accentColor: "var(--theme-success, #16a34a)",
                border: "2px solid var(--theme-border, #e5e7eb)",
              }}
            />
            <label
              htmlFor="active-status"
              className="text-sm font-medium cursor-pointer"
            >
              Active Department
            </label>
          </div>

          {/* Action Buttons */}
          <div
            className="flex justify-end gap-3 pt-6 border-t"
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
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.98)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              {department ? "Update Department" : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

