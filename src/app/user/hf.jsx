"use client";

import { useEffect, useState } from "react";
import { Edit, Trash2, Plus, Search, Users, Filter, X, Check, AlertCircle } from "lucide-react";

// Mock axios instance for demo
const axiosInstance = {
  get: async (url) => {
    console.log('GET:', url);
    // Mock response based on endpoint
    if (url.includes('/users/')) {
      return {
        data: {
          data: [
            {
              employee_code: 'EMP001',
              name: 'John Doe',
              email: 'john@example.com',
              phone_number: '9876543210',
              role: 'Manager',
              branch_id: 1,
              is_active: true,
              father_name: 'Robert Doe',
              pan: 'ABCDE1234F',
              aadhaar: '123456789012',
              address: '123 Main St',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
              experience: 5,
              date_of_joining: '2020-01-15',
              date_of_birth: '1990-05-20',
              comment: 'Excellent performer'
            },
            {
              employee_code: 'EMP002',
              name: 'Jane Smith',
              email: 'jane@example.com',
              phone_number: '9876543211',
              role: 'Developer',
              branch_id: 2,
              is_active: true,
              father_name: 'Michael Smith',
              pan: 'FGHIJ5678K',
              aadhaar: '987654321098',
              address: '456 Oak Ave',
              city: 'Delhi',
              state: 'Delhi',
              pincode: '110001',
              experience: 3,
              date_of_joining: '2021-03-10',
              date_of_birth: '1992-08-15',
              comment: 'Rising star'
            }
          ]
        }
      };
    } else if (url.includes('/branches/')) {
      return {
        data: [
          { id: 1, name: 'Mumbai Branch' },
          { id: 2, name: 'Delhi Branch' },
          { id: 3, name: 'Bangalore Branch' }
        ]
      };
    } else if (url.includes('/profile-role/')) {
      return {
        data: ['Manager', 'Developer', 'Designer', 'Analyst']
      };
    }
    return { data: [] };
  },
  post: async (url, data) => {
    console.log('POST:', url, data);
    return { data: { success: true } };
  },
  put: async (url, data) => {
    console.log('PUT:', url, data);
    return { data: { success: true } };
  },
  delete: async (url) => {
    console.log('DELETE:', url);
    return { data: { success: true } };
  }
};

// Mock toast for demo
const toast = {
  success: (msg) => console.log('SUCCESS:', msg),
  error: (msg) => console.log('ERROR:', msg)
};

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
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
  };

  const formatToDDMMYYYY = (yyyymmdd) => {
    if (!yyyymmdd) return "";
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    return `${dd}-${mm}-${yyyy}`;
  };

  const handleDateChange = (field, value) => {
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
      const payload = {
        ...formData,
        experience: Number(formData.experience) || 0,
        date_of_joining: formatToISO(formData.date_of_joining),
        date_of_birth: formatToISO(formData.date_of_birth),
      };
      await axiosInstance.put(`/users/${formData.employee_code}`, payload);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-500 mt-1">Manage all system users and their information</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="All">All Roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="All">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone or code"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                All Users ({filteredUsers.length})
              </h3>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((u, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{u.employee_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{u.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{branchMap[u.branch_id] || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.phone_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.employee_code)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Edit User: {editingUser.employee_code}
                  </h3>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
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
                className="p-6 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="phone_number"
                      value={formData.phone_number || ""}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Father Name</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    name="father_name"
                    value={formData.father_name || ""}
                    onChange={handleInputChange}
                    placeholder="Enter father's name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">PAN</label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        name="pan"
                        value={formData.pan || ""}
                        onChange={handleInputChange}
                        placeholder="Enter PAN number"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPan}
                        disabled={loadingPan}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingPan ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Aadhaar</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="aadhaar"
                      value={formData.aadhaar || ""}
                      onChange={handleInputChange}
                      placeholder="Enter Aadhaar number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    name="address"
                    value={formData.address || ""}
                    onChange={handleInputChange}
                    placeholder="Enter full address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="city"
                      value={formData.city || ""}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="state"
                      value={formData.state || ""}
                      onChange={handleInputChange}
                      placeholder="Enter state"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Pincode</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="pincode"
                      value={formData.pincode || ""}
                      onChange={handleInputChange}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Experience (years)</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="experience"
                      type="number"
                      value={formData.experience || ""}
                      onChange={handleInputChange}
                      placeholder="Enter years of experience"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date of Joining</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="DD-MM-YYYY"
                      value={formData.date_of_joining ? formatToDDMMYYYY(formData.date_of_joining) : ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, date_of_joining: e.target.value }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="DD-MM-YYYY"
                      value={formData.date_of_birth ? formatToDDMMYYYY(formData.date_of_birth) : ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Comment</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    name="comment"
                    value={formData.comment || ""}
                    onChange={handleInputChange}
                    placeholder="Enter any additional comments"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="role"
                      value={formData.role || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select a role</option>
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Branch</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      name="branch_id"
                      value={formData.branch_id || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, branch_id: e.target.value }))
                      }
                    >
                      <option value="">Select a branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Update User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
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
                className="p-6 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Name *</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter full name"
                      value={newUser.name}
                      onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email *</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter email address"
                      value={newUser.email}
                      onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone *</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter phone number"
                      value={newUser.phone_number}
                      onChange={(e) => setNewUser((p) => ({ ...p, phone_number: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Father Name</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter father's name"
                      value={newUser.father_name}
                      onChange={(e) => setNewUser((p) => ({ ...p, father_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password *</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    type="password"
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">PAN</label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter PAN number"
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
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingPan ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Aadhaar</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter Aadhaar number"
                      value={newUser.aadhaar}
                      onChange={(e) => setNewUser((p) => ({ ...p, aadhaar: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter full address"
                    value={newUser.address}
                    onChange={(e) => setNewUser((p) => ({ ...p, address: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter city"
                      value={newUser.city}
                      onChange={(e) => setNewUser((p) => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter state"
                      value={newUser.state}
                      onChange={(e) => setNewUser((p) => ({ ...p, state: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Pincode</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter pincode"
                      value={newUser.pincode}
                      onChange={(e) => setNewUser((p) => ({ ...p, pincode: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Experience (years)</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter years"
                      type="number"
                      value={newUser.experience}
                      onChange={(e) => setNewUser((p) => ({ ...p, experience: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date of Joining</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="DD-MM-YYYY"
                      value={newUser.date_of_joining}
                      onChange={(e) => handleDateChange("date_of_joining", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="DD-MM-YYYY"
                      value={newUser.date_of_birth}
                      onChange={(e) => handleDateChange("date_of_birth", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Comment</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter any additional comments"
                    value={newUser.comment}
                    onChange={(e) => setNewUser((p) => ({ ...p, comment: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Role *</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={newUser.role}
                      onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Branch</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={newUser.branch_id}
                      onChange={(e) => setNewUser((p) => ({ ...p, branch_id: e.target.value }))}
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )}