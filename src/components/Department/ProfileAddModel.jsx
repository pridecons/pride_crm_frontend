"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import PermissionsModal from "./permission";

export default function ProfileModal({
  isOpen,
  onClose,
  onSave,
  profile, // optional (if provided => edit mode)
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

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white border rounded-xl shadow-lg w-full sm:max-w-3xl max-w-md max-h-[90vh] overflow-y-auto p-6 mt-20 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b pb-2">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEdit ? "Edit Profile" : "Add New Profile"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✖
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gap-2 grid grid-cols-2 w-full">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter profile name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />
          </div>

          {/* Department Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              value={selectedDepartmentId || ""}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select Department
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hierarchy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hierarchy Level
            </label>
            <input
              type="number"
              placeholder="Hierarchy Level"
              value={hierarchyLevel}
              onChange={(e) => setHierarchyLevel(e.target.value)}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              min="1"
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Permissions
            </label>
            <button
              type="button"
              onClick={() => setOpenPermModal(true)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
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

          <PermissionsModal
            isOpen={openPermModal}
            onClose={() => setOpenPermModal(false)}
            selectedPermissions={selectedPerms}
            onChange={handlePermChange}
            availablePermissions={departmentPermissions}
          />

          {/* Description */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              rows={3}
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-3 text-base text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-6 w-6 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            Active
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              {isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}












// export default function AddProfileModal({ isOpen, onClose, onAdd, departmentId, departments }) {
//   const [name, setName] = useState("");
//   const [hierarchyLevel, setHierarchyLevel] = useState(1);
//   const [defaultPermissions, setDefaultPermissions] = useState("");
//   const [description, setDescription] = useState("");
//   const [isActive, setIsActive] = useState(true);
//   const [openPermModal, setOpenPermModal] = useState(false);
//   const [selectedPerms, setSelectedPerms] = useState([]);
//   const [users, setUsers] = useState([]);

//   const handlePermChange = (perms) => {
//     setSelectedPerms(perms);
//     setDefaultPermissions(perms.join(", "));
//   };

//   // const fetchUsers = async () => {
//   //   try {
//   //     const res = await axiosInstance.get("/users");
//   //     const userList = Array.isArray(res.data) ? res.data : res.data?.data || [];
//   //     setUsers(userList);
//   //   } catch (err) {
//   //     console.error("Failed to fetch users:", err);
//   //     setUsers([]);
//   //   }
//   // };

//   // useEffect(() => {
//   //   fetchUsers();
//   // }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         name,
//         department_id: Number(departmentId), // Use the departmentId prop directly
//         hierarchy_level: Number(hierarchyLevel),
//         default_permissions: defaultPermissions
//           ? defaultPermissions.split(",").map((p) => p.trim())
//           : [],
//         description,
//         is_active: isActive,
//       };

//       const res = await axiosInstance.post("/profile-role/", payload);
//       onAdd(res.data);

//       // Reset form
//       setName("");
//       setHierarchyLevel(1);
//       setDefaultPermissions("");
//       setDescription("");
//       setIsActive(true);
//       onClose();
//     } catch (error) {
//       console.error("Error adding profile:", error);
//     }
//   };
  
//   // inside your component, after fetching users
//   // const hierarchyOptions = Array.from(
//   //   new Map(
//   //     users
//   //       .filter(u => u.profile_role)
//   //       .map(u => [u.profile_role.id, { id: u.profile_role.id, name: u.profile_role.name, level: u.profile_role.hierarchy_level }])
//   //   ).values()
//   // );

//   // Get selected department name
//   const selectedDepartment = departments?.find(dept => dept.id === departmentId);

//   // Always call hooks, but conditionally render the modal
//   if (!isOpen) return null;

//   return (
//     <div
//       className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30"
//       onClick={onClose}
//     >
//       <div
//         className="bg-white rounded-lg shadow-lg p-6 w-96"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Modal header */}
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-xl font-semibold">Add Profile</h2>
//           <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
//             ✖
//           </button>
//         </div>

//         {/* Form */}
//         <form onSubmit={handleSubmit}>
//           <input
//             type="text"
//             placeholder="Profile Name"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             className="w-full border rounded-md p-2 mb-2"
//             required
//           />
          
//           {/* Display selected department instead of input field */}
//           <div className="w-full border rounded-md p-2 mb-2 bg-gray-100">
//             <span className="text-gray-600"></span>
//             <span className="font-medium">{selectedDepartment?.name || 'No department selected'}</span>
//           </div>
          
         
//            <input
//             type="text"
//             placeholder="hierarchy_level"
//             value={name}
//             onChange={(e) => setName(e.target.hierarchy_level)}
//             className="w-full border rounded-md p-2 mb-2"
//           />

//           <button
//             onClick={() => setOpenPermModal(true)}
//             className="px-4 py-2 bg-blue-500 text-white rounded mb-2"
//             type="button"
//           >
//             Select Permissions
//           </button>

//           <PermissionsModal
//             isOpen={openPermModal}
//             onClose={() => setOpenPermModal(false)}
//             selectedPermissions={selectedPerms}
//             onChange={handlePermChange}
//           />

//           <textarea
//             placeholder="Description"
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             className="w-full border rounded-md p-2 mb-2"
//           />
//           <label className="flex items-center gap-2 mb-3">
//             <input
//               type="checkbox"
//               checked={isActive}
//               onChange={(e) => setIsActive(e.target.checked)}
//             />
//             Active
//           </label>

//           <button
//             type="submit"
//             className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
//           >
//             Save
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

