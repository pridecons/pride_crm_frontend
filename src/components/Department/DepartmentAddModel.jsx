"use client";

import { axiosInstance } from "@/api/Axios";
import { useState, useEffect } from "react";
import PermissionsModal from "./permission"; // ✅ make sure path is correct

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
      }finally{
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
        // EDIT
        res = await axiosInstance.patch(`/departments/${department.id}`, payload);
      } else {
        // ADD
        res = await axiosInstance.post("/departments/", payload);
      }

      onSave(res.data);
      onClose();
    } catch (error) {
      console.error("Error saving department:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {department ? "Edit Department" : "Add Department"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            ✖
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label>Department Name</label>
          <input
            type="text"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            className="w-full border rounded-md p-2"
            required
          />

          <label>Description</label>
          <textarea
            value={newDeptDesc}
            onChange={(e) => setNewDeptDesc(e.target.value)}
            className="w-full border rounded-md p-2"
          />

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Permissions
            </label>
            <button
              type="button"
              onClick={() => setOpenPermModal(true)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Select Permissions
            </button>
            {selectedPerms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedPerms.map((perm, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ✅ Permissions Modal */}
          <PermissionsModal
            isOpen={openPermModal}
            onClose={() => setOpenPermModal(false)}
            selectedPermissions={selectedPerms}
            onChange={handlePermChange}
            availablePermissions={availablePermissions}
          />

          {/* Active */}
          <label className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
