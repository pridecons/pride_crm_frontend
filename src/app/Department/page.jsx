"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import AddDepartmentModal from "@/components/Department/DepartmentAddModel";
import AddProfileModal from "@/components/Department/ProfileAddModel";
import DepartmentAccordion from "@/components/Department/table";

export default function Department() {
  const [departments, setDepartments] = useState([]);
  const [openAddDeptModal, setOpenAddDeptModal] = useState(false);
  const [openAddProfileModal, setOpenAddProfileModal] = useState(false);

  const handleAddDepartment = (newDept) => {
    setDepartments((prev) => [...prev, newDept]);
    setOpenAddDeptModal(false);
  };

  const handleAddProfile = () => {
    // Profile adding logic goes here
  };

  const selectedDept = departments[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="w-full max-w-7xl mx-auto">
        
          <AddDepartmentModal
            isOpen={openAddDeptModal}
            onClose={() => setOpenAddDeptModal(false)}
            onAdd={handleAddDepartment}
          />

          <AddProfileModal
            isOpen={openAddProfileModal}
            onClose={() => setOpenAddProfileModal(false)}
            onAdd={handleAddProfile}
            departmentId={selectedDept?.id}
            departments={departments}
            setDepartments={setDepartments}
          />
        </div>
        
        <div className="mt-6">
          <DepartmentAccordion />
        </div>
      </div>
   
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import { axiosInstance } from "@/api/Axios";
// import AddDepartmentModal from "@/components/Department/DepartmentAddModel";
// import AddProfileModal from "@/components/Department/ProfileAddModel";
// import DepartmentAccordion from "@/components/Department/table";
// // import DepartmentsList from "@/components/Department/departmentTabs";

// export default function Department() {
//     const [departments, setDepartments] = useState([]);
//     const [profiles, setProfiles] = useState([]);
//     const [loadingDepartments, setLoadingDepartments] = useState(false);
//     const [loadingProfiles, setLoadingProfiles] = useState(false);
//     const [openDeptModal, setOpenDeptModal] = useState(false);
//     const [openProfileModal, setOpenProfileModal] = useState(false);
//     const [openAddDeptModal, setOpenAddDeptModal] = useState(false);
//     const [openAddProfileModal, setOpenAddProfileModal] = useState(false);


//     const handleAddDepartment = (newDept) => {
//         setDepartments((prev) => [...prev, newDept]);
//         setOpenAddDeptModal(false);
//     };

//     const handleAddProfile = (newProfile) => {
//         if (!selectedDept) return; // safety check
//         const profileWithDept = { ...newProfile, department_id: selectedDept.id };
//         setProfiles((prev) => [...prev, profileWithDept]);
//         setOpenAddProfileModal(false);

//     };

//     const fetchDepartments = async () => {
//         setLoadingDepartments(true);
//         try {
//             const res = await axiosInstance.get("/departments/?skip=0&limit=50&order_by=name");
//             setDepartments(res.data);
//             if (res.data.length > 0) setSelectedDept(res.data[0]);
//         } catch (error) {
//             console.error("Error fetching departments:", error);
//         } finally {
//             setLoadingDepartments(true);
//         }
//     };

//     const fetchProfiles = async () => {
//         setLoadingProfiles(true);
//         try {
//             const res = await axiosInstance.get("/profile-role/?skip=0&limit=50&order_by=hierarchy_level");
//             setProfiles(res.data);
//         } catch (error) {
//             console.error("Error fetching profiles:", error);
//         } finally {
//             setLoadingProfiles(true);
//         }
//     };

//     // Get profiles filtered by selected department
//     const getFilteredProfiles = () => {
//         if (!selectedDept) return [];
//         return profiles.filter(p => p.department_id === selectedDept.id);
//     };

//     useEffect(() => {
//         fetchDepartments();
//         fetchProfiles();
//     }, []);

//     return (
//         <div className="p-4">
//             <h1 className="text-2xl font-bold text-gray-800 mb-4">Departments</h1>
//             <div className="flex flex-wrap gap-2">
//                 {departments.map((dept) => (
//                     <button
//                         key={dept.id}
//                         onClick={() => setSelectedDept(dept)}
//                         className={`px-4 py-2 transition-all rounded-lg border-2 ${selectedDept?.id === dept.id
//                             ? "border-blue-500 bg-blue-100 text-blue-600 font-semibold shadow-sm"
//                             : "border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-500 bg-white"
//                             }`}
//                     >
//                         {dept.name}
//                     </button>
//                 ))}
//             </div>
//             <div className="flex items-center gap-2">
//                 {/* Department Modal */}
//                 <div className="py-4">
//                     <button
//                         onClick={() => setOpenDeptModal(true)}
//                         className="px-4 py-2 transition-all rounded-lg border-2 border-gray-200 bg-white font-semibold shadow-sm hover:border-blue-300 hover:text-blue-500"
//                     >
//                         Department
//                     </button>

//                     {openDeptModal && (
//                         <div className="fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-30">
//                             <div className="bg-white rounded-lg shadow-lg p-6 w-96">
//                                 <div className="flex justify-between items-center mb-4">
//                                     <h2 className="text-xl font-semibold">Departments</h2>
//                                     <button
//                                         onClick={() => setOpenDeptModal(false)}
//                                         className="text-gray-500 hover:text-gray-800"
//                                     >
//                                         ✖
//                                     </button>
//                                 </div>

//                                 {loadingDepartments ? (
//                                     <p>Loading...</p>
//                                 ) : departments.length > 0 ? (
//                                     <div className="space-y-1">
//                                         {departments.map((dept) => (
//                                             <div key={dept.id} className="text-gray-800">
//                                                 {dept.name}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 ) : (
//                                     <p>No departments yet</p>
//                                 )}


//                                 <div className="mt-4">
//                                     <button
//                                         onClick={() => setOpenAddDeptModal(true)}
//                                         className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
//                                     >
//                                         + Add Department
//                                     </button>
//                                 </div>

//                                 <AddDepartmentModal
//                                     isOpen={openAddDeptModal}
//                                     onClose={() => setOpenAddDeptModal(false)}
//                                     onAdd={handleAddDepartment}
//                                 />
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 {/* Profile Modal */}
//                 <button
//                     onClick={() => setOpenProfileModal(true)}
//                     className="px-4 py-2 transition-all rounded-lg border-2 border-gray-200 bg-white  font-semibold shadow-sm hover:border-blue-300 hover:text-blue-500"
//                 >
//                     Profile
//                 </button>

//                 {openProfileModal && (
//                     <div className="fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-30">
//                         <div className="bg-white rounded-lg shadow-lg p-6 w-96">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-xl font-semibold">
//                                     Profile {selectedDept ? `- ${selectedDept.name}` : ''}
//                                 </h2>
//                                 <button
//                                     onClick={() => setOpenProfileModal(false)}
//                                     className="text-gray-500 hover:text-gray-800"
//                                 >
//                                     ✖
//                                 </button>
//                             </div>

//                             {loadingProfiles ? (
//                                 <p>Loading...</p>
//                             ) : selectedDept ? (
//                                 getFilteredProfiles().length > 0 ? (
//                                     <>
//                                         <ul className="list-disc pl-6 space-y-1">
//                                             {getFilteredProfiles().map((role) => (
//                                                 <li key={role.id}>{role.name}</li>
//                                             ))}
//                                         </ul>
//                                         <div className="mt-4">
//                                             <button
//                                                 onClick={() => setOpenAddProfileModal(true)}
//                                                 className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
//                                             >
//                                                 ➕ Add Profile
//                                             </button>
//                                         </div>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <p>No profiles yet for {selectedDept.name}</p>
//                                         <div className="mt-4">
//                                             <button
//                                                 onClick={() => setOpenAddProfileModal(true)}
//                                                 className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
//                                             >
//                                                 ➕ Add Profile
//                                             </button>
//                                         </div>
//                                     </>
//                                 )
//                             ) : (
//                                 <p>Please select a department first</p>
//                             )}

//                             <AddProfileModal
//                                 isOpen={openAddProfileModal}
//                                 onClose={() => setOpenAddProfileModal(false)}
//                                 onAdd={handleAddProfile}
//                                 departmentId={selectedDept?.id}
//                                 departments={departments}
//                                 setDepartments={setDepartments}
//                             />
//                         </div>
//                     </div>
//                 )}
//             </div>
        
//         <div>
//            <DepartmentAccordion/> 
//         </div>
//         </div>
        
//     );
// }



    // <div className="border rounded-xl p-4 bg-white shadow-sm">
    //             {loadingProfiles || loadingDepartments ? (
    //                 <p className="text-gray-500 text-center py-6">Loading...</p>
    //             ) : selectedDept ? (
    //                 <div className="overflow-x-auto">
    //                     <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
    //                         <thead className="bg-gray-100 text-gray-700 text-sm uppercase tracking-wide">
    //                             <tr>
    //                                 <th className="border-b border-gray-200 px-4 py-3 text-left">Profile Name</th>
    //                                 <th className="border-b border-gray-200 px-4 py-3 text-left">Description</th>
    //                                 <th className="border-b border-gray-200 px-4 py-3 text-center">Active</th>
    //                                 <th className="border-b border-gray-200 px-4 py-3 text-center">Hierarchy Level</th>
    //                                 <th className="border-b border-gray-200 px-4 py-3 text-left">Default Permissions</th>
    //                             </tr>
    //                         </thead>
    //                         <tbody className="text-gray-700 text-sm">
    //                             {profiles.filter(p => p.department_id === selectedDept.id).length > 0 ? (
    //                                 profiles
    //                                     .filter(p => p.department_id === selectedDept.id)
    //                                     .map((profile) => (
    //                                         <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
    //                                             <td className="px-4 py-3 border-b">{profile.name}</td>
    //                                             <td className="px-4 py-3 border-b">{profile.description || "-"}</td>
    //                                             <td className="px-4 py-3 border-b text-center">
    //                                                 <span
    //                                                     className={`px-2 py-1 text-xs font-medium rounded-full ${profile.is_active
    //                                                         ? "bg-green-100 text-green-700"
    //                                                         : "bg-red-100 text-red-700"
    //                                                         }`}
    //                                                 >
    //                                                     {profile.is_active ? "Active" : "Inactive"}
    //                                                 </span>
    //                                             </td>
    //                                             <td className="px-4 py-3 border-b text-center">{profile.hierarchy_level}</td>
    //                                             <td className="px-4 py-3 border-b">
    //                                                 {Array.isArray(profile.default_permissions)
    //                                                     ? profile.default_permissions.map((perm, i) => (
    //                                                         <span
    //                                                             key={i}
    //                                                             className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full mr-1 mb-1"
    //                                                         >
    //                                                             {perm}
    //                                                         </span>
    //                                                     ))
    //                                                     : profile.default_permissions || "-"}
    //                                             </td>

    //                                         </tr>
    //                                     ))
    //                             ) : (
    //                                 <tr>
    //                                     <td
    //                                         colSpan={5}
    //                                         className="text-center text-gray-500 py-6 italic"
    //                                     >
    //                                         No profiles available
    //                                     </td>
    //                                 </tr>
    //                             )}
    //                         </tbody>
    //                     </table>
    //                 </div>
    //             ) : (
    //                 <p className="text-gray-500 text-center py-6">Select a department</p>
    //             )}
    //         </div>