// src/config/api.js
import { API_CONFIG, API_ENDPOINTS } from '@/utils/constants'

/**
 * API Configuration for the CRM application
 * Centralizes all API-related configuration and utilities
 */

// Environment Configuration
export const ENV = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
}

// API Base Configuration
export const API_BASE_CONFIG = {
  // Primary API URL - defaults to local development server
  baseURL: "http://127.0.0.1:8000",
  
  // API version prefix
  apiVersion: API_CONFIG.API_VERSION,
  
  // Request timeout in milliseconds
  timeout: API_CONFIG.TIMEOUT,
  
  // Retry configuration
  retryAttempts: API_CONFIG.RETRY_ATTEMPTS,
  retryDelay: API_CONFIG.RETRY_DELAY,
  
  // Headers
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  },
  
  // Multipart form headers (for file uploads)
  multipartHeaders: {
    'Content-Type': 'multipart/form-data',
    'Accept': 'application/json',
  },
}

// API Endpoints with full URLs
export const API_URLS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.AUTH.LOGIN}`,
    LOGIN_JSON: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}/login/json`,
    REGISTER: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.AUTH.REGISTER}`,
    LOGOUT: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.AUTH.LOGOUT}`,
    REFRESH: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.AUTH.REFRESH}`,
    VERIFY: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.AUTH.VERIFY}`,
  },
  
  // User management endpoints
  USERS: {
    BASE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.USERS.BASE}`,
    LIST: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.USERS.BASE}`,
    CREATE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.USERS.BASE}`,
    BY_ID: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.USERS.BY_ID(id)}`,
    UPDATE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.USERS.BY_ID(id)}`,
    DELETE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.USERS.BY_ID(id)}`,
    PROFILE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.USERS.PROFILE}`,
    CHANGE_PASSWORD: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.USERS.CHANGE_PASSWORD}`,
  },
  
  // Branch management endpoints
  BRANCHES: {
    BASE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.BRANCHES.BASE}`,
    LIST: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.BRANCHES.BASE}`,
    CREATE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.BRANCHES.BASE}`,
    BY_ID: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.BRANCHES.BY_ID(id)}`,
    UPDATE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.BRANCHES.BY_ID(id)}`,
    DELETE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.BRANCHES.BY_ID(id)}`,
    USERS: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.BRANCHES.USERS(id)}`,
  },
  
  // Lead management endpoints
  LEADS: {
    BASE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.BASE}`,
    LIST: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.BASE}`,
    CREATE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.BASE}`,
    BY_ID: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.BY_ID(id)}`,
    UPDATE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.BY_ID(id)}`,
    DELETE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.BY_ID(id)}`,
    SOURCES: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.SOURCES}`,
    RESPONSES: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.RESPONSES}`,
    ASSIGN: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.ASSIGN}`,
    BULK_ASSIGN: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.BULK_ASSIGN}`,
    FETCH_CONFIG: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.LEADS.FETCH_CONFIG}`,
    BULK_UPLOAD: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}/leads/bulk-upload`,
    EXPORT: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}/leads/export`,
  },
  
  // Permission management endpoints
  PERMISSIONS: {
    BASE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PERMISSIONS.BASE}`,
    LIST: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PERMISSIONS.BASE}`,
    BY_USER: (userId) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PERMISSIONS.BY_USER(userId)}`,
    UPDATE_USER: (userId) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PERMISSIONS.BY_USER(userId)}`,
    TOGGLE: (userId, permission) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PERMISSIONS.TOGGLE(userId, permission)}`,
    RESET_DEFAULTS: (userId) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PERMISSIONS.RESET_DEFAULTS(userId)}`,
  },
  
  // Service management endpoints
  SERVICES: {
    BASE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.SERVICES.BASE}`,
    LIST: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.SERVICES.BASE}`,
    CREATE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.SERVICES.BASE}`,
    BY_ID: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.SERVICES.BY_ID(id)}`,
    UPDATE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.SERVICES.BY_ID(id)}`,
    DELETE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.SERVICES.BY_ID(id)}`,
  },
  
  // Payment endpoints (Cashfree integration)
  PAYMENTS: {
    BASE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PAYMENTS.BASE}`,
    LIST: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PAYMENTS.BASE}`,
    CREATE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PAYMENTS.BASE}`,
    BY_ID: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.PAYMENTS.BY_ID(id)}`,
    CASHFREE_ORDERS: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}/payment/orders`,
    CASHFREE_ORDER_STATUS: (orderId) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}/payment/orders/${orderId}`,
    CASHFREE_WEBHOOK: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}/payment/webhook`,
  },
  
  // KYC endpoints
  KYC: {
    BASE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.KYC.BASE}`,
    LIST: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.KYC.BASE}`,
    CREATE: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.KYC.BASE}`,
    BY_ID: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.KYC.BY_ID(id)}`,
    UPDATE: (id) => `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.KYC.BY_ID(id)}`,
    PAN_VERIFICATION: `${API_BASE_CONFIG.baseURL}${API_BASE_CONFIG.apiVersion}${API_ENDPOINTS.KYC.PAN_VERIFICATION}`,
  },
  
  // Health and system endpoints
  SYSTEM: {
    HEALTH: `${API_BASE_CONFIG.baseURL}/health`,
    ROOT: `${API_BASE_CONFIG.baseURL}/`,
    DOCS: `${API_BASE_CONFIG.baseURL}/docs`,
  },
}

// Request Configuration Presets
export const REQUEST_CONFIGS = {
  // Standard JSON request
  json: {
    headers: API_BASE_CONFIG.defaultHeaders,
    timeout: API_BASE_CONFIG.timeout,
  },
  
  // File upload request
  upload: {
    headers: {
      // Don't set Content-Type for multipart, let browser set it with boundary
      'Accept': 'application/json',
    },
    timeout: 60000, // Extended timeout for file uploads
  },
  
  // Download request
  download: {
    headers: {
      'Accept': 'application/octet-stream, application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    responseType: 'blob',
    timeout: 120000, // Extended timeout for downloads
  },
  
  // Long polling request
  longPoll: {
    headers: API_BASE_CONFIG.defaultHeaders,
    timeout: 300000, // 5 minutes for long polling
  },
}

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
}

// Error Types
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

// Request Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
}

// Authentication Configuration
export const AUTH_CONFIG = {
  // Token storage keys
  tokenKey: 'auth_token',
  refreshTokenKey: 'refresh_token',
  userKey: 'user_profile',
  
  // Token types
  tokenType: 'Bearer',
  
  // Token expiry buffer (refresh 5 minutes before expiry)
  expiryBuffer: 5 * 60 * 1000,
  
  // Login redirect paths
  loginPath: '/login',
  defaultRedirectPath: '/dashboard',
  
  // Protected routes that require authentication
  protectedRoutes: [
    '/dashboard',
    '/profile',
    '/settings',
  ],
  
  // Public routes that don't require authentication
  publicRoutes: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
}

// Pagination Configuration
export const PAGINATION_CONFIG = {
  defaultPage: 1,
  defaultLimit: 10,
  maxLimit: 100,
  pageSizeOptions: [5, 10, 25, 50, 100],
}

// Cache Configuration
export const CACHE_CONFIG = {
  // Cache duration in milliseconds
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  longTTL: 30 * 60 * 1000,   // 30 minutes
  shortTTL: 1 * 60 * 1000,   // 1 minute
  
  // Cache keys
  keys: {
    user: 'user_cache',
    branches: 'branches_cache',
    permissions: 'permissions_cache',
    leadSources: 'lead_sources_cache',
  },
}

// File Upload Configuration
export const UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  endpoints: {
    avatar: API_URLS.USERS.BASE + '/avatar',
    documents: API_URLS.USERS.BASE + '/documents',
    leadBulkUpload: API_URLS.LEADS.BULK_UPLOAD,
  },
}

// WebSocket Configuration (if needed in future)
export const WEBSOCKET_CONFIG = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws',
  reconnectAttempts: 5,
  reconnectDelay: 3000,
  pingInterval: 30000,
}

// Export default configuration object
export default {
  api: API_BASE_CONFIG,
  urls: API_URLS,
  requests: REQUEST_CONFIGS,
  status: HTTP_STATUS,
  errors: ERROR_TYPES,
  methods: HTTP_METHODS,
  auth: AUTH_CONFIG,
  pagination: PAGINATION_CONFIG,
  cache: CACHE_CONFIG,
  upload: UPLOAD_CONFIG,
  websocket: WEBSOCKET_CONFIG,
  env: ENV,
}

// Utility functions for API configuration
export const buildApiUrl = (endpoint, params = {}) => {
  let url = endpoint
  
  // Replace path parameters
  Object.keys(params).forEach(key => {
    if (url.includes(`:${key}`)) {
      url = url.replace(`:${key}`, params[key])
      delete params[key]
    }
  })
  
  // Add query parameters
  const searchParams = new URLSearchParams()
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      searchParams.append(key, params[key])
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `${url}?${queryString}` : url
}

// Get authorization header with token
export const getAuthHeader = (token) => ({
  Authorization: `${AUTH_CONFIG.tokenType} ${token}`,
})

// Check if response status indicates success
export const isSuccessStatus = (status) => {
  return status >= 200 && status < 300
}

// Check if response status indicates client error
export const isClientError = (status) => {
  return status >= 400 && status < 500
}

// Check if response status indicates server error
export const isServerError = (status) => {
  return status >= 500 && status < 600
}

// Format error response
export const formatErrorResponse = (error) => {
  if (!error.response) {
    return {
      type: ERROR_TYPES.NETWORK_ERROR,
      message: 'Network error occurred',
      status: null,
    }
  }
  
  const { status, data } = error.response
  
  let type = ERROR_TYPES.UNKNOWN_ERROR
  if (status === HTTP_STATUS.UNAUTHORIZED) {
    type = ERROR_TYPES.AUTHENTICATION_ERROR
  } else if (status === HTTP_STATUS.FORBIDDEN) {
    type = ERROR_TYPES.AUTHORIZATION_ERROR
  } else if (status === HTTP_STATUS.NOT_FOUND) {
    type = ERROR_TYPES.NOT_FOUND_ERROR
  } else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
    type = ERROR_TYPES.VALIDATION_ERROR
  } else if (isServerError(status)) {
    type = ERROR_TYPES.SERVER_ERROR
  }
  
  return {
    type,
    message: data?.detail || data?.message || 'An error occurred',
    status,
    data: data || null,
  }
}