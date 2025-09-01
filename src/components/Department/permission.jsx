
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
    <div className="fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-30 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[500px] max-h-[600px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Permissions</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-800"
          >
            ✖
          </button>
        </div>

        {/* Permissions List */}
        <div className="overflow-y-auto max-h-[400px] border rounded-md p-3">
          {availablePermissions.length > 0 ? (
            <div className="space-y-2">
              {availablePermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
                >
                  <input
                    type="checkbox"
                    checked={localSelected.includes(permission)}
                    onChange={() => handleTogglePermission(permission)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{formatPermissionName(permission)}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No permissions available for this department.
              <br />
              <span className="text-xs">
                Please select a department first or check department configuration.
              </span>
            </div>
          )}
        </div>

        {/* Selected count */}
        {availablePermissions.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            {localSelected.length} of {availablePermissions.length} permissions selected
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}