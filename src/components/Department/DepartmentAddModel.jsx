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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {department ? "Edit Department" : "Create New Department"}
            </h2>
            <p className="text-sm text-gray-500">
              {department ? "Update department information" : "Add a new department to your organization"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Department Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder="Enter department name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Description
            </label>
            <textarea
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
              placeholder="Enter department description"
              rows={3}
            />
          </div>

          {/* Permissions Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Default Permissions
            </label>
            <button
              type="button"
              onClick={() => setOpenPermModal(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 font-medium shadow-lg"
            >
              Select Permissions ({selectedPerms.length} selected)
            </button>
            
            {selectedPerms.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-2">Selected Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPerms.map((perm, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
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
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="active-status"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
            />
            <label htmlFor="active-status" className="text-sm font-medium text-gray-700 cursor-pointer">
              Active Department
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 focus:ring-4 focus:ring-green-200 transition-all duration-200 font-medium shadow-lg"
            >
              {department ? "Update Department" : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}