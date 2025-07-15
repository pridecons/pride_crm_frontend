// src/services/userService.js - FIXED VERSION

import { apiMethods } from './apiClient'

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

    const response = await apiMethods.get(`/users?${queryParams}`)
    return response.data
  },

  /**
   * Get user by employee code
   * @param {string} employeeCode - User employee code
   * @returns {Promise<Object>} User details
   */
  async getUserByCode(employeeCode) {
    const response = await apiMethods.get(`/users/${employeeCode}`)
    return response.data
  },

  /**
   * Create new user
   * @param {Object} userData - User data
   * @param {string} userData.phone_number - Phone number (required)
   * @param {string} userData.email - Email address (required)
   * @param {string} userData.name - Full name (required)
   * @param {string} userData.father_name - Father's name (required)
   * @param {string} userData.role - User role (required)
   * @param {string} userData.password - Password (required)
   * @param {string} userData.branch_id - Branch ID (optional)
   * @param {string} userData.sales_manager_id - Sales manager employee code (optional)
   * @param {string} userData.tl_id - Team leader employee code (optional)
   * @param {number} userData.experience - Experience in years (optional)
   * @param {string} userData.date_of_joining - Date of joining (YYYY-MM-DD) (optional)
   * @param {string} userData.date_of_birth - Date of birth (YYYY-MM-DD) (optional)
   * @param {string} userData.address - Address (optional)
   * @param {string} userData.city - City (optional)
   * @param {string} userData.state - State (optional)
   * @param {string} userData.pincode - Postal code (optional)
   * @param {string} userData.comment - Additional comments (optional)
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    const response = await apiMethods.post('/users', userData)
    return response.data
  },

  /**
   * Update user
   * @param {string} employeeCode - User employee code
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(employeeCode, userData) {
    const response = await apiMethods.put(`/users/${employeeCode}`, userData)
    return response.data
  },

  /**
   * Delete user
   * @param {string} employeeCode - User employee code
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUser(employeeCode) {
    const response = await apiMethods.delete(`/users/${employeeCode}`)
    return response.data
  },

  /**
   * Toggle user active status
   * @param {string} employeeCode - User employee code
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} Updated user
   */
  async toggleUserStatus(employeeCode, isActive) {
    const response = await apiMethods.patch(`/users/${employeeCode}/toggle-status`, {
      is_active: isActive
    })
    return response.data
  },

  /**
   * Change user password
   * @param {string} employeeCode - User employee code
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.current_password - Current password
   * @param {string} passwordData.new_password - New password
   * @returns {Promise<Object>} Password change result
   */
  async changeUserPassword(employeeCode, passwordData) {
    const response = await apiMethods.patch(`/users/${employeeCode}/change-password`, passwordData)
    return response.data
  },

  /**
   * Reset user password (admin only)
   * @param {string} employeeCode - User employee code
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Password reset result
   */
  async resetUserPassword(employeeCode, newPassword) {
    const response = await apiMethods.patch(`/users/${employeeCode}/reset-password`, {
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
    const response = await apiMethods.get(`/users/${employeeCode}/permissions`)
    return response.data
  },

  /**
   * Update user permissions
   * @param {string} employeeCode - User employee code
   * @param {Object} permissions - Permission updates
   * @returns {Promise<Object>} Updated permissions
   */
  async updateUserPermissions(employeeCode, permissions) {
    const response = await apiMethods.put(`/users/${employeeCode}/permissions`, permissions)
    return response.data
  },

  /**
   * Get user roles
   * @returns {Promise<Array>} List of available roles
   */
  async getUserRoles() {
    const response = await apiMethods.get('/users/roles')
    return response.data
  },

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {boolean} activeOnly - Filter only active users (default: true)
   * @returns {Promise<Array>} List of users with the specified role
   */
  async getUsersByRole(role, activeOnly = true) {
    const params = new URLSearchParams({
      role,
      active_only: activeOnly.toString()
    })
    const response = await apiMethods.get(`/users/by-role?${params}`)
    return response.data
  },

  /**
   * Get users by branch
   * @param {string} branchId - Branch ID
   * @param {boolean} activeOnly - Filter only active users (default: true)
   * @param {string} role - Filter by role (optional)
   * @returns {Promise<Array>} List of users in the specified branch
   */
  async getUsersByBranch(branchId, activeOnly = true, role = '') {
    const params = new URLSearchParams({
      branch_id: branchId,
      active_only: activeOnly.toString()
    })
    if (role) params.append('role', role)

    const response = await apiMethods.get(`/users/by-branch?${params}`)
    return response.data
  },

  /**
   * Get user hierarchy (manager-subordinate relationships)
   * @param {string} employeeCode - Manager employee code
   * @returns {Promise<Array>} List of subordinates
   */
  async getUserHierarchy(employeeCode) {
    const response = await apiMethods.get(`/users/${employeeCode}/hierarchy`)
    return response.data
  },

  /**
   * Get user statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatistics(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await apiMethods.get(`/users/statistics?${params}`)
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
    const response = await apiMethods.post('/users/search', searchParams)
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

    const response = await apiMethods.download(`/users/export?${params}`)
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

    const response = await apiMethods.upload('/users/import', formData)
    return response.data
  },

  /**
   * Bulk user operations
   * @param {string} operation - Operation type ('activate', 'deactivate', 'delete', 'reset_password')
   * @param {Array<string>} employeeCodes - Array of employee codes
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkUserOperation(operation, employeeCodes, options = {}) {
    const response = await apiMethods.post('/users/bulk-operation', {
      operation,
      employee_codes: employeeCodes,
      ...options
    })
    return response.data
  },

  /**
   * Get user activity log
   * @param {string} employeeCode - User employee code
   * @param {number} limit - Number of records to return (default: 50)
   * @returns {Promise<Array>} User activity log
   */
  async getUserActivityLog(employeeCode, limit = 50) {
    const response = await apiMethods.get(`/users/${employeeCode}/activity-log`, {
      params: { limit }
    })
    return response.data
  },

  /**
   * Get user performance metrics
   * @param {string} employeeCode - User employee code
   * @param {Object} filters - Filter options
   * @param {string} filters.period - Time period (month, quarter, year)
   * @param {string} filters.date_from - From date (YYYY-MM-DD)
   * @param {string} filters.date_to - To date (YYYY-MM-DD)
   * @returns {Promise<Object>} User performance data
   */
  async getUserPerformance(employeeCode, filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await apiMethods.get(`/users/${employeeCode}/performance?${params}`)
    return response.data
  },

  /**
   * Validate user data before creation/update
   * @param {Object} userData - User data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validateUserData(userData, isUpdate = false) {
    const response = await apiMethods.post('/users/validate', {
      user_data: userData,
      is_update: isUpdate
    })
    return response.data
  },

  /**
   * Check employee code availability
   * @param {string} employeeCode - Employee code to check
   * @returns {Promise<Object>} Availability result
   */
  async checkEmployeeCodeAvailability(employeeCode) {
    const response = await apiMethods.get(`/users/check-code?employee_code=${employeeCode}`)
    return response.data
  },

  /**
   * Check email availability
   * @param {string} email - Email to check
   * @param {string} excludeEmployeeCode - Employee code to exclude from check (for updates)
   * @returns {Promise<Object>} Availability result
   */
  async checkEmailAvailability(email, excludeEmployeeCode = null) {
    const params = new URLSearchParams({ email })
    if (excludeEmployeeCode) params.append('exclude_employee_code', excludeEmployeeCode)

    const response = await apiMethods.get(`/users/check-email?${params}`)
    return response.data
  },

  /**
   * Check phone number availability
   * @param {string} phoneNumber - Phone number to check
   * @param {string} excludeEmployeeCode - Employee code to exclude from check (for updates)
   * @returns {Promise<Object>} Availability result
   */
  async checkPhoneAvailability(phoneNumber, excludeEmployeeCode = null) {
    const params = new URLSearchParams({ phone_number: phoneNumber })
    if (excludeEmployeeCode) params.append('exclude_employee_code', excludeEmployeeCode)

    const response = await apiMethods.get(`/users/check-phone?${params}`)
    return response.data
  }
}

export default userService