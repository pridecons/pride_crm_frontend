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

  const selectedDepartment = departments.find(dept => dept.id === selectedDepartmentId);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center p-8 pb-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {isEdit ? "Edit Profile" : "Create New Profile"}
            </h2>
            <p className="text-sm text-gray-600">
              {isEdit ? "Update profile information and permissions" : "Define a new role with specific permissions"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/80 transition-colors duration-200"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Name */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Profile Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                required
              />
            </div>

            {/* Department Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white appearance-none"
                  value={selectedDepartmentId || ""}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {selectedDepartment && (
                <p className="text-xs text-indigo-600 mt-1">
                  Selected: {selectedDepartment.name}
                </p>
              )}
            </div>

            {/* Hierarchy Level */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Hierarchy Level
              </label>
              <input
                type="number"
                placeholder="1"
                value={hierarchyLevel}
                onChange={(e) => setHierarchyLevel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                min="1"
              />
              <p className="text-xs text-gray-500">Lower numbers indicate higher authority</p>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Default Permissions
              </label>
              <button
                type="button"
                onClick={() => setOpenPermModal(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-4 focus:ring-indigo-200 transition-all duration-200 font-medium shadow-lg"
                disabled={!selectedDepartmentId}
              >
                {!selectedDepartmentId ? "Select Department First" : `Select Permissions (${selectedPerms.length} selected)`}
              </button>

              {selectedPerms.length > 0 && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 mt-2">
                  <p className="text-sm font-medium text-indigo-800 mb-2">Selected Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPerms.map((perm, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
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
              <label className="block text-sm font-semibold text-gray-700">
                Description
              </label>
              <textarea
                placeholder="Describe the role responsibilities and scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="profile-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                />
                <div>
                  <label htmlFor="profile-active" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Active Profile
                  </label>
                  <p className="text-xs text-gray-500">Active profiles can be assigned to users</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="lg:col-span-2 flex justify-end gap-3 pt-6 border-t border-gray-200">
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