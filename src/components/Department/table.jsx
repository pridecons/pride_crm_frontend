"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { Edit, Trash, ChevronDown, ChevronRight, Building2, Users } from "lucide-react";
import AddDepartmentModal from "@/components/Department/DepartmentAddModel";
import ProfileModal from "@/components/Department/ProfileAddModel";

export default function DepartmentAccordion() {
  const [departments, setDepartments] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loadingDept, setLoadingDept] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState({});
  const [expandedDept, setExpandedDept] = useState(null);
  const [editDept, setEditDept] = useState(null);
  const [editProfile, setEditProfile] = useState(null);
  const [openAddDeptModal, setOpenAddDeptModal] = useState(false);
  const [openAddProfileModal, setOpenAddProfileModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoadingDept(true);
      const res = await axiosInstance.get("/departments/?skip=0&limit=50&order_by=name");
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDept(false);
    }
  };

  const fetchProfiles = async (departmentId) => {
    try {
      setLoadingProfiles((prev) => ({ ...prev, [departmentId]: true }));
      const res = await axiosInstance.get(
        `/profile-role/?department_id=${departmentId}&skip=0&limit=50&order_by=hierarchy_level`
      );
      setProfiles((prev) => ({ ...prev, [departmentId]: res.data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfiles((prev) => ({ ...prev, [departmentId]: false }));
    }
  };

  const toggleDepartment = (deptId) => {
    if (expandedDept === deptId) {
      setExpandedDept(null);
    } else {
      setExpandedDept(deptId);
      if (!profiles[deptId]) {
        fetchProfiles(deptId);
      }
    }
  };

  const deleteDepartment = async (deptId) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const res = await axiosInstance.delete(`/departments/${deptId}?hard_delete=true`);
      console.log(res.data.message);
      setDepartments((prev) => prev.filter((d) => d.id !== deptId));
      if (expandedDept === deptId) setExpandedDept(null);
      alert("Department deleted successfully");
    } catch (err) {
      console.error("Failed to delete department:", err);
      alert("Failed to delete department");
    }
  };

  const handleDeleteProfile = async (profileId, departmentId) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;
    try {
      await axiosInstance.delete(`/profile-role/${profileId}?hard_delete=true`);
      setProfiles((prev) => ({
        ...prev,
        [departmentId]: (prev[departmentId] || []).filter((p) => p.id !== profileId),
      }));
    } catch (err) {
      console.error("Failed to delete profile:", err);
      alert("Failed to delete profile");
    }
  };

  const formatPerm = (s = "") =>
    s
      .toString()
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="w-full  mt-6">
      {/* Action Buttons */}
      <div className="flex justify-end mb-6 pr-3">
        <div className="flex gap-3">
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 font-medium shadow-lg"
            onClick={() => setOpenAddDeptModal(true)}
          >
            <Building2 className="w-4 h-4" />
            Add Department
          </button>
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 focus:ring-4 focus:ring-green-200 transition-all duration-200 font-medium shadow-lg"
            onClick={() => {
              setSelectedDept(departments[0] || null);
              setOpenAddProfileModal(true);
            }}
          >
            <Users className="w-4 h-4" />
            Add Profile
          </button>
        </div>
      </div>

      {/* Department List */}
      {loadingDept ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 font-medium">Loading departments...</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {departments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No departments found</p>
              <p className="text-gray-400 text-sm">Create your first department to get started</p>
            </div>
          ) : (
            departments.map((dept, index) => (
              <div key={dept.id} className={index < departments.length - 1 ? "border-b border-gray-200" : ""}>
                {/* Accordion Header */}
                <div
                  className="flex justify-between items-center px-6 py-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 cursor-pointer transition-all duration-200 group"
                  onClick={() => toggleDepartment(dept.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors duration-200">
                      {expandedDept === dept.id ? (
                        <ChevronDown className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                        {dept.name}
                      </h3>
                      {dept.description && (
                        <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      dept.is_active 
                        ? "bg-green-100 text-green-700 border border-green-200" 
                        : "bg-red-100 text-red-700 border border-red-200"
                    }`}>
                      {dept.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      className="p-2 rounded-full hover:bg-blue-100 transition-colors duration-200 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDept(dept);
                      }}
                      aria-label={`Edit ${dept.name} Department`}
                    >
                      <Edit className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                    </button>
                    <button
                      className="p-2 rounded-full hover:bg-red-100 transition-colors duration-200 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDepartment(dept.id);
                      }}
                      aria-label={`Delete ${dept.name} Department`}
                    >
                      <Trash className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                    </button>
                  </div>
                </div>

                {/* Accordion Content */}
                {expandedDept === dept.id && (
                  <div className="border-t border-gray-100 bg-gradient-to-br from-gray-50 to-blue-50/30">
                    {loadingProfiles[dept.id] ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <span className="text-gray-600">Loading profiles...</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Header with profile count */}
                        <div className="flex items-center justify-between px-6 py-3 bg-white/50 border-b border-gray-200">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              {profiles[dept.id]?.length ?? 0} Profile{profiles[dept.id]?.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>

                        {profiles[dept.id]?.length > 0 ? (
                          <div className="overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="bg-white/70">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Profile Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Description
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Status
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Level
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Permissions
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white/30 divide-y divide-gray-200">
                                  {Array.isArray(profiles[dept.id]) &&
                                    profiles[dept.id].map((profile, profileIndex) => (
                                      <tr
                                        key={profile.id}
                                        className="hover:bg-white/60 transition-colors duration-200"
                                      >
                                        {/* Name */}
                                        <td className="px-6 py-4">
                                          <div className="flex items-center space-x-3">
                                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                            <span className="font-medium text-gray-900">{profile.name}</span>
                                          </div>
                                        </td>

                                        {/* Description */}
                                        <td className="px-6 py-4 text-gray-600">
                                          {profile.description || (
                                            <span className="italic text-gray-400">No description</span>
                                          )}
                                        </td>

                                        {/* Active badge */}
                                        <td className="px-6 py-4 text-center">
                                          <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                              profile.is_active
                                                ? "bg-green-100 text-green-700 border border-green-200"
                                                : "bg-red-100 text-red-700 border border-red-200"
                                            }`}
                                          >
                                            <span
                                              className={`h-1.5 w-1.5 rounded-full ${
                                                profile.is_active ? "bg-green-500" : "bg-red-500"
                                              }`}
                                            />
                                            {profile.is_active ? "Active" : "Inactive"}
                                          </span>
                                        </td>

                                        {/* Hierarchy pill */}
                                        <td className="px-6 py-4 text-center">
                                          <span className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-100 to-purple-100 px-3 py-1.5 text-sm font-semibold text-indigo-700 border border-indigo-200">
                                            {profile.hierarchy_level ?? "—"}
                                          </span>
                                        </td>

                                        {/* Permissions as chips */}
                                        <td className="px-6 py-4">
                                          {Array.isArray(profile.default_permissions) &&
                                          profile.default_permissions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                              {profile.default_permissions.slice(0, 3).map((perm, i) => (
                                                <span
                                                  key={i}
                                                  className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200"
                                                  title={formatPerm(perm)}
                                                >
                                                  {formatPerm(perm)}
                                                </span>
                                              ))}
                                              {profile.default_permissions.length > 3 && (
                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                                                  +{profile.default_permissions.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="italic text-gray-400 text-sm">No permissions</span>
                                          )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              className="inline-flex items-center justify-center rounded-lg bg-blue-100 p-2 text-blue-600 shadow-sm transition-all duration-200 hover:bg-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                              onClick={() => setEditProfile(profile)}
                                              aria-label={`Edit ${profile.name} Profile`}
                                              title="Edit Profile"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </button>

                                            <button
                                              className="inline-flex items-center justify-center rounded-lg bg-red-100 p-2 text-red-600 shadow-sm transition-all duration-200 hover:bg-red-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                              onClick={() => handleDeleteProfile(profile.id, dept.id)}
                                              aria-label={`Delete ${profile.name} Profile`}
                                              title="Delete Profile"
                                            >
                                              <Trash className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Users className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No profiles found</p>
                            <p className="text-gray-400 text-sm">Add profiles to this department</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <AddDepartmentModal
        isOpen={openAddDeptModal || !!editDept}
        onClose={() => {
          setOpenAddDeptModal(false);
          setEditDept(null);
        }}
        department={editDept}
        onSave={(dept) => {
          setDepartments((prev) =>
            editDept ? prev.map((d) => (d.id === dept.id ? dept : d)) : [...prev, dept]
          );
          setEditDept(null);
          setOpenAddDeptModal(false);
        }}
      />

      <ProfileModal
        isOpen={openAddProfileModal || !!editProfile}
        onClose={() => {
          setOpenAddProfileModal(false);
          setEditProfile(null);
        }}
        profile={editProfile}
        departmentId={selectedDept?.id || editProfile?.department_id}
        departments={departments}
        onSave={(profile) => {
          setProfiles((prev) => ({
            ...prev,
            [profile.department_id]: [
              ...(prev[profile.department_id] || []).filter((p) => p.id !== profile.id),
              profile,
            ],
          }));
          setEditProfile(null);
          setOpenAddProfileModal(false);
        }}
      />
    </div>
  );
}