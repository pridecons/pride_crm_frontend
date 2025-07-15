'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  RefreshCw,
  Settings
} from 'lucide-react'
import { toast } from 'react-toastify'

import ProtectedRoute from '@/components/common/ProtectedRoute'
import RoleBasedAccess, { AdminOnly, ManagerOnly } from '@/components/common/RoleBasedAccess'
import LoadingSpinner, { TableLoader, InlineLoader } from '@/components/common/LoadingSpinner'
import userService from '@/services/userService'
import branchService from '@/services/branchService'
import { useAuth } from '@/context/AuthContext'

export default function UsersPage() {
  return (
    <ProtectedRoute 
      allowedRoles={['SUPERADMIN', 'HR', 'BRANCH_MANAGER']}
      requiredPermissions={['view_users']}
    >
      <UserManagementDashboard />
    </ProtectedRoute>
  )
}

function UserManagementDashboard() {
  const router = useRouter()
  const { user: currentUser, hasPermission } = useAuth()

  // State management
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  
  // Pagination & Filtering
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    branch_id: '',
    status: 'all' // all, active, inactive
  })
  
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showFilters, setShowFilters] = useState(false)

  // Fetch data
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        skip: (pagination.page - 1) * pagination.limit,
        limit: pagination.limit,
        search: filters.search,
        role: filters.role,
        branch_id: filters.branch_id,
        active_only: filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined
      }

      const response = await userService.getUsers(params)
      setUsers(response.data || response)
      
      // Update pagination if response includes metadata
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
          totalPages: Math.ceil(response.pagination.total / pagination.limit)
        }))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  const fetchMetadata = useCallback(async () => {
    try {
      const [branchesRes, rolesRes] = await Promise.all([
        branchService.getBranches({ active_only: true }),
        userService.getUserRoles()
      ])
      
      setBranches(branchesRes.data || branchesRes)
      setRoles(rolesRes.roles || rolesRes)
    } catch (error) {
      console.error('Error fetching metadata:', error)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  // Event handlers
  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleUserAction = async (action, userId) => {
    try {
      setActionLoading(prev => ({ ...prev, [userId]: true }))
      
      switch (action) {
        case 'activate':
          await userService.toggleUserStatus(userId, true)
          toast.success('User activated successfully')
          break
        case 'deactivate':
          await userService.toggleUserStatus(userId, false)
          toast.success('User deactivated successfully')
          break
        case 'delete':
          if (window.confirm('Are you sure you want to delete this user?')) {
            await userService.deleteUser(userId)
            toast.success('User deleted successfully')
          } else {
            return
          }
          break
        default:
          return
      }
      
      fetchUsers()
    } catch (error) {
      console.error(`Error ${action} user:`, error)
      toast.error(`Failed to ${action} user`)
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.warning('Please select users first')
      return
    }

    try {
      setLoading(true)
      await userService.bulkUserOperation(action, selectedUsers)
      toast.success(`Bulk ${action} completed successfully`)
      setSelectedUsers([])
      fetchUsers()
    } catch (error) {
      console.error(`Error bulk ${action}:`, error)
      toast.error(`Failed to ${action} selected users`)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await userService.exportUsers(filters, 'csv')
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Users exported successfully')
    } catch (error) {
      console.error('Error exporting users:', error)
      toast.error('Failed to export users')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="mr-3 h-8 w-8 text-blue-600" />
              User Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage users, roles, and permissions across your organization
            </p>
          </div>
          
          <RoleBasedAccess allowedRoles={['SUPERADMIN', 'HR']} requiredPermissions={['add_user']}>
            <button
              onClick={() => router.push('/dashboard/users/add')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </button>
          </RoleBasedAccess>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or employee code..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter Toggle & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </button>
            
            <button
              onClick={fetchUsers}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Roles</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select
                  value={filters.branch_id}
                  onChange={(e) => handleFilterChange('branch_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <AdminOnly>
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </AdminOnly>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <TableLoader rows={10} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(users.map(u => u.employee_code))
                          } else {
                            setSelectedUsers([])
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <UserRow
                      key={user.employee_code}
                      user={user}
                      isSelected={selectedUsers.includes(user.employee_code)}
                      onSelect={(selected) => {
                        if (selected) {
                          setSelectedUsers(prev => [...prev, user.employee_code])
                        } else {
                          setSelectedUsers(prev => prev.filter(id => id !== user.employee_code))
                        }
                      }}
                      onAction={handleUserAction}
                      actionLoading={actionLoading[user.employee_code]}
                      currentUser={currentUser}
                      hasPermission={hasPermission}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || filters.role || filters.branch_id
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first user.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}

// User Row Component
function UserRow({ user, isSelected, onSelect, onAction, actionLoading, currentUser, hasPermission }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()

  const canEdit = hasPermission('edit_user') && (
    currentUser.role === 'SUPERADMIN' || 
    currentUser.role === 'HR' ||
    (currentUser.role === 'BRANCH_MANAGER' && user.branch_id === currentUser.branch_id)
  )

  const canDelete = hasPermission('delete_user') && currentUser.role === 'SUPERADMIN'

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="rounded border-gray-300"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
            <div className="text-xs text-gray-400">{user.employee_code}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' :
          user.role === 'BRANCH_MANAGER' ? 'bg-blue-100 text-blue-800' :
          user.role === 'SALES_MANAGER' ? 'bg-green-100 text-green-800' :
          user.role === 'TL' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {user.branch?.branch_name || 'N/A'}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
      </td>
      <td className="px-6 py-4 text-right text-sm font-medium">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={actionLoading}
          >
            {actionLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
              <div className="py-1">
                <button
                  onClick={() => {
                    router.push(`/dashboard/users/${user.employee_code}`)
                    setShowDropdown(false)
                  }}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </button>
                
                {canEdit && (
                  <button
                    onClick={() => {
                      router.push(`/dashboard/users/${user.employee_code}/edit`)
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit User
                  </button>
                )}
                
                {hasPermission('manage_user_permissions') && (
                  <button
                    onClick={() => {
                      router.push(`/dashboard/users/${user.employee_code}/permissions`)
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Permissions
                  </button>
                )}
                
                <hr className="my-1" />
                
                {user.is_active ? (
                  <button
                    onClick={() => {
                      onAction('deactivate', user.employee_code)
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 w-full text-left"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onAction('activate', user.employee_code)
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full text-left"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Activate
                  </button>
                )}
                
                {canDelete && (
                  <button
                    onClick={() => {
                      onAction('delete', user.employee_code)
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = []
  const maxVisiblePages = 5

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {pages.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}