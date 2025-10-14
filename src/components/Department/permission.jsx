"use client";

import { useState, useEffect } from "react";

export default function PermissionsModal({ 
  isOpen, 
  onClose, 
  selectedPermissions = [], 
  onChange,
  availablePermissions = [] // Accept available permissions from parent
}) {
  const [localSelected, setLocalSelected] = useState([]);

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelected(selectedPermissions);
    }
  }, [isOpen, selectedPermissions]);

  if (!isOpen) return null;

  const handleTogglePermission = (permission) => {
    setLocalSelected(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleSave = () => {
    onChange(localSelected);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelected(selectedPermissions); // Reset to original
    onClose();
  };

  // Format permission name for display
  const formatPermissionName = (permission) => {
    return permission
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center mt-5 bg-[var(--theme-overlay)] backdrop-blur-3xl bg-opacity-30 z-50">
      <div className="bg-[var(--theme-background)] rounded-lg shadow-lg p-4 w-[700px] max-h-[600px] border border-[var(--theme-border)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[var(--theme-text)]">Permissions</h2>
          <button
            onClick={handleCancel}
            className="rounded-md p-1 text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
          >
            ✖
          </button>
        </div>

        {/* Permissions List */}
        <div className="overflow-y-auto max-h-[400px] border border-[var(--theme-border)] rounded-md p-3 bg-[var(--theme-surface)]">
          {availablePermissions.length > 0 ? (
            <div className="space-y-2">
              {availablePermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 p-2 cursor-pointer rounded hover:bg-[var(--theme-surface-hover)]"
                >
                  <input
                    type="checkbox"
                    checked={localSelected.includes(permission)}
                    onChange={() => handleTogglePermission(permission)}
                    className="w-4 h-4"
                    style={{ accentColor: "var(--theme-primary)" }}
                  />
                  <span className="text-sm text-[var(--theme-text)]">
                    {formatPermissionName(permission)}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-[var(--theme-text-muted)]">
                No permissions available for this department.
              </p>
              <span className="text-xs text-[var(--theme-text-muted)]">
                Please select a department first or check department configuration.
              </span>
            </div>
          )}
        </div>

        {/* Selected count */}
        {availablePermissions.length > 0 && (
          <div className="mt-3 text-sm text-[var(--theme-text-muted)]">
            {localSelected.length} of {availablePermissions.length} permissions selected
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-md border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] hover:bg-[var(--theme-primary-hover)]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}