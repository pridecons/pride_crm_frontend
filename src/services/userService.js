import { api } from './apiClient'

const userService = {
  /**
   * Get all users with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.skip - Number of records to skip (default: 0)
   * @param {number} params.limit - Number of records to return (default: 50)
   * @param {boolean} params.active_only - Filter only active users (default: false)
   * @param {string} params.role - Filter by role
   * @param {string} params.branch_id - Filter by branch
   * @param {string} params.search - Search term for name, email, employee_code
   * @returns {Promise<Object>} List of users with pagination info
   */
  async getUsers(params = {}) {
    const {
      skip = 0,
      limit = 50,
      active_only = false,
      role = '',
      branch_id = '',
      search = ''
    } = params

    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      active_only: active_only.toString()
    })

    if (role) queryParams.append('role', role)
    if (branch_id) queryParams.append('branch_id', branch_id)
    if (search) queryParams.append('search', search)

    const response = await api.get(`/users?${queryParams}`)
    return response.data
  },

  /**
   * Get user by employee code
   * @param {string} employeeCode - User employee code
   * @returns {Promise<Object>} User details
   */
  async getUserByCode(employeeCode) {
    const response = await api.get(`/users/${employeeCode}`)
    return response.data
  },

  /**
   * Create new user
   * @param {Object} userData - User data
   * @param {string} userData.phone_number - Phone number (required)
   * @param {string} userData.email - Email address (required)
   * @param {string} userData.name - Full name (required)
   * @param {string} userData.role - User role (required)
   * @param {string} userData.father_name - Father's name
   * @param {boolean} userData.is_active - Active status (default: true)
   * @param {number} userData.experience - Years of experience
   * @param {string} userData.date_of_joining - Date of joining (YYYY-MM-DD)
   * @param {string} userData.date_of_birth - Date of birth (YYYY-MM-DD)
   * @param {string} userData.pan - PAN number
   * @param {string} userData.aadhaar - Aadhaar number
   * @param {string} userData.address - Address
   * @param {string} userData.city - City
   * @param {string} userData.state - State
   * @param {string} userData.pincode - Postal code
   * @param {string} userData.comment - Additional comments
   * @param {string} userData.branch_id - Branch ID
   * @param {string} userData.manager_id - Manager employee code
   * @param {string} userData.sales_manager_id - Sales manager employee code
   * @param {string} userData.tl_id - Team lead employee code
   * @param {string} userData.password - Initial password
   * @returns {Promise<Object>} Created user details
   */
  async createUser(userData) {
    const response = await api.post('/users', userData)
    return response.data
  },

  /**
   * Update user details
   * @param {string} employeeCode - User employee code
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user details
   */
  async updateUser(employeeCode, userData) {
    const response = await api.put(`/users/${employeeCode}`, userData)
    return response.data
  },

  /**
   * Delete user (soft delete - sets is_active to false)
   * @param {string} employeeCode - User employee code
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteUser(employeeCode) {
    const response = await api.delete(`/users/${employeeCode}`)
    return response.data
  },

  /**
   * Activate/Deactivate user
   * @param {string} employeeCode - User employee code
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated user status
   */
  async toggleUserStatus(employeeCode, isActive) {
    const response = await api.patch(`/users/${employeeCode}/status`, {
      is_active: isActive
    })
    return response.data
  },

  /**
   * Reset user password
   * @param {string} employeeCode - User employee code
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Password reset confirmation
   */
  async resetUserPassword(employeeCode, newPassword) {
    const response = await api.post(`/users/${employeeCode}/reset-password`, {
      new_password: newPassword
    })
    return response.data
  },

  /**
   * Get user permissions
   * @param {string} employeeCode - User employee code
   * @returns {Promise<Object>} User permissions
   */
  async getUserPermissions(employeeCode) {
    const response = await api.get(`/users/${employeeCode}/permissions`)
    return response.data
  },

  /**
   * Update user permissions
   * @param {string} employeeCode - User employee code
   * @param {Object} permissions - Permission object
   * @returns {Promise<Object>} Updated permissions
   */
  async updateUserPermissions(employeeCode, permissions) {
    const response = await api.put(`/users/${employeeCode}/permissions`, permissions)
    return response.data
  },

  /**
   * Get available user roles
   * @returns {Promise<Object>} List of available roles
   */
  async getUserRoles() {
    const response = await api.get('/users/roles')
    return response.data
  },

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {boolean} activeOnly - Filter only active users (default: true)
   * @returns {Promise<Array>} List of users with specified role
   */
  async getUsersByRole(role, activeOnly = true) {
    const response = await api.get(`/users/by-role/${role}`, {
      params: { active_only: activeOnly }
    })
    return response.data
  },

  /**
   * Get users by branch
   * @param {string} branchId - Branch ID
   * @param {boolean} activeOnly - Filter only active users (default: true)
   * @returns {Promise<Array>} List of users in specified branch
   */
  async getUsersByBranch(branchId, activeOnly = true) {
    const response = await api.get(`/users/by-branch/${branchId}`, {
      params: { active_only: activeOnly }
    })
    return response.data
  },

  /**
   * Get user hierarchy (subordinates)
   * @param {string} employeeCode - Manager employee code
   * @returns {Promise<Array>} List of subordinate users
   */
  async getUserHierarchy(employeeCode) {
    const response = await api.get(`/users/${employeeCode}/hierarchy`)
    return response.data
  },

  /**
   * Get managers list for dropdown
   * @param {string} role - Manager role type ('SALES_MANAGER', 'TL', etc.)
   * @param {string} branchId - Optional branch filter
   * @returns {Promise<Array>} List of managers
   */
  async getManagers(role = '', branchId = '') {
    const params = new URLSearchParams({ active_only: 'true' })
    if (role) params.append('role', role)
    if (branchId) params.append('branch_id', branchId)

    const response = await api.get(`/users/managers?${params}`)
    return response.data
  },

  /**
   * Get team leads for dropdown
   * @param {string} salesManagerId - Sales manager employee code
   * @param {string} branchId - Optional branch filter
   * @returns {Promise<Array>} List of team leads
   */
  async getTeamLeads(salesManagerId = '', branchId = '') {
    const params = new URLSearchParams({ 
      active_only: 'true',
      role: 'TL'
    })
    if (salesManagerId) params.append('sales_manager_id', salesManagerId)
    if (branchId) params.append('branch_id', branchId)

    const response = await api.get(`/users?${params}`)
    return response.data
  },

  /**
   * Bulk user operations
   * @param {string} operation - Operation type ('activate', 'deactivate', 'delete')
   * @param {Array<string>} employeeCodes - Array of employee codes
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkUserOperation(operation, employeeCodes) {
    const response = await api.post('/users/bulk-operation', {
      operation,
      employee_codes: employeeCodes
    })
    return response.data
  },

  /**
   * Export users to CSV/Excel
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('csv', 'excel')
   * @returns {Promise<Blob>} File blob for download
   */
  async exportUsers(filters = {}, format = 'csv') {
    const params = new URLSearchParams(filters)
    params.append('format', format)

    const response = await api.get(`/users/export?${params}`, {
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Import users from CSV/Excel
   * @param {File} file - File to import
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import result
   */
  async importUsers(file, options = {}) {
    const formData = new FormData()
    formData.append('file', file)
    
    Object.keys(options).forEach(key => {
      formData.append(key, options[key])
    })

    const response = await api.upload('/users/import', formData)
    return response.data
  },

  /**
   * Get user statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatistics(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await api.get(`/users/statistics?${params}`)
    return response.data
  },

  /**
   * Search users with advanced filters
   * @param {Object} searchParams - Advanced search parameters
   * @param {string} searchParams.query - Search query
   * @param {Array<string>} searchParams.roles - Filter by roles
   * @param {Array<string>} searchParams.branches - Filter by branches
   * @param {string} searchParams.status - Filter by status ('active', 'inactive', 'all')
   * @param {Object} searchParams.dateRange - Date range filter
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchUsers(searchParams) {
    const response = await api.post('/users/search', searchParams)
    return response.data
  },

  /**
   * Get user activity log
   * @param {string} employeeCode - User employee code
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} User activity log
   */
  async getUserActivityLog(employeeCode, limit = 50) {
    const response = await api.get(`/users/${employeeCode}/activity-log`, {
      params: { limit }
    })
    return response.data
  },

  /**
   * Update user profile picture
   * @param {string} employeeCode - User employee code
   * @param {File} imageFile - Profile image file
   * @returns {Promise<Object>} Updated user with new profile picture URL
   */
  async updateProfilePicture(employeeCode, imageFile) {
    const formData = new FormData()
    formData.append('profile_picture', imageFile)

    const response = await api.upload(`/users/${employeeCode}/profile-picture`, formData)
    return response.data
  },

  /**
   * Validate user data before creation/update
   * @param {Object} userData - User data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validateUserData(userData, isUpdate = false) {
    const response = await api.post('/users/validate', {
      user_data: userData,
      is_update: isUpdate
    })
    return response.data
  }
}

export default userService