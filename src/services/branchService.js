// src/services/branchService.js - FIXED VERSION

import { apiMethods } from './apiClient'

const branchService = {
  /**
   * Get all branches with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.skip - Number of records to skip (default: 0)
   * @param {number} params.limit - Number of records to return (default: 100)
   * @param {boolean} params.active_only - Filter only active branches (default: false)
   * @param {string} params.state - Filter by state
   * @param {string} params.city - Filter by city
   * @param {string} params.search - Search term for branch name, code, or address
   * @param {string} params.manager_id - Filter by branch manager
   * @returns {Promise<Object>} List of branches with pagination info
   */
  async getBranches(params = {}) {
    const {
      skip = 0,
      limit = 100,
      active_only = false,
      state = '',
      city = '',
      search = '',
      manager_id = ''
    } = params

    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      active_only: active_only.toString()
    })

    if (state) queryParams.append('state', state)
    if (city) queryParams.append('city', city)
    if (search) queryParams.append('search', search)
    if (manager_id) queryParams.append('manager_id', manager_id)

    const response = await apiMethods.get(`/branches?${queryParams}`)
    return response.data
  },

  /**
   * Get branch by ID
   * @param {string} branchId - Branch ID
   * @returns {Promise<Object>} Branch details
   */
  async getBranchById(branchId) {
    const response = await apiMethods.get(`/branches/${branchId}`)
    return response.data
  },

  /**
   * Create new branch
   * @param {Object} branchData - Branch data
   * @param {string} branchData.branch_name - Branch name (required)
   * @param {string} branchData.branch_code - Unique branch code (required)
   * @param {string} branchData.address - Branch address (required)
   * @param {string} branchData.city - City (required)
   * @param {string} branchData.state - State (required)
   * @param {string} branchData.pincode - Postal code (required)
   * @param {string} branchData.phone_number - Phone number (optional)
   * @param {string} branchData.email - Email address (optional)
   * @param {string} branchData.manager_id - Branch manager employee code (optional)
   * @param {string} branchData.branch_type - Branch type (optional)
   * @param {boolean} branchData.is_active - Active status (default: true)
   * @returns {Promise<Object>} Created branch
   */
  async createBranch(branchData) {
    const response = await apiMethods.post('/branches', branchData)
    return response.data
  },

  /**
   * Update branch
   * @param {string} branchId - Branch ID
   * @param {Object} branchData - Updated branch data
   * @returns {Promise<Object>} Updated branch
   */
  async updateBranch(branchId, branchData) {
    const response = await apiMethods.put(`/branches/${branchId}`, branchData)
    return response.data
  },

  /**
   * Delete branch
   * @param {string} branchId - Branch ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBranch(branchId) {
    const response = await apiMethods.delete(`/branches/${branchId}`)
    return response.data
  },

  /**
   * Toggle branch active status
   * @param {string} branchId - Branch ID
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} Updated branch
   */
  async toggleBranchStatus(branchId, isActive) {
    const response = await apiMethods.patch(`/branches/${branchId}/toggle-status`, {
      is_active: isActive
    })
    return response.data
  },

  /**
   * Get branch statistics
   * @param {string} branchId - Branch ID (optional - if not provided, returns all branches stats)
   * @returns {Promise<Object>} Branch statistics
   */
  async getBranchStats(branchId = null) {
    const url = branchId ? `/branches/${branchId}/stats` : '/branches/stats'
    const response = await apiMethods.get(url)
    return response.data
  },

  /**
   * Get states with branches
   * @returns {Promise<Array>} List of states with branch count
   */
  async getStatesWithBranches() {
    const response = await apiMethods.get('/branches/states')
    return response.data
  },

  /**
   * Get cities with branches in a state
   * @param {string} state - State name
   * @returns {Promise<Array>} List of cities with branch count
   */
  async getCitiesWithBranches(state) {
    const params = state ? new URLSearchParams({ state }) : ''
    const response = await apiMethods.get(`/branches/cities?${params}`)
    return response.data
  },

  /**
   * Get branch hierarchy (parent-child relationships)
   * @param {string} branchId - Parent branch ID
   * @returns {Promise<Array>} List of child branches
   */
  async getBranchHierarchy(branchId) {
    const response = await apiMethods.get(`/branches/${branchId}/hierarchy`)
    return response.data
  },

  /**
   * Search branches with advanced filters
   * @param {Object} searchParams - Advanced search parameters
   * @param {string} searchParams.query - Search query
   * @param {Array<string>} searchParams.states - Filter by states
   * @param {Array<string>} searchParams.cities - Filter by cities
   * @param {Array<string>} searchParams.branch_types - Filter by branch types
   * @param {string} searchParams.status - Filter by status (active, inactive, all)
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchBranches(searchParams) {
    const response = await apiMethods.post('/branches/search', searchParams)
    return response.data
  },

  /**
   * Export branches to CSV/Excel
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('csv', 'excel')
   * @returns {Promise<Blob>} File blob for download
   */
  async exportBranches(filters = {}, format = 'csv') {
    const params = new URLSearchParams(filters)
    params.append('format', format)

    const response = await apiMethods.download(`/branches/export?${params}`)
    return response.data
  },

  /**
   * Import branches from CSV/Excel
   * @param {File} file - File to import
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import result
   */
  async importBranches(file, options = {}) {
    const formData = new FormData()
    formData.append('file', file)
    
    Object.keys(options).forEach(key => {
      formData.append(key, options[key])
    })

    const response = await apiMethods.upload('/branches/import', formData)
    return response.data
  },

  /**
   * Bulk branch operations
   * @param {string} operation - Operation type ('activate', 'deactivate', 'delete')
   * @param {Array<string>} branchIds - Array of branch IDs
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkBranchOperation(operation, branchIds) {
    const response = await apiMethods.post('/branches/bulk-operation', {
      operation,
      branch_ids: branchIds
    })
    return response.data
  },

  /**
   * Get branch employees
   * @param {string} branchId - Branch ID
   * @param {boolean} activeOnly - Filter only active employees (default: true)
   * @param {string} role - Filter by role
   * @returns {Promise<Array>} List of branch employees
   */
  async getBranchEmployees(branchId, activeOnly = true, role = '') {
    const params = new URLSearchParams({
      active_only: activeOnly.toString()
    })
    if (role) params.append('role', role)

    const response = await apiMethods.get(`/branches/${branchId}/employees?${params}`)
    return response.data
  },

  /**
   * Assign manager to branch
   * @param {string} branchId - Branch ID
   * @param {string} managerId - Manager employee code
   * @returns {Promise<Object>} Updated branch with new manager
   */
  async assignBranchManager(branchId, managerId) {
    const response = await apiMethods.patch(`/branches/${branchId}/assign-manager`, {
      manager_id: managerId
    })
    return response.data
  },

  /**
   * Get branch performance metrics
   * @param {string} branchId - Branch ID
   * @param {Object} filters - Filter options
   * @param {string} filters.period - Time period (month, quarter, year)
   * @param {string} filters.date_from - From date (YYYY-MM-DD)
   * @param {string} filters.date_to - To date (YYYY-MM-DD)
   * @returns {Promise<Object>} Branch performance data
   */
  async getBranchPerformance(branchId, filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await apiMethods.get(`/branches/${branchId}/performance?${params}`)
    return response.data
  },

  /**
   * Get branch lead statistics
   * @param {string} branchId - Branch ID
   * @param {Object} filters - Filter options
   * @param {string} filters.date_from - From date
   * @param {string} filters.date_to - To date
   * @returns {Promise<Object>} Branch lead statistics
   */
  async getBranchLeadStats(branchId, filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await apiMethods.get(`/branches/${branchId}/lead-stats?${params}`)
    return response.data
  },

  /**
   * Get branch targets
   * @param {string} branchId - Branch ID
   * @param {number} year - Target year (default: current year)
   * @returns {Promise<Object>} Branch targets and achievements
   */
  async getBranchTargets(branchId, year = new Date().getFullYear()) {
    const response = await apiMethods.get(`/branches/${branchId}/targets?year=${year}`)
    return response.data
  },

  /**
   * Get branch dashboard data
   * @param {string} branchId - Branch ID
   * @returns {Promise<Object>} Dashboard data including stats, charts, recent activities
   */
  async getBranchDashboard(branchId) {
    const response = await apiMethods.get(`/branches/${branchId}/dashboard`)
    return response.data
  },

  /**
   * Get all branches dashboard summary
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Overall branches summary
   */
  async getAllBranchesSummary(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await apiMethods.get(`/branches/summary?${params}`)
    return response.data
  },

  /**
   * Update branch contact information
   * @param {string} branchId - Branch ID
   * @param {Object} contactData - Contact information
   * @param {string} contactData.phone_number - Phone number
   * @param {string} contactData.email - Email address
   * @param {string} contactData.contact_person - Contact person name
   * @param {string} contactData.alternate_phone - Alternate phone number
   * @returns {Promise<Object>} Updated branch contact info
   */
  async updateBranchContact(branchId, contactData) {
    const response = await apiMethods.patch(`/branches/${branchId}/contact`, contactData)
    return response.data
  },

  /**
   * Get branch activity log
   * @param {string} branchId - Branch ID
   * @param {number} limit - Number of records to return (default: 50)
   * @returns {Promise<Array>} Branch activity log
   */
  async getBranchActivityLog(branchId, limit = 50) {
    const response = await apiMethods.get(`/branches/${branchId}/activity-log`, {
      params: { limit }
    })
    return response.data
  },

  /**
   * Validate branch data before creation/update
   * @param {Object} branchData - Branch data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validateBranchData(branchData, isUpdate = false) {
    const response = await apiMethods.post('/branches/validate', {
      branch_data: branchData,
      is_update: isUpdate
    })
    return response.data
  },

  /**
   * Check branch code availability
   * @param {string} branchCode - Branch code to check
   * @param {string} excludeBranchId - Branch ID to exclude from check (for updates)
   * @returns {Promise<Object>} Availability result
   */
  async checkBranchCodeAvailability(branchCode, excludeBranchId = null) {
    const params = new URLSearchParams({ branch_code: branchCode })
    if (excludeBranchId) params.append('exclude_branch_id', excludeBranchId)

    const response = await apiMethods.get(`/branches/check-code?${params}`)
    return response.data
  }
}

export default branchService