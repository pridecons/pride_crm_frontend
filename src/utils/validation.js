/**
 * Form Validation Utilities
 * Comprehensive validation functions for common form fields
 */

// Regular expressions for validation
export const REGEX_PATTERNS = {
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  indianPhone: /^[6-9]\d{9}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  aadhaar: /^\d{12}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  pincode: /^[1-9][0-9]{5}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  url: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphabetsOnly: /^[a-zA-Z\s]+$/,
  numbersOnly: /^\d+$/,
  noSpecialChars: /^[a-zA-Z0-9\s]+$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  vehicleNumber: /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/
}

// Error messages
export const ERROR_MESSAGES = {
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email address',
  invalidPhone: 'Please enter a valid phone number',
  invalidPAN: 'Please enter a valid PAN number (e.g., ABCDE1234F)',
  invalidAadhaar: 'Please enter a valid 12-digit Aadhaar number',
  invalidGST: 'Please enter a valid GST number',
  invalidPincode: 'Please enter a valid 6-digit pincode',
  invalidUrl: 'Please enter a valid URL',
  invalidIFSC: 'Please enter a valid IFSC code',
  passwordWeak: 'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
  passwordMismatch: 'Passwords do not match',
  minLength: (min) => `Minimum ${min} characters required`,
  maxLength: (max) => `Maximum ${max} characters allowed`,
  minValue: (min) => `Minimum value is ${min}`,
  maxValue: (max) => `Maximum value is ${max}`,
  invalidDate: 'Please enter a valid date',
  futureDate: 'Date cannot be in the future',
  pastDate: 'Date cannot be in the past',
  invalidAge: 'Age must be between 18 and 100 years',
  invalidFileType: 'Invalid file type',
  fileTooLarge: 'File size is too large',
  invalidCurrency: 'Please enter a valid amount'
}

/**
 * Basic validation functions
 */

// Required field validation
export const required = (value) => {
  if (value === null || value === undefined) return ERROR_MESSAGES.required
  if (typeof value === 'string' && value.trim() === '') return ERROR_MESSAGES.required
  if (Array.isArray(value) && value.length === 0) return ERROR_MESSAGES.required
  return null
}

// Email validation
export const validateEmail = (email) => {
  if (!email) return null
  if (!REGEX_PATTERNS.email.test(email.trim())) {
    return ERROR_MESSAGES.invalidEmail
  }
  return null
}

// Phone number validation
export const validatePhone = (phone, indian = false) => {
  if (!phone) return null
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (indian) {
    if (!REGEX_PATTERNS.indianPhone.test(cleanPhone)) {
      return 'Please enter a valid 10-digit Indian mobile number'
    }
  } else {
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return ERROR_MESSAGES.invalidPhone
    }
  }
  return null
}

// PAN validation
export const validatePAN = (pan) => {
  if (!pan) return null
  if (!REGEX_PATTERNS.pan.test(pan.toUpperCase())) {
    return ERROR_MESSAGES.invalidPAN
  }
  return null
}

// Aadhaar validation
export const validateAadhaar = (aadhaar) => {
  if (!aadhaar) return null
  const cleanAadhaar = aadhaar.replace(/\D/g, '')
  if (!REGEX_PATTERNS.aadhaar.test(cleanAadhaar)) {
    return ERROR_MESSAGES.invalidAadhaar
  }
  return null
}

// GST validation
export const validateGST = (gst) => {
  if (!gst) return null
  if (!REGEX_PATTERNS.gst.test(gst.toUpperCase())) {
    return ERROR_MESSAGES.invalidGST
  }
  return null
}

// Pincode validation
export const validatePincode = (pincode) => {
  if (!pincode) return null
  if (!REGEX_PATTERNS.pincode.test(pincode)) {
    return ERROR_MESSAGES.invalidPincode
  }
  return null
}

// Password validation
export const validatePassword = (password, strong = false) => {
  if (!password) return null
  
  if (strong) {
    if (!REGEX_PATTERNS.strongPassword.test(password)) {
      return ERROR_MESSAGES.passwordWeak
    }
  } else {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
  }
  return null
}

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return ERROR_MESSAGES.required
  if (password !== confirmPassword) {
    return ERROR_MESSAGES.passwordMismatch
  }
  return null
}

// Length validation
export const validateLength = (value, min, max) => {
  if (!value) return null
  const length = value.length
  
  if (min && length < min) {
    return ERROR_MESSAGES.minLength(min)
  }
  if (max && length > max) {
    return ERROR_MESSAGES.maxLength(max)
  }
  return null
}

// Number validation
export const validateNumber = (value, min, max) => {
  if (!value) return null
  const num = parseFloat(value)
  
  if (isNaN(num)) {
    return 'Please enter a valid number'
  }
  if (min !== undefined && num < min) {
    return ERROR_MESSAGES.minValue(min)
  }
  if (max !== undefined && num > max) {
    return ERROR_MESSAGES.maxValue(max)
  }
  return null
}

// Age validation
export const validateAge = (birthDate, minAge = 18, maxAge = 100) => {
  if (!birthDate) return null
  
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  if (age < minAge || age > maxAge) {
    return ERROR_MESSAGES.invalidAge
  }
  return null
}

// Date validation
export const validateDate = (date, allowFuture = true, allowPast = true) => {
  if (!date) return null
  
  const inputDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (isNaN(inputDate.getTime())) {
    return ERROR_MESSAGES.invalidDate
  }
  
  if (!allowFuture && inputDate > today) {
    return ERROR_MESSAGES.futureDate
  }
  
  if (!allowPast && inputDate < today) {
    return ERROR_MESSAGES.pastDate
  }
  
  return null
}

// URL validation
export const validateUrl = (url) => {
  if (!url) return null
  if (!REGEX_PATTERNS.url.test(url)) {
    return ERROR_MESSAGES.invalidUrl
  }
  return null
}

// IFSC code validation
export const validateIFSC = (ifsc) => {
  if (!ifsc) return null
  if (!REGEX_PATTERNS.ifsc.test(ifsc.toUpperCase())) {
    return ERROR_MESSAGES.invalidIFSC
  }
  return null
}

// Currency/Amount validation
export const validateCurrency = (amount, min = 0, max) => {
  if (!amount) return null
  
  const num = parseFloat(amount.toString().replace(/[^\d.-]/g, ''))
  
  if (isNaN(num)) {
    return ERROR_MESSAGES.invalidCurrency
  }
  
  if (num < min) {
    return `Amount must be at least ₹${min}`
  }
  
  if (max && num > max) {
    return `Amount cannot exceed ₹${max}`
  }
  
  return null
}

// File validation
export const validateFile = (file, options = {}) => {
  if (!file) return null
  
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    required = false
  } = options
  
  if (required && !file) {
    return ERROR_MESSAGES.required
  }
  
  if (file.size > maxSize) {
    return `${ERROR_MESSAGES.fileTooLarge}. Maximum size: ${formatFileSize(maxSize)}`
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `${ERROR_MESSAGES.invalidFileType}. Allowed: ${allowedTypes.join(', ')}`
  }
  
  return null
}

/**
 * Composite validation functions
 */

// User registration validation
export const validateUserRegistration = (userData) => {
  const errors = {}
  
  // Name validation
  const nameError = required(userData.name) || validateLength(userData.name, 2, 50)
  if (nameError) errors.name = nameError
  
  // Email validation
  const emailError = required(userData.email) || validateEmail(userData.email)
  if (emailError) errors.email = emailError
  
  // Phone validation
  const phoneError = required(userData.phone) || validatePhone(userData.phone, true)
  if (phoneError) errors.phone = phoneError
  
  // Password validation
  const passwordError = required(userData.password) || validatePassword(userData.password, true)
  if (passwordError) errors.password = passwordError
  
  // Confirm password validation
  const confirmPasswordError = validateConfirmPassword(userData.password, userData.confirmPassword)
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Lead validation
export const validateLead = (leadData) => {
  const errors = {}
  
  // Name validation
  const nameError = required(leadData.name) || validateLength(leadData.name, 2, 100)
  if (nameError) errors.name = nameError
  
  // Phone validation
  const phoneError = required(leadData.phone_number) || validatePhone(leadData.phone_number, true)
  if (phoneError) errors.phone_number = phoneError
  
  // Email validation (optional but must be valid if provided)
  if (leadData.email) {
    const emailError = validateEmail(leadData.email)
    if (emailError) errors.email = emailError
  }
  
  // Lead source validation
  if (!leadData.lead_source_id) {
    errors.lead_source_id = 'Lead source is required'
  }
  
  // Investment amount validation (optional)
  if (leadData.investment_amount) {
    const amountError = validateCurrency(leadData.investment_amount, 1000, 10000000)
    if (amountError) errors.investment_amount = amountError
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// KYC validation
export const validateKYC = (kycData) => {
  const errors = {}
  
  // PAN validation
  const panError = required(kycData.pan) || validatePAN(kycData.pan)
  if (panError) errors.pan = panError
  
  // Aadhaar validation
  const aadhaarError = required(kycData.aadhaar) || validateAadhaar(kycData.aadhaar)
  if (aadhaarError) errors.aadhaar = aadhaarError
  
  // Date of birth validation
  const dobError = required(kycData.date_of_birth) || validateAge(kycData.date_of_birth)
  if (dobError) errors.date_of_birth = dobError
  
  // Address validation
  const addressError = required(kycData.address) || validateLength(kycData.address, 10, 200)
  if (addressError) errors.address = addressError
  
  // Pincode validation
  const pincodeError = required(kycData.pincode) || validatePincode(kycData.pincode)
  if (pincodeError) errors.pincode = pincodeError
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Dynamic validation engine
 */

// Validation rule object
export class ValidationRule {
  constructor(field, value) {
    this.field = field
    this.value = value
    this.rules = []
  }
  
  required(message = ERROR_MESSAGES.required) {
    this.rules.push(() => required(this.value) ? message : null)
    return this
  }
  
  email(message = ERROR_MESSAGES.invalidEmail) {
    this.rules.push(() => validateEmail(this.value) ? message : null)
    return this
  }
  
  phone(indian = false, message = ERROR_MESSAGES.invalidPhone) {
    this.rules.push(() => validatePhone(this.value, indian) ? message : null)
    return this
  }
  
  minLength(min, message) {
    this.rules.push(() => {
      if (!this.value) return null
      return this.value.length < min ? (message || ERROR_MESSAGES.minLength(min)) : null
    })
    return this
  }
  
  maxLength(max, message) {
    this.rules.push(() => {
      if (!this.value) return null
      return this.value.length > max ? (message || ERROR_MESSAGES.maxLength(max)) : null
    })
    return this
  }
  
  pattern(regex, message) {
    this.rules.push(() => {
      if (!this.value) return null
      return !regex.test(this.value) ? message : null
    })
    return this
  }
  
  custom(validator, message) {
    this.rules.push(() => {
      if (!this.value) return null
      return !validator(this.value) ? message : null
    })
    return this
  }
  
  validate() {
    for (const rule of this.rules) {
      const error = rule()
      if (error) return error
    }
    return null
  }
}

// Validation builder
export const validate = (field, value) => {
  return new ValidationRule(field, value)
}

// Batch validation
export const validateForm = (formData, validationRules) => {
  const errors = {}
  
  Object.keys(validationRules).forEach(field => {
    const rule = validationRules[field]
    const value = formData[field]
    
    let error = null
    if (typeof rule === 'function') {
      error = rule(value)
    } else if (rule instanceof ValidationRule) {
      rule.value = value
      error = rule.validate()
    }
    
    if (error) {
      errors[field] = error
    }
  })
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Utility functions
 */

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Clean phone number
export const cleanPhoneNumber = (phone) => {
  return phone ? phone.replace(/\D/g, '') : ''
}

// Format PAN
export const formatPAN = (pan) => {
  return pan ? pan.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
}

// Format Aadhaar
export const formatAadhaar = (aadhaar) => {
  const clean = aadhaar ? aadhaar.replace(/\D/g, '') : ''
  return clean.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
}

// Validate multiple fields
export const validateFields = (fields) => {
  const errors = {}
  let isValid = true
  
  Object.keys(fields).forEach(key => {
    const field = fields[key]
    if (field.validate) {
      const error = field.validate()
      if (error) {
        errors[key] = error
        isValid = false
      }
    }
  })
  
  return { isValid, errors }
}

// Export validation schemas for common forms
export const VALIDATION_SCHEMAS = {
  login: {
    username: (value) => required(value) || validateEmail(value),
    password: (value) => required(value)
  },
  
  registration: {
    name: (value) => required(value) || validateLength(value, 2, 50),
    email: (value) => required(value) || validateEmail(value),
    phone: (value) => required(value) || validatePhone(value, true),
    password: (value) => required(value) || validatePassword(value, true)
  },
  
  profile: {
    name: (value) => required(value) || validateLength(value, 2, 50),
    email: (value) => required(value) || validateEmail(value),
    phone: (value) => required(value) || validatePhone(value, true)
  },
  
  lead: {
    name: (value) => required(value) || validateLength(value, 2, 100),
    phone_number: (value) => required(value) || validatePhone(value, true),
    email: (value) => value ? validateEmail(value) : null,
    lead_source_id: (value) => required(value)
  }
}

export default {
  required,
  validateEmail,
  validatePhone,
  validatePAN,
  validateAadhaar,
  validatePassword,
  validateForm,
  validate,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  VALIDATION_SCHEMAS
}