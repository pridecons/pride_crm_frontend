"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { toast } from "react-toastify";
import { Edit, Trash2 } from "lucide-react";

export default function UsersListPage() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone_number: "",
    father_name: "",
    password: "",
    pan: "",
    aadhaar: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    comment: "",
    experience: "",
    date_of_joining: "",
    date_of_birth: "",
    role: "",
    branch_id: "",
  });

  const [currentUser, setCurrentUser] = useState({});
  const [loadingPan, setLoadingPan] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchBranches();
    fetchRoles();
  }, []);

  const formatToISO = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const [dd, mm, yyyy] = ddmmyyyy.split("-");
    if (dd && mm && yyyy) {
      return `${yyyy}-${mm}-${dd}`; // API expects YYYY-MM-DD
    }
    return "";
  };

  const formatToDDMMYYYY = (yyyymmdd) => {
    if (!yyyymmdd) return "";
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    return `${dd}-${mm}-${yyyy}`;
  };

  const handleDateChange = (field, value) => {
    // Only allow numbers and dashes
    if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
      setNewUser((prev) => ({ ...prev, [field]: value }));
    }
  };


  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get(
        "/users/?skip=0&limit=100&active_only=true"
      );
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      setUsers(list);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      setBranches(res.data || []);
      const map = {};
      res.data.forEach((b) => {
        map[b.id] = b.name;
      });
      setBranchMap(map);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axiosInstance.get("/profile-role/");
      setRoles(res.data || []);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      ...user,
      date_of_joining: user.date_of_joining ? formatToDDMMYYYY(user.date_of_joining) : "",
      date_of_birth: user.date_of_birth ? formatToDDMMYYYY(user.date_of_birth) : "",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await await axiosInstance.put(`/users/${formData.employee_code}`, payload);
      toast.success(`User ${formData.employee_code} updated.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (employee_code) => {
    if (!confirm(`Are you sure you want to delete user ${employee_code}?`)) return;
    try {
      await axiosInstance.delete(`/users/${employee_code}`);
      toast.success(`User ${employee_code} deleted.`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerifyPan = async () => {
    if (!formData.pan) {
      toast.error('Please enter a PAN number first');
      return;
    }
    setLoadingPan(true);
    try {
      const res = await axiosInstance.post(
        '/micro-pan-verification',
        new URLSearchParams({ pannumber: formData.pan }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (res.data.success && res.data.data?.result) {
        const result = res.data.data.result;
        setFormData(prev => ({
          ...prev,
          name: result.user_full_name || prev.name,
          father_name: result.user_father_name || prev.father_name,
          date_of_birth: result.user_dob ? result.user_dob : prev.date_of_birth,
          address: result.user_address?.full || prev.address,
          city: result.user_address?.city || prev.city,
          state: result.user_address?.state || prev.state
        }));
        toast.success('PAN verified and details autofilled!');
      } else {
        toast.error('PAN verification failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error verifying PAN');
    } finally {
      setLoadingPan(false);
    }
  };

  // ✅ Filter Users by Role & Branch
  const filteredUsers = users.filter((u) => {
    const roleMatch = selectedRole === "All" || u.role === selectedRole;
    const branchMatch =
      selectedBranch === "All" || u.branch_id === Number(selectedBranch);
    const searchMatch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone_number.includes(searchQuery) ||
      u.employee_code.toLowerCase().includes(searchQuery.toLowerCase());

    return roleMatch && branchMatch && searchMatch;
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Add User
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-6">All Users</h2>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="All">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="All">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search by name, email, phone or code"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">#</th>
              <th className="px-4 py-2 border">Employee Code</th>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Role</th>
              <th className="px-4 py-2 border">Branch</th>
              <th className="px-4 py-2 border">Phone</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Status</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, index) => (
              <tr key={index} className="border-t">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2">{u.employee_code}</td>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{branchMap[u.branch_id] || "-"}</td>
                <td className="px-4 py-2">{u.phone_number}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${u.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                      }`}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-3 flex items-center">
                  <button
                    onClick={() => handleEditClick(u)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit User"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(u.employee_code)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete User"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <form
            onSubmit={async (e) => {
              e.preventDefault();

              const payload = {
                ...formData,
                experience: Number(formData.experience) || 0,
                date_of_joining: formatToISO(formData.date_of_joining),
                date_of_birth: formatToISO(formData.date_of_birth),
              };

              try {
                await axiosInstance.put(`/users/${formData.employee_code}`, payload);
                toast.success(`User ${formData.employee_code} updated successfully!`);
                setEditingUser(null);
                fetchUsers();
              } catch (err) {
                console.error(err);
                toast.error("Failed to update user.");
              }
            }}
            className="bg-white p-6 rounded shadow max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-2">
              Edit User: {editingUser.employee_code}
            </h3>

            {/* Name, Email, Phone */}
            <input
              className="w-full border p-2"
              name="name"
              value={formData.name || ""}
              onChange={handleInputChange}
              placeholder="Name"
            />
            <input
              className="w-full border p-2"
              name="phone_number"
              value={formData.phone_number || ""}
              onChange={handleInputChange}
              placeholder="Phone"
            />
            <input
              className="w-full border p-2"
              name="email"
              value={formData.email || ""}
              onChange={handleInputChange}
              placeholder="Email"
            />

            {/* Father Name */}
            <input
              className="w-full border p-2"
              name="father_name"
              value={formData.father_name || ""}
              onChange={handleInputChange}
              placeholder="Father Name"
            />

            {/* PAN & Aadhaar */}
            <div className="flex gap-2">
              <input
                className="w-full border p-2"
                name="pan"
                value={formData.pan || ""}
                onChange={handleInputChange}
                placeholder="PAN"
              />
              <button
                type="button"
                onClick={handleVerifyPan}
                disabled={loadingPan}
                className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
              >
                {loadingPan ? 'Verifying...' : 'Verify PAN'}
              </button>
            </div>
            <input
              className="w-full border p-2"
              name="aadhaar"
              value={formData.aadhaar || ""}
              onChange={handleInputChange}
              placeholder="Aadhaar"
            />

            {/* Address */}
            <textarea
              className="w-full border p-2"
              name="address"
              value={formData.address || ""}
              onChange={handleInputChange}
              placeholder="Address"
            />
            <input
              className="w-full border p-2"
              name="city"
              value={formData.city || ""}
              onChange={handleInputChange}
              placeholder="City"
            />
            <input
              className="w-full border p-2"
              name="state"
              value={formData.state || ""}
              onChange={handleInputChange}
              placeholder="State"
            />
            <input
              className="w-full border p-2"
              name="pincode"
              value={formData.pincode || ""}
              onChange={handleInputChange}
              placeholder="Pincode"
            />

            {/* Experience */}
            <input
              className="w-full border p-2"
              name="experience"
              type="number"
              value={formData.experience || ""}
              onChange={handleInputChange}
              placeholder="Experience (in years)"
            />

            {/* Dates with DD-MM-YYYY Format */}
            <input
              className="w-full border p-2"
              placeholder="Date of Joining (DD-MM-YYYY)"
              value={formData.date_of_joining ? formatToDDMMYYYY(formData.date_of_joining) : ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date_of_joining: e.target.value }))
              }
            />
            <input
              className="w-full border p-2"
              placeholder="Date of Birth (DD-MM-YYYY)"
              value={formData.date_of_birth ? formatToDDMMYYYY(formData.date_of_birth) : ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))
              }
            />

            {/* Comment */}
            <textarea
              className="w-full border p-2"
              name="comment"
              value={formData.comment || ""}
              onChange={handleInputChange}
              placeholder="Comment"
            />

            {/* Role Dropdown */}
            <select
              className="w-full border p-2"
              name="role"
              value={formData.role || ""}
              onChange={handleInputChange}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Branch Dropdown */}
            <select
              className="w-full border p-2"
              name="branch_id"
              value={formData.branch_id || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, branch_id: e.target.value }))
              }
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Buttons */}
            <div className="flex justify-between mt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {isSubmitting ? "Updating..." : "Update"}
              </button>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-gray-500 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await axiosInstance.post("/users/", {
                  ...newUser,
                  branch_id: newUser.branch_id ? Number(newUser.branch_id) : null,
                  experience: Number(newUser.experience) || 0,
                  date_of_joining: formatToISO(newUser.date_of_joining),
                  date_of_birth: formatToISO(newUser.date_of_birth),
                  is_active: true,
                });
                toast.success("User added successfully!");
                setIsAddModalOpen(false);
                setNewUser({
                  name: "",
                  email: "",
                  phone_number: "",
                  father_name: "",
                  role: "",
                  branch_id: "",
                  password: "",
                  pan: "",
                  aadhaar: "",
                  address: "",
                  city: "",
                  state: "",
                  pincode: "",
                  comment: "",
                  experience: "",
                  date_of_joining: "",
                  date_of_birth: "",
                });
                fetchUsers();
              } catch (err) {
                console.error(err);
                toast.error("Failed to add user");
              }
            }}
            className="bg-white p-6 rounded shadow max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold">Add New User</h3>

            {/* Basic Fields */}
            <input className="w-full border p-2" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} required />
            <input className="w-full border p-2" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required />
            <input className="w-full border p-2" placeholder="Phone" value={newUser.phone_number} onChange={(e) => setNewUser((p) => ({ ...p, phone_number: e.target.value }))} required />
            <input className="w-full border p-2" placeholder="Father Name" value={newUser.father_name} onChange={(e) => setNewUser((p) => ({ ...p, father_name: e.target.value }))} />

            {/* Password */}
            <input className="w-full border p-2" type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required />

            {/* PAN & Aadhaar */}
            <div className="flex gap-2">
              <input
                className="w-full border p-2"
                placeholder="PAN"
                value={newUser.pan}
                onChange={(e) => setNewUser((p) => ({ ...p, pan: e.target.value }))}
              />
              <button
                type="button"
                onClick={async () => {
                  if (!newUser.pan) {
                    toast.error('Please enter a PAN number first');
                    return;
                  }
                  setLoadingPan(true);
                  try {
                    const res = await axiosInstance.post(
                      '/micro-pan-verification',
                      new URLSearchParams({ pannumber: newUser.pan }),
                      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                    );

                    if (res.data.success && res.data.data?.result) {
                      const result = res.data.data.result;
                      setNewUser(prev => ({
                        ...prev,
                        name: result.user_full_name || prev.name,
                        father_name: result.user_father_name || prev.father_name,
                        date_of_birth: result.user_dob ? result.user_dob : prev.date_of_birth,
                        address: result.user_address?.full || prev.address,
                        city: result.user_address?.city || prev.city,
                        state: result.user_address?.state || prev.state
                      }));
                      toast.success('PAN verified and details autofilled!');
                    } else {
                      toast.error('PAN verification failed');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Error verifying PAN');
                  } finally {
                    setLoadingPan(false);
                  }
                }}
                disabled={loadingPan}
                className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
              >
                {loadingPan ? 'Verifying...' : 'Verify PAN'}
              </button>
            </div>
            <input className="w-full border p-2" placeholder="Aadhaar" value={newUser.aadhaar} onChange={(e) => setNewUser((p) => ({ ...p, aadhaar: e.target.value }))} />

            {/* Address */}
            <textarea className="w-full border p-2" placeholder="Address" value={newUser.address} onChange={(e) => setNewUser((p) => ({ ...p, address: e.target.value }))} />
            <input className="w-full border p-2" placeholder="City" value={newUser.city} onChange={(e) => setNewUser((p) => ({ ...p, city: e.target.value }))} />
            <input className="w-full border p-2" placeholder="State" value={newUser.state} onChange={(e) => setNewUser((p) => ({ ...p, state: e.target.value }))} />
            <input className="w-full border p-2" placeholder="Pincode" value={newUser.pincode} onChange={(e) => setNewUser((p) => ({ ...p, pincode: e.target.value }))} />

            {/* Other Info */}
            <input className="w-full border p-2" placeholder="Experience (in years)" type="number" value={newUser.experience} onChange={(e) => setNewUser((p) => ({ ...p, experience: e.target.value }))} />
            <input
              className="w-full border p-2"
              placeholder="Date of Joining (DD-MM-YYYY)"
              value={newUser.date_of_joining}
              onChange={(e) => handleDateChange("date_of_joining", e.target.value)}
            />
            <input
              className="w-full border p-2"
              placeholder="Date of Birth (DD-MM-YYYY)"
              value={newUser.date_of_birth}
              onChange={(e) => handleDateChange("date_of_birth", e.target.value)}
            />
            <textarea className="w-full border p-2" placeholder="Comment" value={newUser.comment} onChange={(e) => setNewUser((p) => ({ ...p, comment: e.target.value }))} />

            {/* Role Dropdown */}
            <select className="w-full border p-2" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))} required>
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Branch Dropdown */}
            <select className="w-full border p-2" value={newUser.branch_id} onChange={(e) => setNewUser((p) => ({ ...p, branch_id: e.target.value }))}>
              <option value="">Select Branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <div className="flex justify-between mt-4">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Save
              </button>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-500 px-4 py-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
