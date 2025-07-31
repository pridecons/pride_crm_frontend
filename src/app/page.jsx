"use client";

import { useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";
import { Building, Users, TrendingUp, Globe } from "lucide-react";

import AddUserModal from "@/components/User/AddUserModal";
import EditUserModal from "@/components/User/EditUserModal";
import UserDetailsModal from "@/components/User/UserDetailsModal";
import UserPermissionsModal from "@/components/User/UserPermissionsModal";
import UserTable from "@/components/User/UserTable";
import { usePermissions } from "@/context/PermissionsContext"; 

export default function BranchMainPage({
  branches: initialBranches = [],
  roles:    initialRoles    = [],
  users:    initialUsers    = [],
  currentUser = {}
}) {

  const { hasPermission } = usePermissions();

  // console.log("hasPermission(internal_mailing) : ",hasPermission("internal_mailing"))
  // Rename prop arrays so they don’t collide
  const [branchList, setBranchList] = useState(initialBranches);
  const [roleList,   setRoleList]   = useState(initialRoles);
  const [userList,   setUserList]   = useState(initialUsers);

  const [isAddOpen, setIsAddOpen] = useState(false);

  // Initialize from currentUser.branch_id if present
  const [selectedBranchId, setSelectedBranchId] = useState(
    currentUser?.branch_id || ""
  );

  const [branchStats, setBranchStats] = useState({});
  const [activeTab,    setActiveTab]   = useState("users");
  const [loading,      setLoading]     = useState(true);

  // States for editing/details/permissions
  const [editingUser,     setEditingUser]     = useState(null);
  const [detailsUser,     setDetailsUser]     = useState(null);
  const [permissionsUser, setPermissionsUser] = useState(null);

  // On mount, fetch everything
  useEffect(() => {
    fetchBranches();
    fetchRoles();
  }, []);
  
  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=true"
      );
      const data = res.data || [];
      setBranchList(data);

      if (data.length > 0) {
        const firstId = data[0].id;
        setSelectedBranchId(firstId);
        fetchBranchStats(firstId);
        fetchUsers(firstId);
      }
    } catch (err) {
      console.error("Failed to fetch branches", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchStats = async (branchId) => {
    try {
      const res = await axiosInstance.get(`/branches/${branchId}/details`);
      const d = res.data;
      setBranchStats({
        branchName:  d.branch?.name || "",
        totalUsers:  d.total_users  || 0,
        managerName: d.manager?.name || "N/A",
        totalLeads:  d.branch?.total_leads || 0
      });
    } catch (err) {
      console.error("Failed to fetch branch stats", err);
    }
  };

  const fetchUsers = async (branchId) => {
    try {
      const res = await axiosInstance.get(
        `/users/?branch_id=${branchId}&skip=0&limit=100`
      );
      setUserList(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axiosInstance.get("/profile-role/");
      setRoleList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch roles", err);
    }
  };

  const handleBranchChange = (e) => {
    const id = e.target.value;
    setSelectedBranchId(id);
    fetchBranchStats(id);
    fetchUsers(id);
  };

  const handleDeleteUser = async (employee_code) => {
    if (!confirm(`Are you sure you want to delete ${employee_code}?`)) return;
    try {
      await axiosInstance.delete(`/users/${employee_code}`);
      fetchUsers(selectedBranchId);
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branch Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage users, leads and services by branch
          </p>
        </div>
        <div>
          <select
            className="px-4 py-2 border rounded-lg bg-white text-gray-700"
            value={selectedBranchId}
            onChange={handleBranchChange}
          >
            {branchList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Branch Name"
          value={branchStats.branchName}
          icon={Building}
          color="bg-blue-500"
        />
        <StatCard
          title="Manager"
          value={branchStats.managerName}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard
          title="Users"
          value={branchStats.totalUsers}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="Leads"
          value={branchStats.totalLeads}
          icon={TrendingUp}
          color="bg-orange-500"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b flex">
          {["users", "leads", "services"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === "users" && (
            <>
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Users for {branchStats.branchName}
                </h3>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  + Add User
                </button>
              </div>
              <UserTable
                users={userList}
                onEdit={(u) => setEditingUser(u)}
                onDelete={handleDeleteUser}
                onDetails={(u) => setDetailsUser(u)}
              />
            </>
          )}
          {activeTab === "leads" && (
            <p className="text-gray-600">Leads management coming soon…</p>
          )}
          {activeTab === "services" && (
            <p className="text-gray-600">Services configuration coming soon…</p>
          )}
        </div>
      </div>

      {/* User Modals */}
      <AddUserModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        branches={branchList}
        roles={roleList}
        users={userList}
        currentUser={currentUser}
        selectedBranchId={selectedBranchId}
        onUserAdded={(u) => {
          fetchUsers(selectedBranchId);
          setIsAddOpen(false);
        }}
      />
      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        roles={roleList}
        branches={branchList}
        onUserUpdated={() => fetchUsers(selectedBranchId)}
      />
      <UserDetailsModal
        isOpen={!!detailsUser}
        onClose={() => setDetailsUser(null)}
        user={detailsUser}
      />
      <UserPermissionsModal
        isOpen={!!permissionsUser}
        onClose={() => setPermissionsUser(null)}
        user={permissionsUser}
      />
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-lg shadow border p-4 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
    <div className={`p-3 rounded-full ${color}`}>
      <Icon className="text-white w-6 h-6" />
    </div>
  </div>
);
