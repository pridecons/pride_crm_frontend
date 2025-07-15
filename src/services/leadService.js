// src/services/leadService.js - FIXED VERSION

import { apiMethods } from './apiClient'

const leadService = {
  /**
   * Get all leads with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.skip - Number of records to skip (default: 0)
   * @param {number} params.limit - Number of records to return (default: 50)
   * @param {string} params.status - Filter by lead status
   * @param {string} params.source - Filter by lead source
   * @param {string} params.assigned_to - Filter by assigned user
   * @param {string} params.branch_id - Filter by branch
   * @param {string} params.date_from - Filter from date (YYYY-MM-DD)
   * @param {string} params.date_to - Filter to date (YYYY-MM-DD)
   * @param {string} params.search - Search term for name, phone, email
   * @param {string} params.priority - Filter by priority (high, medium, low)
   * @returns {Promise<Object>} List of leads with pagination info
   */
  async getLeads(params = {}) {
    const {
      skip = 0,
      limit = 50,
      status = '',
      source = '',
      assigned_to = '',
      branch_id = '',
      date_from = '',
      date_to = '',
      search = '',
      priority = ''
    } = params

    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    })

    if (status) queryParams.append('status', status)
    if (source) queryParams.append('source', source)
    if (assigned_to) queryParams.append('assigned_to', assigned_to)
    if (branch_id) queryParams.append('branch_id', branch_id)
    if (date_from) queryParams.append('date_from', date_from)
    if (date_to) queryParams.append('date_to', date_to)
    if (search) queryParams.append('search', search)
    if (priority) queryParams.append('priority', priority)

    const response = await apiMethods.get(`/leads?${queryParams}`)
    return response.data
  },

  /**
   * Get lead by ID
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Object>} Lead details
   */
  async getLeadById(leadId) {
    const response = await apiMethods.get(`/leads/${leadId}`)
    return response.data
  },

  /**
   * Create new lead
   * @param {Object} leadData - Lead data
   * @param {string} leadData.name - Customer name (required)
   * @param {string} leadData.phone_number - Phone number (required)
   * @param {string} leadData.email - Email address
   * @param {string} leadData.lead_source_id - Lead source ID (required)
   * @param {string} leadData.service_interested - Service of interest
   * @param {string} leadData.priority - Priority level (high, medium, low)
   * @param {string} leadData.status - Lead status
   * @param {string} leadData.assigned_to - Assigned user employee code
   * @param {string} leadData.branch_id - Branch ID
   * @param {string} leadData.address - Customer address
   * @param {string} leadData.city - City
   * @param {string} leadData.state - State
   * @param {string} leadData.pincode - Postal code
   * @param {string} leadData.occupation - Customer occupation
   * @param {number} leadData.annual_income - Annual income
   * @param {string} leadData.investment_amount - Investment amount
   * @param {string} leadData.investment_duration - Investment duration
   * @param {string} leadData.risk_tolerance - Risk tolerance level
   * @param {string} leadData.comments - Additional comments
   * @returns {Promise<Object>} Created lead details
   */
  async createLead(leadData) {
    const response = await apiMethods.post('/leads', leadData)
    return response.data
  },

  /**
   * Update lead details
   * @param {string|number} leadId - Lead ID
   * @param {Object} leadData - Updated lead data
   * @returns {Promise<Object>} Updated lead details
   */
  async updateLead(leadId, leadData) {
    const response = await apiMethods.put(`/leads/${leadId}`, leadData)
    return response.data
  },

  /**
   * Delete lead
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteLead(leadId) {
    const response = await apiMethods.delete(`/leads/${leadId}`)
    return response.data
  },

  /**
   * Update lead status
   * @param {string|number} leadId - Lead ID
   * @param {string} status - New status
   * @param {string} comments - Status change comments
   * @returns {Promise<Object>} Updated lead
   */
  async updateLeadStatus(leadId, status, comments = '') {
    const response = await apiMethods.patch(`/leads/${leadId}/status`, {
      status,
      comments
    })
    return response.data
  },

  /**
   * Assign lead to user
   * @param {string|number} leadId - Lead ID
   * @param {string} assignedTo - Employee code of assignee
   * @param {string} comments - Assignment comments
   * @returns {Promise<Object>} Updated lead
   */
  async assignLead(leadId, assignedTo, comments = '') {
    const response = await apiMethods.patch(`/leads/${leadId}/assign`, {
      assigned_to: assignedTo,
      comments
    })
    return response.data
  },

  /**
   * Bulk assign leads
   * @param {Array<string|number>} leadIds - Array of lead IDs
   * @param {string} assignedTo - Employee code of assignee
   * @param {string} comments - Assignment comments
   * @returns {Promise<Object>} Bulk assignment result
   */
  async bulkAssignLeads(leadIds, assignedTo, comments = '') {
    const response = await apiMethods.post('/leads/bulk-assign', {
      lead_ids: leadIds,
      assigned_to: assignedTo,
      comments
    })
    return response.data
  },

  /**
   * Get lead sources
   * @param {boolean} activeOnly - Filter only active sources (default: true)
   * @returns {Promise<Array>} List of lead sources
   */
  async getLeadSources(activeOnly = true) {
    const params = new URLSearchParams({
      active_only: activeOnly.toString()
    })
    const response = await apiMethods.get(`/lead-sources?${params}`)
    return response.data
  },

  /**
   * Create lead source
   * @param {Object} sourceData - Lead source data
   * @param {string} sourceData.name - Source name (required)
   * @param {string} sourceData.description - Source description
   * @param {boolean} sourceData.is_active - Active status (default: true)
   * @returns {Promise<Object>} Created lead source
   */
  async createLeadSource(sourceData) {
    const response = await apiMethods.post('/lead-sources', sourceData)
    return response.data
  },

  /**
   * Update lead source
   * @param {string|number} sourceId - Source ID
   * @param {Object} sourceData - Updated source data
   * @returns {Promise<Object>} Updated lead source
   */
  async updateLeadSource(sourceId, sourceData) {
    const response = await apiMethods.put(`/lead-sources/${sourceId}`, sourceData)
    return response.data
  },

  /**
   * Delete lead source
   * @param {string|number} sourceId - Source ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteLeadSource(sourceId) {
    const response = await apiMethods.delete(`/lead-sources/${sourceId}`)
    return response.data
  },

  /**
   * Add follow-up to lead
   * @param {string|number} leadId - Lead ID
   * @param {Object} followupData - Follow-up data
   * @param {string} followupData.follow_up_date - Follow-up date (YYYY-MM-DD)
   * @param {string} followupData.comments - Follow-up comments
   * @param {string} followupData.follow_up_type - Follow-up type (call, email, meeting)
   * @returns {Promise<Object>} Created follow-up
   */
  async addLeadFollowup(leadId, followupData) {
    const response = await apiMethods.post(`/leads/${leadId}/follow-up`, followupData)
    return response.data
  },

  /**
   * Get lead follow-ups
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Array>} List of follow-ups for the lead
   */
  async getLeadFollowups(leadId) {
    const response = await apiMethods.get(`/leads/${leadId}/follow-up`)
    return response.data
  },

  /**
   * Update follow-up
   * @param {string|number} leadId - Lead ID
   * @param {string|number} followupId - Follow-up ID
   * @param {Object} followupData - Updated follow-up data
   * @returns {Promise<Object>} Updated follow-up
   */
  async updateLeadFollowup(leadId, followupId, followupData) {
    const response = await apiMethods.put(`/leads/${leadId}/follow-up/${followupId}`, followupData)
    return response.data
  },

  /**
   * Delete follow-up
   * @param {string|number} leadId - Lead ID
   * @param {string|number} followupId - Follow-up ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteLeadFollowup(leadId, followupId) {
    const response = await apiMethods.delete(`/leads/${leadId}/follow-up/${followupId}`)
    return response.data
  },

  /**
   * Get lead statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Lead statistics
   */
  async getLeadStatistics(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await apiMethods.get(`/leads/statistics?${params}`)
    return response.data
  },

  /**
   * Get leads due for follow-up
   * @param {string} date - Date to check (YYYY-MM-DD, default: today)
   * @param {string} assignedTo - Filter by assigned user
   * @returns {Promise<Array>} Leads due for follow-up
   */
  async getLeadsDueForFollowup(date = '', assignedTo = '') {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (assignedTo) params.append('assigned_to', assignedTo)

    const response = await apiMethods.get(`/leads/due-followup?${params}`)
    return response.data
  },

  /**
   * Convert lead to customer
   * @param {string|number} leadId - Lead ID
   * @param {Object} conversionData - Conversion data
   * @param {string} conversionData.service_selected - Selected service
   * @param {number} conversionData.investment_amount - Investment amount
   * @param {string} conversionData.payment_method - Payment method
   * @param {string} conversionData.comments - Conversion comments
   * @returns {Promise<Object>} Conversion result
   */
  async convertLead(leadId, conversionData) {
    const response = await apiMethods.post(`/leads/${leadId}/convert`, conversionData)
    return response.data
  },

  /**
   * Upload lead documents
   * @param {string|number} leadId - Lead ID
   * @param {Array<File>} files - Files to upload
   * @param {string} documentType - Document type
   * @returns {Promise<Object>} Upload result
   */
  async uploadLeadDocuments(leadId, files, documentType = 'general') {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    formData.append('document_type', documentType)

    const response = await apiMethods.upload(`/leads/${leadId}/documents`, formData)
    return response.data
  },

  /**
   * Get lead documents
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Array>} List of lead documents
   */
  async getLeadDocuments(leadId) {
    const response = await apiMethods.get(`/leads/${leadId}/documents`)
    return response.data
  },

  /**
   * Delete lead document
   * @param {string|number} leadId - Lead ID
   * @param {string|number} documentId - Document ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteLeadDocument(leadId, documentId) {
    const response = await apiMethods.delete(`/leads/${leadId}/documents/${documentId}`)
    return response.data
  },

  /**
   * Bulk import leads from CSV/Excel
   * @param {File} file - File to import
   * @param {Object} options - Import options
   * @param {string} options.lead_source_id - Default lead source
   * @param {string} options.assigned_to - Default assignee
   * @param {string} options.branch_id - Default branch
   * @returns {Promise<Object>} Import result
   */
  async importLeads(file, options = {}) {
    const formData = new FormData()
    formData.append('file', file)
    
    Object.keys(options).forEach(key => {
      formData.append(key, options[key])
    })

    const response = await apiMethods.upload('/leads/import', formData)
    return response.data
  },

  /**
   * Export leads to CSV/Excel
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('csv', 'excel')
   * @returns {Promise<Blob>} File blob for download
   */
  async exportLeads(filters = {}, format = 'csv') {
    const params = new URLSearchParams(filters)
    params.append('format', format)

    const response = await apiMethods.download(`/leads/export?${params}`)
    return response.data
  },

  /**
   * Search leads with advanced filters
   * @param {Object} searchParams - Advanced search parameters
   * @param {string} searchParams.query - Search query
   * @param {Array<string>} searchParams.statuses - Filter by statuses
   * @param {Array<string>} searchParams.sources - Filter by sources
   * @param {Array<string>} searchParams.priorities - Filter by priorities
   * @param {Object} searchParams.dateRange - Date range filter
   * @param {Object} searchParams.amountRange - Investment amount range
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchLeads(searchParams) {
    const response = await apiMethods.post('/leads/search', searchParams)
    return response.data
  },

  /**
   * Bulk operations on leads
   * @param {string} operation - Operation type ('delete', 'assign', 'update_status')
   * @param {Array<string|number>} leadIds - Array of lead IDs
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkLeadOperation(operation, leadIds, options = {}) {
    const response = await apiMethods.post('/leads/bulk-operation', {
      operation,
      lead_ids: leadIds,
      ...options
    })
    return response.data
  },

  /**
   * Get lead activity history
   * @param {string|number} leadId - Lead ID
   * @param {number} limit - Number of records to return (default: 50)
   * @returns {Promise<Array>} Lead activity history
   */
  async getLeadActivity(leadId, limit = 50) {
    const response = await apiMethods.get(`/leads/${leadId}/activity`, {
      params: { limit }
    })
    return response.data
  },

  /**
   * Get lead conversion funnel data
   * @param {Object} filters - Filter options
   * @param {string} filters.date_from - From date
   * @param {string} filters.date_to - To date
   * @param {string} filters.branch_id - Branch filter
   * @param {string} filters.assigned_to - Assignee filter
   * @returns {Promise<Object>} Conversion funnel data
   */
  async getLeadFunnelData(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await apiMethods.get(`/leads/funnel?${params}`)
    return response.data
  },

  /**
   * Validate lead data before creation/update
   * @param {Object} leadData - Lead data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validateLeadData(leadData, isUpdate = false) {
    const response = await apiMethods.post('/leads/validate', {
      lead_data: leadData,
      is_update: isUpdate
    })
    return response.data
  },

  /**
   * Check duplicate leads
   * @param {string} phoneNumber - Phone number to check
   * @param {string} email - Email to check (optional)
   * @param {string|number} excludeLeadId - Lead ID to exclude from check (for updates)
   * @returns {Promise<Object>} Duplicate check result
   */
  async checkDuplicateLeads(phoneNumber, email = '', excludeLeadId = null) {
    const params = new URLSearchParams({ phone_number: phoneNumber })
    if (email) params.append('email', email)
    if (excludeLeadId) params.append('exclude_lead_id', excludeLeadId)

    const response = await apiMethods.get(`/leads/check-duplicate?${params}`)
    return response.data
  }
}

export default leadService