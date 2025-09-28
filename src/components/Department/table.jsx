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

  // THEME HELPERS
  const surface = { background: "var(--theme-card-bg, #ffffff)", color: "var(--theme-text, #0f172a)" };
  const borderColor = { borderColor: "var(--theme-border, #e5e7eb)" };
  const muted = { color: "var(--theme-text-muted, #6b7280)" };
  const primary = "var(--theme-primary, #4f46e5)";
  const primaryWeak = "var(--theme-primary-weak, rgba(79,70,229,0.08))";
  const success = "var(--theme-success, #16a34a)";
  const successWeak = "var(--theme-success-weak, rgba(22,163,74,0.12))";
  const danger = "var(--theme-danger, #dc2626)";
  const dangerWeak = "var(--theme-danger-weak, rgba(220,38,38,0.12))";
  const accent = "var(--theme-accent, #7c3aed)";

  const btnPrimaryStyle = {
    color: "#fff",
    background: `linear-gradient(90deg, ${primary}, color-mix(in oklab, ${primary} 85%, ${accent}))`,
  };
  const btnSuccessStyle = {
    color: "#fff",
    background: `linear-gradient(90deg, ${success}, color-mix(in oklab, ${success} 85%, ${successWeak}))`,
  };

  return (
    <div className="w-full mt-2">
      {/* Action Bar (Sticky) */}
     <div className="flex justify-end px-3 py-3">
          <div className="flex gap-3">
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
              style={btnPrimaryStyle}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.98)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
              onClick={() => setOpenAddDeptModal(true)}
            >
              <Building2 className="w-4 h-4" />
              Add Department
            </button>

            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
              style={btnSuccessStyle}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.98)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
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
            <div
              className="animate-spin rounded-full h-6 w-6 border-b-2"
              style={{ borderColor: primary }}
            ></div>
            <span className="font-medium" style={muted}>
              Loading departments...
            </span>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl shadow-lg border overflow-hidden"
          style={{ ...surface, ...borderColor }}
        >
          {departments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: "color-mix(in oklab, var(--theme-text, #0f172a) 30%, transparent)" }} />
              <p className="font-medium" style={muted}>No departments found</p>
              <p className="text-sm" style={muted}>Create your first department to get started</p>
            </div>
          ) : (
            departments.map((dept, index) => (
              <div
                key={dept.id}
                className={index < departments.length - 1 ? "border-b" : ""}
                style={borderColor}
              >
                {/* Accordion Header */}
                <div
                  className="flex justify-between items-center px-6 py-4 cursor-pointer transition-all duration-200 group"
                  style={surface}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "color-mix(in oklab, var(--theme-text, #0f172a) 3%, var(--theme-card-bg, #ffffff))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--theme-card-bg, #ffffff)";
                  }}
                  onClick={() => toggleDepartment(dept.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="p-2 rounded-lg transition-colors duration-200"
                      style={{
                        background: "color-mix(in oklab, var(--theme-primary, #4f46e5) 12%, transparent)",
                      }}
                    >
                      {expandedDept === dept.id ? (
                        <ChevronDown className="w-5 h-5" style={{ color: primary }} />
                      ) : (
                        <ChevronRight className="w-5 h-5" style={{ color: primary }} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold transition-colors duration-200">
                        {dept.name}
                      </h3>
                      {dept.description && (
                        <p className="text-sm mt-1" style={muted}>
                          {dept.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                      style={{
                        background: dept.is_active ? successWeak : dangerWeak,
                        color: dept.is_active ? success : danger,
                        borderColor: dept.is_active
                          ? `color-mix(in oklab, ${success} 35%, transparent)`
                          : `color-mix(in oklab, ${danger} 35%, transparent)`,
                      }}
                    >
                      {dept.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      className="p-2 rounded-full transition-colors duration-200 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDept(dept);
                      }}
                      aria-label={`Edit ${dept.name} Department`}
                      title="Edit Department"
                      onMouseEnter={(e) => (e.currentTarget.style.background = primaryWeak)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Edit className="w-4 h-4" style={{ color: primary }} />
                    </button>
                    <button
                      className="p-2 rounded-full transition-colors duration-200 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDepartment(dept.id);
                      }}
                      aria-label={`Delete ${dept.name} Department`}
                      title="Delete Department"
                      onMouseEnter={(e) => (e.currentTarget.style.background = dangerWeak)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Trash className="w-4 h-4" style={{ color: danger }} />
                    </button>
                  </div>
                </div>

                {/* Accordion Content */}
                {expandedDept === dept.id && (
                  <div
                    className="border-t"
                    style={{
                      ...borderColor,
                      background:
                        "linear-gradient(180deg, color-mix(in oklab, var(--theme-text, #0f172a) 4%, transparent), transparent)",
                    }}
                  >
                    {loadingProfiles[dept.id] ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center space-x-3">
                          <div
                            className="animate-spin rounded-full h-5 w-5 border-b-2"
                            style={{ borderColor: primary }}
                          ></div>
                          <span style={muted}>Loading profiles...</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Header with profile count */}
                        <div
                          className="flex items-center justify-between px-6 py-3 border-b"
                          style={{ ...borderColor, background: "color-mix(in oklab, var(--theme-text, #0f172a) 2%, var(--theme-card-bg, #ffffff))" }}
                        >
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" style={{ color: muted.color }} />
                            <span className="text-sm font-medium">
                              {(profiles[dept.id]?.length ?? 0)} Profile{profiles[dept.id]?.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>

                        {profiles[dept.id]?.length > 0 ? (
                          <div className="overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead>
                                  <tr
                                    style={{
                                      background: "color-mix(in oklab, var(--theme-text, #0f172a) 2%, var(--theme-card-bg, #ffffff))",
                                    }}
                                  >
                                    {[
                                      "Profile Name",
                                      "Description",
                                      "Status",
                                      "Level",
                                      "Permissions",
                                      "Actions",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={muted}
                                      >
                                        {h === "Status" || h === "Level" || h === "Actions" ? (
                                          <span className="block text-center">{h}</span>
                                        ) : (
                                          h
                                        )}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody
                                  className="divide-y"
                                  style={{ borderColor: "color-mix(in oklab, var(--theme-text, #0f172a) 12%, transparent)" }}
                                >
                                  {Array.isArray(profiles[dept.id]) &&
                                    profiles[dept.id].map((profile) => (
                                      <tr
                                        key={profile.id}
                                        className="transition-colors duration-200"
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background =
                                            "color-mix(in oklab, var(--theme-text, #0f172a) 2.5%, transparent)";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = "transparent";
                                        }}
                                      >
                                        {/* Name */}
                                        <td className="px-6 py-4">
                                          <div className="flex items-center space-x-3">
                                            <div
                                              className="w-2 h-2 rounded-full"
                                              style={{
                                                background: `linear-gradient(90deg, ${primary}, ${accent})`,
                                              }}
                                            />
                                            <span className="font-medium">{profile.name}</span>
                                          </div>
                                        </td>

                                        {/* Description */}
                                        <td className="px-6 py-4" style={muted}>
                                          {profile.description || (
                                            <span className="italic" style={muted}>
                                              No description
                                            </span>
                                          )}
                                        </td>

                                        {/* Active badge */}
                                        <td className="px-6 py-4">
                                          <div className="flex justify-center">
                                            <span
                                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border"
                                              style={{
                                                background: profile.is_active ? successWeak : dangerWeak,
                                                color: profile.is_active ? success : danger,
                                                borderColor: profile.is_active
                                                  ? `color-mix(in oklab, ${success} 35%, transparent)`
                                                  : `color-mix(in oklab, ${danger} 35%, transparent)`,
                                              }}
                                            >
                                              <span
                                                className="h-1.5 w-1.5 rounded-full"
                                                style={{ background: profile.is_active ? success : danger }}
                                              />
                                              {profile.is_active ? "Active" : "Inactive"}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Hierarchy pill */}
                                        <td className="px-6 py-4">
                                          <div className="flex justify-center">
                                            <span
                                              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold border"
                                              style={{
                                                background: "color-mix(in oklab, var(--theme-primary, #4f46e5) 12%, transparent)",
                                                color: primary,
                                                borderColor: `color-mix(in oklab, ${primary} 35%, transparent)`,
                                              }}
                                            >
                                              {profile.hierarchy_level ?? "—"}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Permissions as chips */}
                                        <td className="px-6 py-4">
                                          {Array.isArray(profile.default_permissions) &&
                                          profile.default_permissions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                              {profile.default_permissions.slice(0, 3).map((perm, i) => (
                                                <span
                                                  key={i}
                                                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                                                  style={{
                                                    background: primaryWeak,
                                                    color: primary,
                                                    borderColor: `color-mix(in oklab, ${primary} 35%, transparent)`,
                                                  }}
                                                  title={formatPerm(perm)}
                                                >
                                                  {formatPerm(perm)}
                                                </span>
                                              ))}
                                              {profile.default_permissions.length > 3 && (
                                                <span
                                                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                                                  style={{
                                                    background:
                                                      "color-mix(in oklab, var(--theme-text, #0f172a) 6%, transparent)",
                                                    color: "var(--theme-text-muted, #6b7280)",
                                                    borderColor: "var(--theme-border, #e5e7eb)",
                                                  }}
                                                >
                                                  +{profile.default_permissions.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="italic text-sm" style={muted}>
                                              No permissions
                                            </span>
                                          )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              className="inline-flex items-center justify-center rounded-lg p-2 shadow-sm transition-all duration-200"
                                              style={{
                                                background: primaryWeak,
                                                color: primary,
                                                boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
                                              }}
                                              onMouseEnter={(e) =>
                                                (e.currentTarget.style.background =
                                                  "color-mix(in oklab, var(--theme-primary, #4f46e5) 18%, transparent)")
                                              }
                                              onMouseLeave={(e) =>
                                                (e.currentTarget.style.background = primaryWeak)
                                              }
                                              onClick={() => setEditProfile(profile)}
                                              aria-label={`Edit ${profile.name} Profile`}
                                              title="Edit Profile"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </button>

                                            <button
                                              className="inline-flex items-center justify-center rounded-lg p-2 shadow-sm transition-all duration-200"
                                              style={{
                                                background: dangerWeak,
                                                color: danger,
                                                boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
                                              }}
                                              onMouseEnter={(e) =>
                                                (e.currentTarget.style.background =
                                                  "color-mix(in oklab, var(--theme-danger, #dc2626) 18%, transparent)")
                                              }
                                              onMouseLeave={(e) =>
                                                (e.currentTarget.style.background = dangerWeak)
                                              }
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
                            <Users
                              className="w-8 h-8 mx-auto mb-3"
                              style={{ color: "color-mix(in oklab, var(--theme-text, #0f172a) 30%, transparent)" }}
                            />
                            <p className="font-medium" style={muted}>No profiles found</p>
                            <p className="text-sm" style={muted}>Add profiles to this department</p>
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
