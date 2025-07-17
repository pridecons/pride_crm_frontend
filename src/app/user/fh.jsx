"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { toast } from "react-toastify";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  Phone,
  Mail,
  User,
  Shield,
  CreditCard,
  MapPin,
  Calendar,
  Briefcase,
  MessageSquare,
  Check,
  X,
  Loader2,
  UserPlus,
  Eye,
  Home
} from "lucide-react";

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
  const [detailsUser, setDetailsUser] = useState(null);

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

  function DetailField({ label, value }) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
        <p className="text-gray-600">{value || '—'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage and track all users in your organization
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="bg-blue-50 rounded-full p-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Active Users
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
              <div className="bg-green-50 rounded-full p-3">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Branches
                </p>
                <p className="text-3xl font-bold text-gray-900">{branches.length}</p>
              </div>
              <div className="bg-purple-50 rounded-full p-3">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Roles
                </p>
                <p className="text-3xl font-bold text-gray-900">{roles.length}</p>
              </div>
              <div className="bg-amber-50 rounded-full p-3">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                >
                  <option value="All">All Roles</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Filter */}
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                >
                  <option value="All">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{u.employee_code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-full p-2">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {branchMap[u.branch_id] || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{u.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${u.is_active
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-red-100 text-red-800 border-red-200"
                          }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setDetailsUser(u)} // Set user to open details modal
                          className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-all duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.employee_code)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Results Summary */}
          {filteredUsers.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 text-center">
                Showing <span className="font-medium text-gray-900">{filteredUsers.length}</span> of{" "}
                <span className="font-medium text-gray-900">{users.length}</span> users
                {searchQuery && (
                  <span> matching "<span className="font-medium text-blue-600">{searchQuery}</span>"</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Enhanced Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 rounded-full p-2">
                        <Edit className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">
                        Edit User: {editingUser.employee_code}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all duration-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Basic Information
                      </h4>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          name="name"
                          value={formData.name || ""}
                          onChange={handleInputChange}
                          placeholder="Full Name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          name="phone_number"
                          value={formData.phone_number || ""}
                          onChange={handleInputChange}
                          placeholder="Phone Number"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          name="email"
                          value={formData.email || ""}
                          onChange={handleInputChange}
                          placeholder="Email Address"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Father Name</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          name="father_name"
                          value={formData.father_name || ""}
                          onChange={handleInputChange}
                          placeholder="Father Name"
                        />
                      </div>
                    </div>

                    {/* Document Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Document Information
                      </h4>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            name="pan"
                            value={formData.pan || ""}
                            onChange={handleInputChange}
                            placeholder="PAN Number"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyPan}
                            disabled={loadingPan}
                            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                          >
                            {loadingPan ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            {loadingPan ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          name="aadhaar"
                          value={formData.aadhaar || ""}
                          onChange={handleInputChange}
                          placeholder="Aadhaar Number"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          name="role"
                          value={formData.role || ""}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Role</option>
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Branch</label>
                        <select
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          name="branch_id"
                          value={formData.branch_id || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, branch_id: e.target.value }))
                          }
                        >
                          <option value="">Select Branch</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Address Information - Full Width */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Address Information
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">City</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            name="city"
                            value={formData.city || ""}
                            onChange={handleInputChange}
                            placeholder="City"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">State</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            name="state"
                            value={formData.state || ""}
                            onChange={handleInputChange}
                            placeholder="State"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Pincode</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            name="pincode"
                            value={formData.pincode || ""}
                            onChange={handleInputChange}
                            placeholder="Pincode"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                          name="address"
                          value={formData.address || ""}
                          onChange={handleInputChange}
                          placeholder="Complete Address"
                          rows="3"
                        />
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Additional Information
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Experience (Years)</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            name="experience"
                            type="number"
                            value={formData.experience || ""}
                            onChange={handleInputChange}
                            placeholder="Years of experience"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="DD-MM-YYYY"
                            value={formData.date_of_joining ? formatToDDMMYYYY(formData.date_of_joining) : ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, date_of_joining: e.target.value }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="DD-MM-YYYY"
                            value={formData.date_of_birth ? formatToDDMMYYYY(formData.date_of_birth) : ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Comment</label>
                        <textarea
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                          name="comment"
                          value={formData.comment || ""}
                          onChange={handleInputChange}
                          placeholder="Additional comments"
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Update User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Add User Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 rounded-full p-2">
                        <UserPlus className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">Add New User</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all duration-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Basic Information
                      </h4>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Name *</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          placeholder="Full Name"
                          value={newUser.name}
                          onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Email *</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          placeholder="Email Address"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Phone *</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          placeholder="Phone Number"
                          value={newUser.phone_number}
                          onChange={(e) => setNewUser((p) => ({ ...p, phone_number: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Father Name</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          placeholder="Father Name"
                          value={newUser.father_name}
                          onChange={(e) => setNewUser((p) => ({ ...p, father_name: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Password *</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          type="password"
                          placeholder="Password"
                          value={newUser.password}
                          onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    {/* Document & Role Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Document & Role Information
                      </h4>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="PAN Number"
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
                            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                          >
                            {loadingPan ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            {loadingPan ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          placeholder="Aadhaar Number"
                          value={newUser.aadhaar}
                          onChange={(e) => setNewUser((p) => ({ ...p, aadhaar: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Role *</label>
                        <select
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white"
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
                        <label className="block text-sm font-medium text-gray-700">Branch</label>
                        <select
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white"
                          value={newUser.branch_id}
                          onChange={(e) => setNewUser((p) => ({ ...p, branch_id: e.target.value }))}
                        >
                          <option value="">Select Branch</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Experience (Years)</label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          placeholder="Years of experience"
                          type="number"
                          value={newUser.experience}
                          onChange={(e) => setNewUser((p) => ({ ...p, experience: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Address Information - Full Width */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Address Information
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">City</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="City"
                            value={newUser.city}
                            onChange={(e) => setNewUser((p) => ({ ...p, city: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">State</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="State"
                            value={newUser.state}
                            onChange={(e) => setNewUser((p) => ({ ...p, state: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Pincode</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="Pincode"
                            value={newUser.pincode}
                            onChange={(e) => setNewUser((p) => ({ ...p, pincode: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none"
                          placeholder="Complete Address"
                          value={newUser.address}
                          onChange={(e) => setNewUser((p) => ({ ...p, address: e.target.value }))}
                          rows="3"
                        />
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Additional Information
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="DD-MM-YYYY"
                            value={newUser.date_of_joining}
                            onChange={(e) => handleDateChange("date_of_joining", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                          <input
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="DD-MM-YYYY"
                            value={newUser.date_of_birth}
                            onChange={(e) => handleDateChange("date_of_birth", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Comments</label>
                        <textarea
                          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none"
                          placeholder="Additional comments"
                          value={newUser.comment}
                          onChange={(e) => setNewUser((p) => ({ ...p, comment: e.target.value }))}
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {detailsUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">User Details</h3>
                <button
                  onClick={() => setDetailsUser(null)}
                  className="text-white hover:text-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailField label="Employee Code" value={detailsUser.employee_code} />
                  <DetailField label="Name" value={detailsUser.name} />
                  <DetailField label="Role" value={detailsUser.role} />
                  <DetailField label="Email" value={detailsUser.email} />
                  <DetailField label="Phone" value={detailsUser.phone_number} />
                  <DetailField label="Father Name" value={detailsUser.father_name} />
                  <DetailField label="Date of Birth" value={detailsUser.date_of_birth} />
                  <DetailField label="Date of Joining" value={detailsUser.date_of_joining} />
                  <DetailField label="Experience" value={`${detailsUser.experience} years`} />
                  <DetailField label="PAN" value={detailsUser.pan || '—'} />
                  <DetailField label="Aadhaar" value={detailsUser.aadhaar || '—'} />
                  <DetailField label="Branch" value={branchMap[detailsUser.branch_id] || '—'} />
                </div>

                {/* Address Full Width */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Address</h4>
                  <p className="text-gray-600">{detailsUser.address}, {detailsUser.city}, {detailsUser.state} - {detailsUser.pincode}</p>
                </div>

                {/* Comment */}
                {detailsUser.comment && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Comment</h4>
                    <p className="text-gray-600">{detailsUser.comment}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setDetailsUser(null)}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}