import { apiMethods } from './apiClient'

class UserService {
  // Get all users with filtering
  async getUsers(params = {}) {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value)
      }
    })

    const response = await apiMethods.get(`/users?${queryParams.toString()}`)
    return response.data
  }

  // Get user by employee code
  async getUserById(employeeCode) {
    const response = await apiMethods.get(`/users/${employeeCode}`)
    return response.data
  }

  // Create new user
  async createUser(userData) {
    const response = await apiMethods.post('/users', userData)
    return response.data
  }

  // Update user
  async updateUser(employeeCode, userData) {
    const response = await apiMethods.put(`/users/${employeeCode}`, userData)
    return response.data
  }

  // Delete user
  async deleteUser(employeeCode) {
    const response = await apiMethods.delete(`/users/${employeeCode}`)
    return response.data
  }

  // Toggle user status (activate/deactivate)
  async toggleUserStatus(employeeCode) {
    const response = await apiMethods.patch(`/users/${employeeCode}/toggle-status`)
    return response.data
  }

  // Get user hierarchy
  async getUserHierarchy(employeeCode) {
    const response = await apiMethods.get(`/users/${employeeCode}/hierarchy`)
    return response.data
  }

  // Get available roles
  async getRoles() {
    const response = await apiMethods.get('/users/roles')
    return response.data
  }

  // Get users by role
  async getUsersByRole(role, branchId = null) {
    const params = { role }
    if (branchId) params.branch_id = branchId
    
    const queryParams = new URLSearchParams(params)
    const response = await apiMethods.get(`/users?${queryParams.toString()}`)
    return response.data
  }

  // Get subordinates for a user
  async getSubordinates(employeeCode) {
    const response = await apiMethods.get(`/users/${employeeCode}/subordinates`)
    return response.data
  }

  // Get managers for role assignment
  async getManagers(role, branchId = null) {
    const params = new URLSearchParams()
    
    // Define manager roles based on hierarchy
    const managerRoles = {
      'BA': ['TL', 'SALES_MANAGER'],
      'SBA': ['TL', 'SALES_MANAGER'],
      'TL': ['SALES_MANAGER'],
      'SALES_MANAGER': ['BRANCH_MANAGER'],
      'HR': ['BRANCH_MANAGER']
    }

    const availableRoles = managerRoles[role] || []
    
    if (availableRoles.length > 0) {
      params.append('role', availableRoles.join(','))
    }
    
    if (branchId) {
      params.append('branch_id', branchId)
    }

    const response = await apiMethods.get(`/users?${params.toString()}`)
    return response.data
  }

  // Bulk user operations
  async bulkUpdateUsers(operations) {
    const response = await apiMethods.post('/users/bulk', operations)
    return response.data
  }

  // Export users data
  async exportUsers(format = 'csv', filters = {}) {
    const params = new URLSearchParams(filters)
    params.append('format', format)
    
    return await apiMethods.download(`/users/export?${params.toString()}`, `users.${format}`)
  }

  // Import users from file
  async importUsers(file, onUploadProgress) {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiMethods.upload('/users/import', formData, onUploadProgress)
    return response.data
  }

  // Search users
  async searchUsers(query, filters = {}) {
    const params = new URLSearchParams(filters)
    params.append('search', query)
    
    const response = await apiMethods.get(`/users/search?${params.toString()}`)
    return response.data
  }

  // Get user permissions
  async getUserPermissions(employeeCode) {
    const response = await apiMethods.get(`/permissions/user/${employeeCode}`)
    return response.data
  }

  // Update user permissions
  async updateUserPermissions(employeeCode, permissions) {
    const response = await apiMethods.put(`/permissions/user/${employeeCode}`, permissions)
    return response.data
  }

  // Get user statistics
  async getUserStats(employeeCode) {
    const response = await apiMethods.get(`/users/${employeeCode}/stats`)
    return response.data
  }

  // Reset user password
  async resetPassword(employeeCode, newPassword) {
    const response = await apiMethods.post(`/users/${employeeCode}/reset-password`, {
      new_password: newPassword
    })
    return response.data
  }

  // Change own password
  async changePassword(currentPassword, newPassword) {
    const response = await apiMethods.post('/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
    return response.data
  }

  // Get user activity log
  async getUserActivity(employeeCode, params = {}) {
    const queryParams = new URLSearchParams(params)
    const response = await apiMethods.get(`/users/${employeeCode}/activity?${queryParams.toString()}`)
    return response.data
  }
}

const userService = new UserService()
export default userService