/**
 * Data Formatting Utilities
 * Comprehensive formatting functions for display and input
 */

/**
 * Number Formatting
 */

// Format number with Indian comma system (lakhs, crores)
export const formatIndianNumber = (number, decimals = 0) => {
  if (number === null || number === undefined || isNaN(number)) return '0'
  
  const num = parseFloat(number)
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

// Format currency in Indian Rupees
export const formatCurrency = (amount, showSymbol = true, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) return showSymbol ? '₹0' : '0'
  
  const num = parseFloat(amount)
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
  
  return showSymbol ? formatted : formatted.replace('₹', '').trim()
}

// Format currency in compact form (1.5L, 2.3Cr)
export const formatCompactCurrency = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) return showSymbol ? '₹0' : '0'
  
  const num = parseFloat(amount)
  const absNum = Math.abs(num)
  let formatted = ''
  
  if (absNum >= 10000000) { // 1 Crore
    formatted = `${(num / 10000000).toFixed(1)}Cr`
  } else if (absNum >= 100000) { // 1 Lakh
    formatted = `${(num / 100000).toFixed(1)}L`
  } else if (absNum >= 1000) { // 1 Thousand
    formatted = `${(num / 1000).toFixed(1)}K`
  } else {
    formatted = num.toString()
  }
  
  return showSymbol ? `₹${formatted}` : formatted
}

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0%'
  
  const num = parseFloat(value)
  return `${num.toFixed(decimals)}%`
}

// Format file size
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  if (!bytes || isNaN(bytes)) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}

/**
 * Date and Time Formatting
 */

// Format date in Indian format (DD/MM/YYYY)
export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'DD MMM YYYY':
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${day} ${months[d.getMonth()]} ${year}`
    case 'DD MMMM YYYY':
      const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${day} ${fullMonths[d.getMonth()]} ${year}`
    default:
      return d.toLocaleDateString('en-IN')
  }
}

// Format time
export const formatTime = (date, format24 = false) => {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  return d.toLocaleTimeString('en-IN', {
    hour12: !format24,
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format date and time
export const formatDateTime = (date, dateFormat = 'DD/MM/YYYY', timeFormat24 = false) => {
  if (!date) return ''
  
  const formattedDate = formatDate(date, dateFormat)
  const formattedTime = formatTime(date, timeFormat24)
  
  return `${formattedDate} ${formattedTime}`
}

// Relative time formatting (2 hours ago, 3 days ago)
export const formatRelativeTime = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  const now = new Date()
  const diffInSeconds = Math.floor((now - d) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
  return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

// Format date range
export const formatDateRange = (startDate, endDate, format = 'DD/MM/YYYY') => {
  if (!startDate) return ''
  if (!endDate) return formatDate(startDate, format)
  
  const start = formatDate(startDate, format)
  const end = formatDate(endDate, format)
  
  return `${start} - ${end}`
}

/**
 * Text Formatting
 */

// Capitalize first letter
export const capitalize = (text) => {
  if (!text || typeof text !== 'string') return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

// Title case
export const titleCase = (text) => {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

// Convert to sentence case
export const sentenceCase = (text) => {
  if (!text || typeof text !== 'string') return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text || typeof text !== 'string') return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + suffix
}

// Format text with line breaks
export const formatTextWithBreaks = (text) => {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/\n/g, '<br>')
}

// Remove HTML tags
export const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return ''
  return html.replace(/<[^>]*>/g, '')
}

// Extract initials from name
export const getInitials = (name, maxLength = 2) => {
  if (!name || typeof name !== 'string') return ''
  
  const words = name.trim().split(/\s+/)
  const initials = words
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('')
  
  return initials
}

/**
 * Phone Number Formatting
 */

// Format Indian phone number
export const formatPhoneNumber = (phone, includeCountryCode = false) => {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Handle Indian numbers
  if (cleaned.length === 10) {
    const formatted = cleaned.replace(/(\d{5})(\d{5})/, '$1 $2')
    return includeCountryCode ? `+91 ${formatted}` : formatted
  }
  
  // Handle numbers with country code
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const number = cleaned.substring(2)
    const formatted = number.replace(/(\d{5})(\d{5})/, '$1 $2')
    return `+91 ${formatted}`
  }
  
  return phone // Return original if no format matches
}

// Mask phone number for privacy
export const maskPhoneNumber = (phone) => {
  if (!phone) return ''
  
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 2)}XXXXXX${cleaned.substring(8)}`
  }
  
  return phone
}

/**
 * Document Formatting
 */

// Format PAN number
export const formatPAN = (pan) => {
  if (!pan) return ''
  
  const cleaned = pan.replace(/[^A-Z0-9]/g, '').toUpperCase()
  if (cleaned.length === 10) {
    return cleaned.replace(/([A-Z]{5})([0-9]{4})([A-Z])/, '$1$2$3')
  }
  
  return cleaned
}

// Format Aadhaar number with masking
export const formatAadhaar = (aadhaar, mask = false) => {
  if (!aadhaar) return ''
  
  const cleaned = aadhaar.replace(/\D/g, '')
  if (cleaned.length === 12) {
    if (mask) {
      return `XXXX XXXX ${cleaned.substring(8)}`
    }
    return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
  }
  
  return cleaned
}

// Format GST number
export const formatGST = (gst) => {
  if (!gst) return ''
  
  const cleaned = gst.replace(/[^A-Z0-9]/g, '').toUpperCase()
  if (cleaned.length === 15) {
    return cleaned.replace(/(\d{2})([A-Z]{5})(\d{4})([A-Z])([A-Z0-9])([Z])([A-Z0-9])/, '$1$2$3$4$5$6$7')
  }
  
  return cleaned
}

// Format vehicle number
export const formatVehicleNumber = (vehicleNumber) => {
  if (!vehicleNumber) return ''
  
  const cleaned = vehicleNumber.replace(/[^A-Z0-9]/g, '').toUpperCase()
  
  // Format: XX 00 XX 0000
  if (cleaned.length >= 8) {
    return cleaned.replace(/([A-Z]{2})(\d{1,2})([A-Z]{1,2})(\d{4})/, '$1 $2 $3 $4')
  }
  
  return cleaned
}

/**
 * Address Formatting
 */

// Format complete address
export const formatAddress = (addressObj) => {
  if (!addressObj) return ''
  
  const parts = [
    addressObj.address,
    addressObj.city,
    addressObj.state,
    addressObj.pincode
  ].filter(part => part && part.trim())
  
  return parts.join(', ')
}

// Format pincode
export const formatPincode = (pincode) => {
  if (!pincode) return ''
  
  const cleaned = pincode.replace(/\D/g, '')
  return cleaned.substring(0, 6)
}

/**
 * Status and Badge Formatting
 */

// Format status with colors
export const getStatusBadgeClass = (status) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    interested: 'bg-green-100 text-green-800',
    converted: 'bg-emerald-100 text-emerald-800',
    lost: 'bg-gray-100 text-gray-800'
  }
  
  return statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

// Format priority level
export const formatPriority = (priority) => {
  const priorities = {
    high: { label: 'High', class: 'bg-red-100 text-red-800' },
    medium: { label: 'Medium', class: 'bg-yellow-100 text-yellow-800' },
    low: { label: 'Low', class: 'bg-green-100 text-green-800' }
  }
  
  return priorities[priority?.toLowerCase()] || { label: 'Unknown', class: 'bg-gray-100 text-gray-800' }
}

/**
 * URL and Link Formatting
 */

// Format URL with protocol
export const formatUrl = (url) => {
  if (!url) return ''
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  
  return url
}

// Create mailto link
export const formatMailto = (email, subject = '', body = '') => {
  if (!email) return ''
  
  const params = new URLSearchParams()
  if (subject) params.append('subject', subject)
  if (body) params.append('body', body)
  
  const paramString = params.toString()
  return `mailto:${email}${paramString ? '?' + paramString : ''}`
}

// Create tel link
export const formatTel = (phone) => {
  if (!phone) return ''
  
  const cleaned = phone.replace(/\D/g, '')
  return `tel:+91${cleaned}`
}

/**
 * Array and Object Formatting
 */

// Format array as comma-separated string
export const formatArrayAsString = (array, separator = ', ', lastSeparator = ' and ') => {
  if (!Array.isArray(array) || array.length === 0) return ''
  
  if (array.length === 1) return array[0]
  if (array.length === 2) return array.join(lastSeparator)
  
  const allButLast = array.slice(0, -1).join(separator)
  const last = array[array.length - 1]
  
  return `${allButLast}${lastSeparator}${last}`
}

// Format object as key-value pairs
export const formatObjectAsString = (obj, separator = ', ') => {
  if (!obj || typeof obj !== 'object') return ''
  
  return Object.entries(obj)
    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(separator)
}

/**
 * Form Input Formatters (for real-time formatting)
 */

// Format currency input (removes non-numeric except decimal)
export const formatCurrencyInput = (value) => {
  if (!value) return ''
  
  // Remove all non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '')
  
  // Ensure only one decimal point
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('')
  }
  
  return cleaned
}

// Format phone input (removes non-numeric)
export const formatPhoneInput = (value) => {
  if (!value) return ''
  
  return value.replace(/\D/g, '').substring(0, 10)
}

// Format PAN input (uppercase, alphanumeric only)
export const formatPANInput = (value) => {
  if (!value) return ''
  
  return value.replace(/[^A-Z0-9]/g, '').toUpperCase().substring(0, 10)
}

// Format Aadhaar input (numeric only)
export const formatAadhaarInput = (value) => {
  if (!value) return ''
  
  return value.replace(/\D/g, '').substring(0, 12)
}

// Format pincode input (numeric only, 6 digits)
export const formatPincodeInput = (value) => {
  if (!value) return ''
  
  return value.replace(/\D/g, '').substring(0, 6)
}

/**
 * Utility Functions
 */

// Check if value needs formatting
export const needsFormatting = (value, type) => {
  if (!value) return false
  
  switch (type) {
    case 'currency':
      return !isNaN(parseFloat(value))
    case 'phone':
      return /^\d{10}$/.test(value.replace(/\D/g, ''))
    case 'date':
      return !isNaN(new Date(value).getTime())
    default:
      return true
  }
}

// Parse formatted currency back to number
export const parseCurrency = (formattedValue) => {
  if (!formattedValue) return 0
  
  const cleaned = formattedValue.replace(/[^\d.-]/g, '')
  return parseFloat(cleaned) || 0
}

// Parse formatted number back to number
export const parseFormattedNumber = (formattedValue) => {
  if (!formattedValue) return 0
  
  const cleaned = formattedValue.replace(/[^\d.-]/g, '')
  return parseFloat(cleaned) || 0
}

// Format display value based on type
export const formatDisplayValue = (value, type, options = {}) => {
  if (value === null || value === undefined) return ''
  
  switch (type) {
    case 'currency':
      return formatCurrency(value, options.showSymbol, options.decimals)
    case 'percentage':
      return formatPercentage(value, options.decimals)
    case 'date':
      return formatDate(value, options.format)
    case 'datetime':
      return formatDateTime(value, options.dateFormat, options.timeFormat24)
    case 'phone':
      return formatPhoneNumber(value, options.includeCountryCode)
    case 'text':
      return options.capitalize ? capitalize(value) : value
    case 'truncate':
      return truncateText(value, options.maxLength, options.suffix)
    default:
      return value.toString()
  }
}

export default {
  // Numbers and Currency
  formatIndianNumber,
  formatCurrency,
  formatCompactCurrency,
  formatPercentage,
  formatFileSize,
  
  // Dates and Time
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatDateRange,
  
  // Text
  capitalize,
  titleCase,
  sentenceCase,
  truncateText,
  getInitials,
  
  // Phone and Documents
  formatPhoneNumber,
  formatPAN,
  formatAadhaar,
  formatGST,
  
  // Address
  formatAddress,
  formatPincode,
  
  // Status and Display
  getStatusBadgeClass,
  formatPriority,
  formatDisplayValue,
  
  // Input Formatters
  formatCurrencyInput,
  formatPhoneInput,
  formatPANInput,
  formatAadhaarInput,
  
  // Utilities
  parseCurrency,
  parseFormattedNumber
}