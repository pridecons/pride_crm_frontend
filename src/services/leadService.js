import { api } from './apiClient'

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

    const response = await api.get(`/leads?${queryParams}`)
    return response.data
  },

  /**
   * Get lead by ID
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Object>} Lead details
   */
  async getLeadById(leadId) {
    const response = await api.get(`/leads/${leadId}`)
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
    const response = await api.post('/leads', leadData)
    return response.data
  },

  /**
   * Update lead details
   * @param {string|number} leadId - Lead ID
   * @param {Object} leadData - Updated lead data
   * @returns {Promise<Object>} Updated lead details
   */
  async updateLead(leadId, leadData) {
    const response = await api.put(`/leads/${leadId}`, leadData)
    return response.data
  },

  /**
   * Delete lead
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteLead(leadId) {
    const response = await api.delete(`/leads/${leadId}`)
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
    const response = await api.patch(`/leads/${leadId}/status`, {
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
    const response = await api.patch(`/leads/${leadId}/assign`, {
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
    const response = await api.post('/leads/bulk-assign', {
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
    const response = await api.get('/lead-sources', {
      params: { active_only: activeOnly }
    })
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
    const response = await api.post('/lead-sources', sourceData)
    return response.data
  },

  /**
   * Update lead source
   * @param {string|number} sourceId - Source ID
   * @param {Object} sourceData - Updated source data
   * @returns {Promise<Object>} Updated lead source
   */
  async updateLeadSource(sourceId, sourceData) {
    const response = await api.put(`/lead-sources/${sourceId}`, sourceData)
    return response.data
  },

  /**
   * Delete lead source
   * @param {string|number} sourceId - Source ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteLeadSource(sourceId) {
    const response = await api.delete(`/lead-sources/${sourceId}`)
    return response.data
  },

  /**
   * Get lead responses/follow-ups for a lead
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Array>} List of lead responses
   */
  async getLeadResponses(leadId) {
    const response = await api.get(`/leads/${leadId}/responses`)
    return response.data
  },

  /**
   * Add lead response/follow-up
   * @param {string|number} leadId - Lead ID
   * @param {Object} responseData - Response data
   * @param {string} responseData.response_type - Response type (call, email, meeting, etc.)
   * @param {string} responseData.response_text - Response content (required)
   * @param {string} responseData.next_follow_up_date - Next follow-up date
   * @param {string} responseData.status - Lead status after response
   * @returns {Promise<Object>} Created response
   */
  async addLeadResponse(leadId, responseData) {
    const response = await api.post(`/leads/${leadId}/responses`, responseData)
    return response.data
  },

  /**
   * Update lead response
   * @param {string|number} responseId - Response ID
   * @param {Object} responseData - Updated response data
   * @returns {Promise<Object>} Updated response
   */
  async updateLeadResponse(responseId, responseData) {
    const response = await api.put(`/lead-responses/${responseId}`, responseData)
    return response.data
  },

  /**
   * Delete lead response
   * @param {string|number} responseId - Response ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteLeadResponse(responseId) {
    const response = await api.delete(`/lead-responses/${responseId}`)
    return response.data
  },

  /**
   * Get leads assigned to current user
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} User's assigned leads
   */
  async getMyLeads(params = {}) {
    const queryParams = new URLSearchParams({
      skip: (params.skip || 0).toString(),
      limit: (params.limit || 50).toString()
    })

    if (params.status) queryParams.append('status', params.status)
    if (params.priority) queryParams.append('priority', params.priority)
    if (params.date_from) queryParams.append('date_from', params.date_from)
    if (params.date_to) queryParams.append('date_to', params.date_to)

    const response = await api.get(`/leads/my-leads?${queryParams}`)
    return response.data
  },

  /**
   * Get lead statistics
   * @param {Object} filters - Filter options
   * @param {string} filters.date_from - From date
   * @param {string} filters.date_to - To date
   * @param {string} filters.branch_id - Branch filter
   * @param {string} filters.assigned_to - User filter
   * @returns {Promise<Object>} Lead statistics
   */
  async getLeadStatistics(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await api.get(`/leads/statistics?${params}`)
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

    const response = await api.get(`/leads/due-followup?${params}`)
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
    const response = await api.post(`/leads/${leadId}/convert`, conversionData)
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

    const response = await api.upload(`/leads/${leadId}/documents`, formData)
    return response.data
  },

  /**
   * Get lead documents
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Array>} List of lead documents
   */
  async getLeadDocuments(leadId) {
    const response = await api.get(`/leads/${leadId}/documents`)
    return response.data
  },

  /**
   * Delete lead document
   * @param {string|number} leadId - Lead ID
   * @param {string|number} documentId - Document ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteLeadDocument(leadId, documentId) {
    const response = await api.delete(`/leads/${leadId}/documents/${documentId}`)
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

    const response = await api.upload('/leads/import', formData)
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

    const response = await api.get(`/leads/export?${params}`, {
      responseType: 'blob'
    })
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
    const response = await api.post('/leads/search', searchParams)
    return response.data
  },

  /**
   * Get lead conversion funnel data
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Funnel statistics
   */
  async getLeadFunnel(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await api.get(`/leads/funnel?${params}`)
    return response.data
  },

  /**
   * Get lead performance metrics
   * @param {Object} filters - Filter options
   * @param {string} filters.period - Time period (day, week, month, year)
   * @param {string} filters.date_from - From date
   * @param {string} filters.date_to - To date
   * @returns {Promise<Object>} Performance metrics
   */
  async getLeadPerformance(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await api.get(`/leads/performance?${params}`)
    return response.data
  },

  /**
   * Schedule lead follow-up reminder
   * @param {string|number} leadId - Lead ID
   * @param {Object} reminderData - Reminder data
   * @param {string} reminderData.reminder_date - Reminder date and time
   * @param {string} reminderData.reminder_type - Reminder type (email, sms, notification)
   * @param {string} reminderData.message - Reminder message
   * @returns {Promise<Object>} Scheduled reminder
   */
  async scheduleLeadReminder(leadId, reminderData) {
    const response = await api.post(`/leads/${leadId}/reminders`, reminderData)
    return response.data
  },

  /**
   * Get lead reminders
   * @param {string|number} leadId - Lead ID
   * @returns {Promise<Array>} List of reminders
   */
  async getLeadReminders(leadId) {
    const response = await api.get(`/leads/${leadId}/reminders`)
    return response.data
  },

  /**
   * Mark reminder as completed
   * @param {string|number} reminderId - Reminder ID
   * @returns {Promise<Object>} Updated reminder
   */
  async completeReminder(reminderId) {
    const response = await api.patch(`/lead-reminders/${reminderId}/complete`)
    return response.data
  }
}

export default leadService