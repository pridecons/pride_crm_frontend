// API Configuration
export const API_CONFIG = {
  BASE_URL: "http://127.0.0.1:8000",
  API_VERSION: '/api/v1',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
}

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/register',
    LOGOUT: '/logout',
    REFRESH: '/refresh',
    VERIFY: '/verify',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
    PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    RESET_PASSWORD: '/users/reset-password',
  },
  BRANCHES: {
    BASE: '/branches',
    BY_ID: (id) => `/branches/${id}`,
    USERS: (id) => `/branches/${id}/users`,
  },
  LEADS: {
    BASE: '/leads',
    BY_ID: (id) => `/leads/${id}`,
    SOURCES: '/lead-sources',
    RESPONSES: '/lead-responses',
    ASSIGN: '/leads/assign',
    BULK_ASSIGN: '/leads/bulk-assign',
    FETCH_CONFIG: '/leads/fetch-config',
  },
  PERMISSIONS: {
    BASE: '/permissions',
    BY_USER: (userId) => `/permissions/user/${userId}`,
    TOGGLE: (userId, permission) => `/permissions/user/${userId}/toggle/${permission}`,
    RESET_DEFAULTS: (userId) => `/permissions/user/${userId}/reset-defaults`,
  },
  SERVICES: {
    BASE: '/services',
    BY_ID: (id) => `/services/${id}`,
  },
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: (id) => `/payments/${id}`,
    CASHFREE: '/payments/cashfree',
  },
  KYC: {
    BASE: '/kyc',
    BY_ID: (id) => `/kyc/${id}`,
    PAN_VERIFICATION: '/pan-verification',
  },
}

// User Roles
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  BRANCH_MANAGER: 'branch_manager',
  SALES_MANAGER: 'sales_manager',
  HR: 'hr',
  TL: 'tl',
  SBA: 'sba',
  BA: 'ba',
}

// Role Display Names
export const ROLE_DISPLAY_NAMES = {
  [USER_ROLES.SUPERADMIN]: 'Super Admin',
  [USER_ROLES.BRANCH_MANAGER]: 'Branch Manager',
  [USER_ROLES.SALES_MANAGER]: 'Sales Manager',
  [USER_ROLES.HR]: 'HR',
  [USER_ROLES.TL]: 'Team Leader',
  [USER_ROLES.SBA]: 'Senior Business Associate',
  [USER_ROLES.BA]: 'Business Associate',
}

// Permissions
export const PERMISSIONS = {
  // User Management
  ADD_USER: 'add_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  
  // Lead Management
  ADD_LEAD: 'add_lead',
  EDIT_LEAD: 'edit_lead',
  DELETE_LEAD: 'delete_lead',
  
  // View Permissions
  VIEW_USERS: 'view_users',
  VIEW_LEAD: 'view_lead',
  VIEW_BRANCH: 'view_branch',
  VIEW_ACCOUNTS: 'view_accounts',
  VIEW_RESEARCH: 'view_research',
  VIEW_CLIENT: 'view_client',
  VIEW_PAYMENT: 'view_payment',
  VIEW_INVOICE: 'view_invoice',
  VIEW_KYC: 'view_kyc',
  
  // Special Permissions
  APPROVAL: 'approval',
  INTERNAL_MAILING: 'internal_mailing',
  CHATTING: 'chatting',
  TARGETS: 'targets',
  REPORTS: 'reports',
  FETCH_LEAD: 'fetch_lead',
}

// Permission Categories for UI grouping
export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: {
    title: 'User Management',
    permissions: [
      PERMISSIONS.ADD_USER,
      PERMISSIONS.EDIT_USER,
      PERMISSIONS.DELETE_USER,
      PERMISSIONS.VIEW_USERS,
    ],
  },
  LEAD_MANAGEMENT: {
    title: 'Lead Management',
    permissions: [
      PERMISSIONS.ADD_LEAD,
      PERMISSIONS.EDIT_LEAD,
      PERMISSIONS.DELETE_LEAD,
      PERMISSIONS.VIEW_LEAD,
      PERMISSIONS.FETCH_LEAD,
    ],
  },
  VIEW_PERMISSIONS: {
    title: 'View Access',
    permissions: [
      PERMISSIONS.VIEW_BRANCH,
      PERMISSIONS.VIEW_ACCOUNTS,
      PERMISSIONS.VIEW_RESEARCH,
      PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.VIEW_PAYMENT,
      PERMISSIONS.VIEW_INVOICE,
      PERMISSIONS.VIEW_KYC,
    ],
  },
  SPECIAL_FEATURES: {
    title: 'Special Features',
    permissions: [
      PERMISSIONS.APPROVAL,
      PERMISSIONS.INTERNAL_MAILING,
      PERMISSIONS.CHATTING,
      PERMISSIONS.TARGETS,
      PERMISSIONS.REPORTS,
    ],
  },
}

// Lead Statuses
export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
  FOLLOW_UP: 'follow_up',
  NOT_INTERESTED: 'not_interested',
}

// Lead Status Display Names
export const LEAD_STATUS_DISPLAY = {
  [LEAD_STATUS.NEW]: 'New',
  [LEAD_STATUS.CONTACTED]: 'Contacted',
  [LEAD_STATUS.QUALIFIED]: 'Qualified',
  [LEAD_STATUS.PROPOSAL]: 'Proposal Sent',
  [LEAD_STATUS.NEGOTIATION]: 'In Negotiation',
  [LEAD_STATUS.CLOSED_WON]: 'Closed Won',
  [LEAD_STATUS.CLOSED_LOST]: 'Closed Lost',
  [LEAD_STATUS.FOLLOW_UP]: 'Follow Up',
  [LEAD_STATUS.NOT_INTERESTED]: 'Not Interested',
}

// Lead Status Colors for UI
export const LEAD_STATUS_COLORS = {
  [LEAD_STATUS.NEW]: 'bg-blue-100 text-blue-800',
  [LEAD_STATUS.CONTACTED]: 'bg-yellow-100 text-yellow-800',
  [LEAD_STATUS.QUALIFIED]: 'bg-purple-100 text-purple-800',
  [LEAD_STATUS.PROPOSAL]: 'bg-orange-100 text-orange-800',
  [LEAD_STATUS.NEGOTIATION]: 'bg-indigo-100 text-indigo-800',
  [LEAD_STATUS.CLOSED_WON]: 'bg-green-100 text-green-800',
  [LEAD_STATUS.CLOSED_LOST]: 'bg-red-100 text-red-800',
  [LEAD_STATUS.FOLLOW_UP]: 'bg-gray-100 text-gray-800',
  [LEAD_STATUS.NOT_INTERESTED]: 'bg-red-100 text-red-800',
}

// Lead Sources
export const LEAD_SOURCES = {
  WEBSITE: 'website',
  SOCIAL_MEDIA: 'social_media',
  EMAIL_CAMPAIGN: 'email_campaign',
  REFERRAL: 'referral',
  COLD_CALL: 'cold_call',
  ADVERTISEMENT: 'advertisement',
  TRADE_SHOW: 'trade_show',
  PARTNER: 'partner',
  OTHER: 'other',
}

// Lead Priorities
export const LEAD_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

// Lead Priority Colors
export const LEAD_PRIORITY_COLORS = {
  [LEAD_PRIORITIES.HIGH]: 'bg-red-100 text-red-800',
  [LEAD_PRIORITIES.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [LEAD_PRIORITIES.LOW]: 'bg-green-100 text-green-800',
}

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
}

// KYC Status
export const KYC_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
}

// Navigation Menu Items
export const NAVIGATION_ITEMS = {
  DASHBOARD: {
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'Home',
    requiredPermissions: [],
  },
  USERS: {
    name: 'Users',
    href: '/dashboard/users',
    icon: 'Users',
    requiredPermissions: [PERMISSIONS.VIEW_USERS],
  },
  LEADS: {
    name: 'Leads',
    href: '/dashboard/leads',
    icon: 'Target',
    requiredPermissions: [PERMISSIONS.VIEW_LEAD],
  },
  BRANCHES: {
    name: 'Branches',
    href: '/dashboard/branches',
    icon: 'Building',
    requiredPermissions: [PERMISSIONS.VIEW_BRANCH],
  },
  ACCOUNTS: {
    name: 'Accounts',
    href: '/dashboard/accounts',
    icon: 'CreditCard',
    requiredPermissions: [PERMISSIONS.VIEW_ACCOUNTS],
  },
  RESEARCH: {
    name: 'Research',
    href: '/dashboard/research',
    icon: 'Search',
    requiredPermissions: [PERMISSIONS.VIEW_RESEARCH],
  },
  CLIENTS: {
    name: 'Clients',
    href: '/dashboard/clients',
    icon: 'Users',
    requiredPermissions: [PERMISSIONS.VIEW_CLIENT],
  },
  PAYMENTS: {
    name: 'Payments',
    href: '/dashboard/payments',
    icon: 'DollarSign',
    requiredPermissions: [PERMISSIONS.VIEW_PAYMENT],
  },
  INVOICES: {
    name: 'Invoices',
    href: '/dashboard/invoices',
    icon: 'FileText',
    requiredPermissions: [PERMISSIONS.VIEW_INVOICE],
  },
  KYC: {
    name: 'KYC',
    href: '/dashboard/kyc',
    icon: 'Shield',
    requiredPermissions: [PERMISSIONS.VIEW_KYC],
  },
  REPORTS: {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: 'BarChart',
    requiredPermissions: [PERMISSIONS.REPORTS],
  },
  CONFIGURATION: {
    name: 'Configuration',
    href: '/dashboard/configuration',
    icon: 'Settings',
    requiredPermissions: [PERMISSIONS.APPROVAL],
  },
}

// Table Configuration
export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
}

// Form Validation
export const VALIDATION_RULES = {
  REQUIRED: 'This field is required',
  EMAIL: 'Please enter a valid email address',
  PHONE: 'Please enter a valid phone number',
  MIN_LENGTH: (length) => `Minimum ${length} characters required`,
  MAX_LENGTH: (length) => `Maximum ${length} characters allowed`,
  NUMERIC: 'Please enter a valid number',
  POSITIVE_NUMBER: 'Please enter a positive number',
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    MESSAGE: 'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
  },
  PAN: {
    PATTERN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    MESSAGE: 'Please enter a valid PAN number (e.g., ABCDE1234F)',
  },
  AADHAAR: {
    PATTERN: /^[0-9]{12}$/,
    MESSAGE: 'Please enter a valid 12-digit Aadhaar number',
  },
  PINCODE: {
    PATTERN: /^[0-9]{6}$/,
    MESSAGE: 'Please enter a valid 6-digit pincode',
  },
}

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy HH:mm',
  TIME: 'HH:mm',
  FULL: 'EEEE, MMMM dd, yyyy',
}

// File Upload Configuration
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    EXCEL: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ALL: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
}

// Toast Notification Configuration
export const TOAST_CONFIG = {
  DURATION: 5000,
  POSITION: 'top-right',
  STYLE: {
    SUCCESS: 'bg-green-500 text-white',
    ERROR: 'bg-red-500 text-white',
    WARNING: 'bg-yellow-500 text-white',
    INFO: 'bg-blue-500 text-white',
  },
}

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PROFILE: 'user_profile',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  TABLE_SETTINGS: 'table_settings',
}

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
}

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful!',
  LOGOUT: 'Logged out successfully',
  SAVE: 'Data saved successfully',
  UPDATE: 'Updated successfully',
  DELETE: 'Deleted successfully',
  CREATE: 'Created successfully',
  UPLOAD: 'File uploaded successfully',
}

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_CHAT: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_EXPORT: true,
  ENABLE_BULK_ACTIONS: true,
  ENABLE_ADVANCED_FILTERS: true,
}

// Theme Configuration
export const THEME = {
  COLORS: {
    PRIMARY: 'blue',
    SECONDARY: 'gray',
    SUCCESS: 'green',
    WARNING: 'yellow',
    ERROR: 'red',
    INFO: 'blue',
  },
  SIDEBAR_WIDTH: '256px',
  HEADER_HEIGHT: '64px',
  BORDER_RADIUS: '8px',
}

// Default Values
export const DEFAULT_VALUES = {
  PAGINATION: {
    PAGE: 1,
    LIMIT: 10,
  },
  LEAD_PRIORITY: LEAD_PRIORITIES.MEDIUM,
  LEAD_STATUS: LEAD_STATUS.NEW,
  USER_ACTIVE: true,
  ASSIGNMENT_TTL_HOURS: 24,
  PER_REQUEST_LIMIT: 10,
  DAILY_CALL_LIMIT: 50,
}

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[\d\s\-()]{10,15}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  AADHAAR: /^[0-9]{12}$/,
  PINCODE: /^[0-9]{6}$/,
  EMPLOYEE_CODE: /^EMP\d{3}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
  NUMERIC: /^[0-9]+$/,
}