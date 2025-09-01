"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { Edit, Trash } from "lucide-react";
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

  // const handleAddDepartment = (newDept) => {
  //   setDepartments((prev) => [...prev, newDept]);
  //   setOpenAddDeptModal(false);
  // };

  // const handleAddProfile = (newProfile) => {
  //   setProfiles((prev) => ({
  //     ...prev,
  //     [newProfile.department_id]: [...(prev[newProfile.department_id] || []), newProfile],
  //   }));
  //   setOpenAddProfileModal(false);
  // };


  // Inside DepartmentAccordion component

  const deleteDepartment = async (deptId) => {
    // Confirm deletion
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      // Call API to delete
      const res = await axiosInstance.delete(`/departments/${deptId}?hard_delete=true`);
      console.log(res.data.message); // optional log

      // Remove department from state
      setDepartments((prev) => prev.filter((d) => d.id !== deptId));

      // Close accordion if deleted department was expanded
      if (expandedDept === deptId) setExpandedDept(null);

      alert("Department deleted successfully");
    } catch (err) {
      console.error("Failed to delete department:", err);
      alert("Failed to delete department");
    }
  };


  // Delete profile
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
//  return ke upar ye paste kar dena 

// Pretty-print permission keys like FOO_BAR → Foo Bar
const formatPerm = (s = "") =>
  s
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="w-full max-w-6xl mx-auto mt-6">
      {/* Action Buttons */}
      <div className="flex justify-end">
        <div className="flex gap-4 mb-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={() => setOpenAddDeptModal(true)}
          >
            Add Department
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            onClick={() => {
              setSelectedDept(departments[0] || null);
              setOpenAddProfileModal(true);
            }}
          >
            Add Profile
          </button>
        </div>
      </div>

      {/* Department List */}
      {loadingDept ? (
        <p className="text-center py-6 text-gray-500">Loading departments...</p>
      ) : (
        <div className="border rounded-xl divide-y bg-white shadow-sm">
          {departments.map((dept) => (
            <div key={dept.id}>
              {/* Accordion Header */}
              <div
                className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => toggleDepartment(dept.id)}
              >
                <div className="flex-1 font-medium text-gray-800">{dept.name}</div>
                <div className="flex gap-2">
                  <button
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDept(dept);
                    }}
                    aria-label={`Edit ${dept.name} Department`}
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    className="p-2 rounded-full hover:bg-red-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDepartment(dept.id);
                    }}
                    aria-label={`Delete ${dept.name} Department`}
                  >
                    <Trash className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Accordion Content */}
              {expandedDept === dept.id && (
                <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm">
  {/* subtle top bar */}
  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
    <p className="text-xs font-medium text-gray-600">
      {profiles[dept.id]?.length ?? 0} Profile
      {profiles[dept.id]?.length === 1 ? "" : "s"}
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="min-w-[980px] w-full text-sm align-middle">
      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
        <tr className="text-[11px] uppercase tracking-wide text-gray-600">
          <th className="px-4 py-3 text-left font-semibold">Profile Name</th>
          <th className="px-4 py-3 text-left font-semibold">Description</th>
          <th className="px-4 py-3 text-center font-semibold">Active</th>
          <th className="px-4 py-3 text-center font-semibold">Hierarchy</th>
          <th className="px-4 py-3 text-left font-semibold">Permissions</th>
          <th className="px-4 py-3 text-center font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-100">
   {Array.isArray(profiles[dept.id]) &&
  profiles[dept.id].map((profile) => (
          <tr
            key={profile.id}
            className="odd:bg-white even:bg-gray-50 hover:bg-blue-50/60 transition-colors"
          >
            {/* Name */}
            <td className="px-4 py-3 font-medium text-gray-900">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-gray-300" />
                {profile.name}
              </div>
            </td>

            {/* Description */}
            <td className="px-4 py-3 text-gray-700">
              {profile.description || (
                <span className="italic text-gray-400">—</span>
              )}
            </td>

            {/* Active badge */}
            <td className="px-4 py-3 text-center">
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                  profile.is_active
                    ? "bg-green-50 text-green-700 ring-green-200"
                    : "bg-red-50 text-red-700 ring-red-200",
                ].join(" ")}
                title={profile.is_active ? "Profile is active" : "Profile is inactive"}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    profile.is_active ? "bg-green-500" : "bg-red-500",
                  ].join(" ")}
                />
                {profile.is_active ? "Active" : "Inactive"}
              </span>
            </td>

            {/* Hierarchy pill */}
            <td className="px-4 py-3 text-center">
              <span className="inline-flex items-center justify-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
                {profile.hierarchy_level ?? "—"}
              </span>
            </td>

            {/* Permissions as chips (scrolls if many) */}
            <td className="px-4 py-3">
              {Array.isArray(profile.default_permissions) &&
              profile.default_permissions.length > 0 ? (
                <div className="flex max-h-16 flex-wrap items-center gap-1 overflow-y-auto pr-1">
                  {profile.default_permissions.map((perm, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                      title={formatPerm(perm)}
                    >
                      {formatPerm(perm)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="italic text-gray-400">No default permissions</span>
              )}
            </td>

            {/* Actions */}
            <td className="px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 p-2 text-blue-600 shadow-sm transition hover:bg-blue-100 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  onClick={() => setEditProfile(profile)}
                  aria-label={`Edit ${profile.name} Profile`}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>

                <button
                  className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 p-2 text-red-600 shadow-sm transition hover:bg-red-100 hover:shadow focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  onClick={() => handleDeleteProfile(profile.id, dept.id)}
                  aria-label={`Delete ${profile.name} Profile`}
                  title="Delete"
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

  {/* subtle bottom radius on scroll container */}
  <div className="pointer-events-none h-2 rounded-b-2xl bg-white" />
</div>
              )}
            </div>
          ))}
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













// export default function DepartmentAccordion() {
//     const [departments, setDepartments] = useState([]);
//     const [expandedDept, setExpandedDept] = useState(null);
//     const [profiles, setProfiles] = useState({});
//     const [loadingDept, setLoadingDept] = useState(true);
//     const [loadingProfiles, setLoadingProfiles] = useState({});
//     const [editDept, setEditDept] = useState(null);
//     const [editProfile, setEditProfile] = useState(null);

//     const [form, setForm] = useState({ name: "", description: "" });

//     // Fetch departments
//     useEffect(() => {
//         const fetchDepartments = async () => {
//             try {
//                 const res = await axiosInstance.get(
//                     "/departments/?skip=0&limit=50&order_by=name"
//                 );
//                 setDepartments(res.data || []);
//             } catch (err) {
//                 console.error("Error fetching departments:", err);
//             } finally {
//                 setLoadingDept(true);
//             }
//         };
//         fetchDepartments();
//     }, []);

//     // Toggle accordion
//     const toggleDepartment = async (deptId) => {
//         if (expandedDept === deptId) {
//             setExpandedDept(null);
//             return;
//         }
//         setExpandedDept(deptId);

//         if (!profiles[deptId]) {
//             setLoadingProfiles((prev) => ({ ...prev, [deptId]: true }));
//             try {
//                 const res = await axiosInstance.get(
//                     `/profile-role/?department_id=${deptId}&skip=0&limit=50&order_by=hierarchy_level`
//                 );
//                 setProfiles((prev) => ({ ...prev, [deptId]: res.data || [] }));
//             } catch (err) {
//                 console.error("Error fetching profiles:", err);
//             } finally {
//                 setLoadingProfiles((prev) => ({ ...prev, [deptId]: true }));
//             }
//         }
//     };

//     // ---- Department Delete ----
//     const handleDeleteDept = async (deptId) => {
//         if (!confirm("Delete this department?")) return;
//         try {
//             await axiosInstance.delete(`/departments/${deptId}?hard_delete=true`);
//             setDepartments((prev) => prev.filter((d) => d.id !== deptId));
//         } catch (err) {
//             console.error("Error deleting department:", err);
//         }
//     };

//     // ---- Department Edit ----
//     const handleEditDept = (dept) => {
//         setEditDept(dept);
//         setForm({ name: dept.name, description: dept.description });
//     };
//     const saveEditDept = async () => {
//         try {
//             const res = await axiosInstance.patch(`/departments/${editDept.id}`, {
//                 ...editDept,
//                 name: form.name,
//                 description: form.description,
//             });
//             setDepartments((prev) =>
//                 prev.map((d) => (d.id === editDept.id ? res.data : d))
//             );
//             setEditDept(null);
//         } catch (err) {
//             console.error("Error updating department:", err);
//         }
//     };

//     // ---- Profile Delete ----
//     const handleDeleteProfile = async (profileId, deptId) => {
//         if (!confirm("Delete this profile?")) return;
//         try {
//             await axiosInstance.delete(
//                 `/profile-role/${profileId}?hard_delete=true`
//             );
//             setProfiles((prev) => ({
//                 ...prev,
//                 [deptId]: prev[deptId].filter((p) => p.id !== profileId),
//             }));
//         } catch (err) {
//             console.error("Error deleting profile:", err);
//         }
//     };

//     // ---- Profile Edit ----
//     const handleEditProfile = (profile, deptId) => {
//         setEditProfile({ ...profile, deptId });
//         setForm({
//             name: profile.name,
//             default_permissions: profile.default_permissions,
//             description: profile.description,
//         });
//     };
//     const saveEditProfile = async () => {
//         try {
//             const res = await axiosInstance.patch(`/profile-role/${editProfile.id}`, {
//                 ...editProfile,
//                 name: form.name,
//                 default_permissions: profile.default_permissions,
//                 description: form.description,
//             });
//             setProfiles((prev) => ({
//                 ...prev,
//                 [editProfile.deptId]: prev[editProfile.deptId].map((p) =>
//                     p.id === editProfile.id ? res.data : p
//                 ),
//             }));
//             setEditProfile(null);
//         } catch (err) {
//             console.error("Error updating profile:", err);
//         }
//     };

//     return (
//         <div className="w-full max-w-5xl mx-auto mt-6">
//             <h2 className="text-xl font-bold mb-4">Departments</h2>

//             {loadingDept ? (
//                 <p className="text-gray-500 text-center py-6">Loading departments...</p>
//             ) : (
//                 <div className="border rounded-xl divide-y bg-white shadow-sm">
//                     {departments.map((dept) => (
//                         <div key={dept.id}>
//                             {/* Accordion Header */}
//                             <div className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors">
//                                 <button
//                                     className="flex-1 text-left font-medium text-gray-800"
//                                     onClick={() => toggleDepartment(dept.id)}
//                                 >
//                                     {dept.name}
//                                 </button>
//                                 <div className="flex gap-2">
//                                     <button
//                                         onClick={() => handleEditDept(dept)}
//                                         className="p-2 rounded-full hover:bg-blue-50 transition"
//                                     >
//                                         <Edit className="w-4 h-4 text-blue-600" />
//                                     </button>
//                                     <button
//                                         onClick={() => handleDeleteDept(dept.id)}
//                                         className="p-2 rounded-full hover:bg-red-50 transition"
//                                     >
//                                         <Trash className="w-4 h-4 text-red-600" />
//                                     </button>
//                                 </div>
//                             </div>

//                             {/* Accordion Content */}
//                             {expandedDept === dept.id && (
//                                 <div className="p-4 border-amber-50 rounded-t-2xl bg-gradient-to-r from-blue-50 via-white to-blue-100">

//                                     {loadingProfiles[dept.id] ? (
//                                         <p className="text-gray-500 text-center py-6">Loading profiles...</p>
//                                     ) : profiles[dept.id]?.length > 0 ? (
//                                         <div className="overflow-x-auto">
//                                             <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
//                                                 <thead className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wide">
//                                                     <tr>
//                                                         <th className="px-4 py-3 border-b text-left">Profile Name</th>
//                                                         <th className="px-4 py-3 border-b text-left">Description</th>
//                                                         <th className="px-4 py-3 border-b text-center">Active</th>
//                                                         <th className="px-4 py-3 border-b text-center">Hierarchy</th>
//                                                         <th className="px-4 py-3 border-b text-left">Permissions</th>
//                                                         <th className="px-4 py-3 border-b text-center">Actions</th>
//                                                     </tr>
//                                                 </thead>
//                                                 <tbody className="text-gray-700 text-sm">
//                                                     {profiles[dept.id].map((profile) => (
//                                                         <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
//                                                             <td className="px-4 py-3 border-b">{profile.name}</td>
//                                                             <td className="px-4 py-3 border-b">{profile.description || "-"}</td>
//                                                             <td className="px-4 py-3 border-b text-center">
//                                                                 <span
//                                                                     className={`px-2 py-1 text-xs font-medium rounded-full ${profile.is_active
//                                                                         ? "bg-green-100 text-green-700"
//                                                                         : "bg-red-100 text-red-700"
//                                                                         }`}
//                                                                 >
//                                                                     {profile.is_active ? "Active" : "Inactive"}
//                                                                 </span>
//                                                             </td>
//                                                             <td className="px-4 py-3 border-b text-center">
//                                                                 {profile.hierarchy_level}
//                                                             </td>
//                                                             <td className="px-4 py-3 border-b">
//                                                                 {Array.isArray(profile.default_permissions)
//                                                                     ? profile.default_permissions.map((perm, i) => (
//                                                                         <span
//                                                                             key={i}
//                                                                             className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full mr-1 mb-1"
//                                                                         >
//                                                                             {perm}
//                                                                         </span>
//                                                                     ))
//                                                                     : profile.default_permissions || "-"}
//                                                             </td>
//                                                             <td className="px-4 py-3 border-b text-center">
//                                                                 <div className="flex justify-center gap-2">
//                                                                     <button
//                                                                         onClick={() => handleEditProfile(profile, dept.id)}
//                                                                         className="p-2 rounded-full hover:bg-blue-50 transition"
//                                                                     >
//                                                                         <Edit className="w-4 h-4 text-blue-600" />
//                                                                     </button>
//                                                                     <button
//                                                                         onClick={() => handleDeleteProfile(profile.id, dept.id)}
//                                                                         className="p-2 rounded-full hover:bg-red-50 transition"
//                                                                     >
//                                                                         <Trash className="w-4 h-4 text-red-600" />
//                                                                     </button>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     ))}
//                                                 </tbody>
//                                             </table>
//                                         </div>
//                                     ) : (
//                                         <p className="text-gray-500 text-center py-6 italic">No profiles found</p>
//                                     )}
//                                 </div>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//             )}

//             <AddDepartmentModal
//                 isOpen={!!editDept}
//                 onClose={() => setEditDept(null)}
//                 department={editDept}
//                 onSave={(updatedDept) => {
//                     setDepartments((prev) =>
//                         editDept
//                             ? prev.map((d) => (d.id === updatedDept.id ? updatedDept : d)) // update
//                             : [...prev, updatedDept] // add
//                     );
//                     setEditDept(null);
//                 }}
//             />


//             <ProfileModal
//                 isOpen={!!editProfile}
//                 onClose={() => setEditProfile(null)}
//                 onSave={(updatedProfile) =>
//                     setProfiles((prev) => ({
//                         ...prev,
//                         [updatedProfile.department_id]: (prev[updatedProfile.department_id] || []).map((p) =>
//                             p.id === updatedProfile.id ? updatedProfile : p
//                         ),
//                     }))
//                 }
//                 departmentId={editProfile?.department_id}
//                 departments={departments}
//                 profile={editProfile}
//             />



//         </div>

//     );
// }
