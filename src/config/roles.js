// src/config/roles.js
import { USER_ROLES, PERMISSIONS } from '@/utils/constants'

/**
 * Role Configuration and Hierarchy Management
 * Defines user roles, permissions, and organizational hierarchy
 */

// Role Definitions with metadata
export const ROLE_DEFINITIONS = {
  [USER_ROLES.SUPERADMIN]: {
    value: 'SUPERADMIN',
    name: 'Super Admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    hierarchyLevel: 1,
    color: 'purple',
    icon: 'Crown',
    canManageRoles: [
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.SALES_MANAGER,
      USER_ROLES.HR,
      USER_ROLES.TL,
      USER_ROLES.SBA,
      USER_ROLES.BA,
    ],
    requirements: {
      branchRequired: false,
      managerRequired: false,
      tlRequired: false,
    },
  },
  [USER_ROLES.BRANCH_MANAGER]: {
    value: 'BRANCH_MANAGER',
    name: 'Branch Manager',
    displayName: 'Branch Manager',
    description: 'Manages a specific branch and its operations',
    hierarchyLevel: 2,
    color: 'blue',
    icon: 'Building',
    canManageRoles: [
      USER_ROLES.SALES_MANAGER,
      USER_ROLES.HR,
      USER_ROLES.TL,
      USER_ROLES.SBA,
      USER_ROLES.BA,
    ],
    requirements: {
      branchRequired: true,
      managerRequired: false,
      tlRequired: false,
    },
    reportsTo: USER_ROLES.SUPERADMIN,
  },
  [USER_ROLES.SALES_MANAGER]: {
    value: 'SALES_MANAGER',
    name: 'Sales Manager',
    displayName: 'Sales Manager',
    description: 'Manages sales teams and lead conversion strategies',
    hierarchyLevel: 3,
    color: 'green',
    icon: 'TrendingUp',
    canManageRoles: [
      USER_ROLES.TL,
      USER_ROLES.SBA,
      USER_ROLES.BA,
    ],
    requirements: {
      branchRequired: true,
      managerRequired: false,
      tlRequired: false,
    },
    reportsTo: USER_ROLES.BRANCH_MANAGER,
  },
  [USER_ROLES.HR]: {
    value: 'HR',
    name: 'HR',
    displayName: 'Human Resources',
    description: 'Manages human resources and employee operations',
    hierarchyLevel: 3,
    color: 'orange',
    icon: 'Users',
    canManageRoles: [],
    requirements: {
      branchRequired: true,
      managerRequired: false,
      tlRequired: false,
    },
    reportsTo: USER_ROLES.BRANCH_MANAGER,
  },
  [USER_ROLES.TL]: {
    value: 'TL',
    name: 'TL',
    displayName: 'Team Leader',
    description: 'Leads a team of business associates',
    hierarchyLevel: 4,
    color: 'indigo',
    icon: 'UserCheck',
    canManageRoles: [
      USER_ROLES.SBA,
      USER_ROLES.BA,
    ],
    requirements: {
      branchRequired: true,
      managerRequired: true, // Requires sales_manager_id
      tlRequired: false,
    },
    reportsTo: USER_ROLES.SALES_MANAGER,
  },
  [USER_ROLES.SBA]: {
    value: 'SBA',
    name: 'SBA',
    displayName: 'Senior Business Associate',
    description: 'Senior sales representative with lead management responsibilities',
    hierarchyLevel: 5,
    color: 'teal',
    icon: 'Star',
    canManageRoles: [],
    requirements: {
      branchRequired: true,
      managerRequired: true, // Requires sales_manager_id
      tlRequired: true,      // Requires tl_id
    },
    reportsTo: USER_ROLES.TL,
  },
  [USER_ROLES.BA]: {
    value: 'BA',
    name: 'BA',
    displayName: 'Business Associate',
    description: 'Entry-level sales representative',
    hierarchyLevel: 6,
    color: 'gray',
    icon: 'User',
    canManageRoles: [],
    requirements: {
      branchRequired: true,
      managerRequired: true, // Requires sales_manager_id
      tlRequired: true,      // Requires tl_id
    },
    reportsTo: USER_ROLES.TL,
  },
}

// Default Permissions by Role
export const DEFAULT_PERMISSIONS = {
  [USER_ROLES.SUPERADMIN]: {
    // User Management
    [PERMISSIONS.ADD_USER]: true,
    [PERMISSIONS.EDIT_USER]: true,
    [PERMISSIONS.DELETE_USER]: true,
    [PERMISSIONS.VIEW_USERS]: true,
    
    // Lead Management
    [PERMISSIONS.ADD_LEAD]: true,
    [PERMISSIONS.EDIT_LEAD]: true,
    [PERMISSIONS.DELETE_LEAD]: true,
    [PERMISSIONS.VIEW_LEAD]: true,
    [PERMISSIONS.FETCH_LEAD]: true,
    
    // View Permissions
    [PERMISSIONS.VIEW_BRANCH]: true,
    [PERMISSIONS.VIEW_ACCOUNTS]: true,
    [PERMISSIONS.VIEW_RESEARCH]: true,
    [PERMISSIONS.VIEW_CLIENT]: true,
    [PERMISSIONS.VIEW_PAYMENT]: true,
    [PERMISSIONS.VIEW_INVOICE]: true,
    [PERMISSIONS.VIEW_KYC]: true,
    
    // Special Permissions
    [PERMISSIONS.APPROVAL]: true,
    [PERMISSIONS.INTERNAL_MAILING]: true,
    [PERMISSIONS.CHATTING]: true,
    [PERMISSIONS.TARGETS]: true,
    [PERMISSIONS.REPORTS]: true,
  },
  
  [USER_ROLES.BRANCH_MANAGER]: {
    // User Management
    [PERMISSIONS.ADD_USER]: true,
    [PERMISSIONS.EDIT_USER]: true,
    [PERMISSIONS.DELETE_USER]: false,
    [PERMISSIONS.VIEW_USERS]: true,
    
    // Lead Management
    [PERMISSIONS.ADD_LEAD]: true,
    [PERMISSIONS.EDIT_LEAD]: true,
    [PERMISSIONS.DELETE_LEAD]: true,
    [PERMISSIONS.VIEW_LEAD]: true,
    [PERMISSIONS.FETCH_LEAD]: true,
    
    // View Permissions
    [PERMISSIONS.VIEW_BRANCH]: true,
    [PERMISSIONS.VIEW_ACCOUNTS]: true,
    [PERMISSIONS.VIEW_RESEARCH]: true,
    [PERMISSIONS.VIEW_CLIENT]: true,
    [PERMISSIONS.VIEW_PAYMENT]: true,
    [PERMISSIONS.VIEW_INVOICE]: true,
    [PERMISSIONS.VIEW_KYC]: true,
    
    // Special Permissions
    [PERMISSIONS.APPROVAL]: true,
    [PERMISSIONS.INTERNAL_MAILING]: true,
    [PERMISSIONS.CHATTING]: true,
    [PERMISSIONS.TARGETS]: true,
    [PERMISSIONS.REPORTS]: true,
  },
  
  [USER_ROLES.SALES_MANAGER]: {
    // User Management
    [PERMISSIONS.ADD_USER]: false,
    [PERMISSIONS.EDIT_USER]: false,
    [PERMISSIONS.DELETE_USER]: false,
    [PERMISSIONS.VIEW_USERS]: true,
    
    // Lead Management
    [PERMISSIONS.ADD_LEAD]: true,
    [PERMISSIONS.EDIT_LEAD]: true,
    [PERMISSIONS.DELETE_LEAD]: false,
    [PERMISSIONS.VIEW_LEAD]: true,
    [PERMISSIONS.FETCH_LEAD]: true,
    
    // View Permissions
    [PERMISSIONS.VIEW_BRANCH]: false,
    [PERMISSIONS.VIEW_ACCOUNTS]: true,
    [PERMISSIONS.VIEW_RESEARCH]: true,
    [PERMISSIONS.VIEW_CLIENT]: true,
    [PERMISSIONS.VIEW_PAYMENT]: true,
    [PERMISSIONS.VIEW_INVOICE]: true,
    [PERMISSIONS.VIEW_KYC]: true,
    
    // Special Permissions
    [PERMISSIONS.APPROVAL]: false,
    [PERMISSIONS.INTERNAL_MAILING]: true,
    [PERMISSIONS.CHATTING]: true,
    [PERMISSIONS.TARGETS]: true,
    [PERMISSIONS.REPORTS]: true,
  },
  
  [USER_ROLES.HR]: {
    // User Management
    [PERMISSIONS.ADD_USER]: true,
    [PERMISSIONS.EDIT_USER]: true,
    [PERMISSIONS.DELETE_USER]: false,
    [PERMISSIONS.VIEW_USERS]: true,
    
    // Lead Management
    [PERMISSIONS.ADD_LEAD]: false,
    [PERMISSIONS.EDIT_LEAD]: false,
    [PERMISSIONS.DELETE_LEAD]: false,
    [PERMISSIONS.VIEW_LEAD]: false,
    [PERMISSIONS.FETCH_LEAD]: false,
    
    // View Permissions
    [PERMISSIONS.VIEW_BRANCH]: true,
    [PERMISSIONS.VIEW_ACCOUNTS]: false,
    [PERMISSIONS.VIEW_RESEARCH]: false,
    [PERMISSIONS.VIEW_CLIENT]: false,
    [PERMISSIONS.VIEW_PAYMENT]: false,
    [PERMISSIONS.VIEW_INVOICE]: false,
    [PERMISSIONS.VIEW_KYC]: false,
    
    // Special Permissions
    [PERMISSIONS.APPROVAL]: false,
    [PERMISSIONS.INTERNAL_MAILING]: true,
    [PERMISSIONS.CHATTING]: true,
    [PERMISSIONS.TARGETS]: false,
    [PERMISSIONS.REPORTS]: true,
  },
  
  [USER_ROLES.TL]: {
    // User Management
    [PERMISSIONS.ADD_USER]: false,
    [PERMISSIONS.EDIT_USER]: false,
    [PERMISSIONS.DELETE_USER]: false,
    [PERMISSIONS.VIEW_USERS]: true,
    
    // Lead Management
    [PERMISSIONS.ADD_LEAD]: true,
    [PERMISSIONS.EDIT_LEAD]: true,
    [PERMISSIONS.DELETE_LEAD]: false,
    [PERMISSIONS.VIEW_LEAD]: true,
    [PERMISSIONS.FETCH_LEAD]: true,
    
    // View Permissions
    [PERMISSIONS.VIEW_BRANCH]: false,
    [PERMISSIONS.VIEW_ACCOUNTS]: true,
    [PERMISSIONS.VIEW_RESEARCH]: true,
    [PERMISSIONS.VIEW_CLIENT]: true,
    [PERMISSIONS.VIEW_PAYMENT]: true,
    [PERMISSIONS.VIEW_INVOICE]: true,
    [PERMISSIONS.VIEW_KYC]: true,
    
    // Special Permissions
    [PERMISSIONS.APPROVAL]: false,
    [PERMISSIONS.INTERNAL_MAILING]: true,
    [PERMISSIONS.CHATTING]: true,
    [PERMISSIONS.TARGETS]: true,
    [PERMISSIONS.REPORTS]: true,
  },
  
  [USER_ROLES.SBA]: {
    // User Management
    [PERMISSIONS.ADD_USER]: false,
    [PERMISSIONS.EDIT_USER]: false,
    [PERMISSIONS.DELETE_USER]: false,
    [PERMISSIONS.VIEW_USERS]: false,
    
    // Lead Management
    [PERMISSIONS.ADD_LEAD]: true,
    [PERMISSIONS.EDIT_LEAD]: true,
    [PERMISSIONS.DELETE_LEAD]: false,
    [PERMISSIONS.VIEW_LEAD]: true,
    [PERMISSIONS.FETCH_LEAD]: true,
    
    // View Permissions
    [PERMISSIONS.VIEW_BRANCH]: false,
    [PERMISSIONS.VIEW_ACCOUNTS]: true,
    [PERMISSIONS.VIEW_RESEARCH]: true,
    [PERMISSIONS.VIEW_CLIENT]: true,
    [PERMISSIONS.VIEW_PAYMENT]: true,
    [PERMISSIONS.VIEW_INVOICE]: true,
    [PERMISSIONS.VIEW_KYC]: true,
    
    // Special Permissions
    [PERMISSIONS.APPROVAL]: false,
    [PERMISSIONS.INTERNAL_MAILING]: false,
    [PERMISSIONS.CHATTING]: true,
    [PERMISSIONS.TARGETS]: false,
    [PERMISSIONS.REPORTS]: false,
  },
  
  [USER_ROLES.BA]: {
    // User Management
    [PERMISSIONS.ADD_USER]: false,
    [PERMISSIONS.EDIT_USER]: false,
    [PERMISSIONS.DELETE_USER]: false,
    [PERMISSIONS.VIEW_USERS]: false,
    
    // Lead Management
    [PERMISSIONS.ADD_LEAD]: true,
    [PERMISSIONS.EDIT_LEAD]: true,
    [PERMISSIONS.DELETE_LEAD]: false,
    [PERMISSIONS.VIEW_LEAD]: true,
    [PERMISSIONS.FETCH_LEAD]: true,
    
    // View Permissions
    [PERMISSIONS.VIEW_BRANCH]: false,
    [PERMISSIONS.VIEW_ACCOUNTS]: true,
    [PERMISSIONS.VIEW_RESEARCH]: true,
    [PERMISSIONS.VIEW_CLIENT]: true,
    [PERMISSIONS.VIEW_PAYMENT]: true,
    [PERMISSIONS.VIEW_INVOICE]: true,
    [PERMISSIONS.VIEW_KYC]: true,
    
    // Special Permissions
    [PERMISSIONS.APPROVAL]: false,
    [PERMISSIONS.INTERNAL_MAILING]: false,
    [PERMISSIONS.CHATTING]: true,
    [PERMISSIONS.TARGETS]: false,
    [PERMISSIONS.REPORTS]: false,
  },
}

// Role Hierarchy Utilities
export class RoleHierarchy {
  /**
   * Get hierarchy level for a role
   * @param {string} role - User role
   * @returns {number} Hierarchy level (1 = highest)
   */
  static getHierarchyLevel(role) {
    return ROLE_DEFINITIONS[role]?.hierarchyLevel || 999
  }
  
  /**
   * Check if user can manage another user based on role hierarchy
   * @param {string} managerRole - Manager's role
   * @param {string} userRole - User's role
   * @returns {boolean} Can manage
   */
  static canManage(managerRole, userRole) {
    const managerLevel = this.getHierarchyLevel(managerRole)
    const userLevel = this.getHierarchyLevel(userRole)
    return managerLevel < userLevel
  }
  
  /**
   * Get roles that a user can manage
   * @param {string} role - User role
   * @returns {string[]} Array of manageable roles
   */
  static getManageableRoles(role) {
    return ROLE_DEFINITIONS[role]?.canManageRoles || []
  }
  
  /**
   * Get the required manager role for a user role
   * @param {string} role - User role
   * @returns {string|null} Required manager role
   */
  static getRequiredManagerRole(role) {
    return ROLE_DEFINITIONS[role]?.reportsTo || null
  }
  
  /**
   * Get all roles in hierarchy order
   * @returns {string[]} Roles ordered by hierarchy
   */
  static getAllRolesByHierarchy() {
    return Object.keys(ROLE_DEFINITIONS).sort((a, b) => 
      this.getHierarchyLevel(a) - this.getHierarchyLevel(b)
    )
  }
  
  /**
   * Get subordinate roles for a given role
   * @param {string} role - User role
   * @returns {string[]} Array of subordinate roles
   */
  static getSubordinateRoles(role) {
    const currentLevel = this.getHierarchyLevel(role)
    return Object.keys(ROLE_DEFINITIONS).filter(r => 
      this.getHierarchyLevel(r) > currentLevel
    )
  }
}

// Permission Utilities
export class PermissionManager {
  /**
   * Check if a role has a specific permission
   * @param {string} role - User role
   * @param {string} permission - Permission to check
   * @returns {boolean} Has permission
   */
  static hasPermission(role, permission) {
    return DEFAULT_PERMISSIONS[role]?.[permission] || false
  }
  
  /**
   * Get all permissions for a role
   * @param {string} role - User role
   * @returns {Object} Permission object
   */
  static getRolePermissions(role) {
    return DEFAULT_PERMISSIONS[role] || {}
  }
  
  /**
   * Check if user has any of the specified permissions
   * @param {string} role - User role
   * @param {string[]} permissions - Array of permissions to check
   * @returns {boolean} Has any permission
   */
  static hasAnyPermission(role, permissions) {
    return permissions.some(permission => this.hasPermission(role, permission))
  }
  
  /**
   * Check if user has all specified permissions
   * @param {string} role - User role
   * @param {string[]} permissions - Array of permissions to check
   * @returns {boolean} Has all permissions
   */
  static hasAllPermissions(role, permissions) {
    return permissions.every(permission => this.hasPermission(role, permission))
  }
  
  /**
   * Get permissions that are enabled for a role
   * @param {string} role - User role
   * @returns {string[]} Array of enabled permissions
   */
  static getEnabledPermissions(role) {
    const rolePermissions = this.getRolePermissions(role)
    return Object.keys(rolePermissions).filter(permission => 
      rolePermissions[permission]
    )
  }
}

// Role Requirements Validation
export class RoleValidator {
  /**
   * Validate role requirements for user creation/update
   * @param {string} role - User role
   * @param {Object} userData - User data
   * @returns {Object} Validation result
   */
  static validateRoleRequirements(role, userData) {
    const definition = ROLE_DEFINITIONS[role]
    if (!definition) {
      return { valid: false, errors: ['Invalid role'] }
    }
    
    const errors = []
    const requirements = definition.requirements
    
    // Check branch requirement
    if (requirements.branchRequired && !userData.branch_id) {
      errors.push('Branch is required for this role')
    }
    
    // Check manager requirement
    if (requirements.managerRequired && !userData.sales_manager_id) {
      errors.push('Sales Manager is required for this role')
    }
    
    // Check team leader requirement
    if (requirements.tlRequired && !userData.tl_id) {
      errors.push('Team Leader is required for this role')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Check if a user can create another user with specified role
   * @param {string} creatorRole - Creator's role
   * @param {string} targetRole - Target user's role
   * @returns {boolean} Can create
   */
  static canCreateRole(creatorRole, targetRole) {
    const manageableRoles = RoleHierarchy.getManageableRoles(creatorRole)
    return manageableRoles.includes(targetRole)
  }
}

// Navigation/Menu Utilities
export class NavigationHelper {
  /**
   * Filter navigation items based on user permissions
   * @param {Object[]} navigationItems - Navigation items
   * @param {string} userRole - User role
   * @returns {Object[]} Filtered navigation items
   */
  static filterNavigationByRole(navigationItems, userRole) {
    return navigationItems.filter(item => {
      if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
        return true
      }
      return PermissionManager.hasAnyPermission(userRole, item.requiredPermissions)
    })
  }
  
  /**
   * Check if user can access a specific route
   * @param {string} route - Route path
   * @param {string} userRole - User role
   * @param {Object} routePermissions - Route to permissions mapping
   * @returns {boolean} Can access
   */
  static canAccessRoute(route, userRole, routePermissions = {}) {
    const requiredPermissions = routePermissions[route]
    if (!requiredPermissions) return true
    
    return PermissionManager.hasAnyPermission(userRole, requiredPermissions)
  }
}

// Export utilities as default
export default {
  ROLE_DEFINITIONS,
  DEFAULT_PERMISSIONS,
  RoleHierarchy,
  PermissionManager,
  RoleValidator,
  NavigationHelper,
}

// Helper functions for common operations
export const getRoleDisplayName = (role) => ROLE_DEFINITIONS[role]?.displayName || role
export const getRoleColor = (role) => ROLE_DEFINITIONS[role]?.color || 'gray'
export const getRoleIcon = (role) => ROLE_DEFINITIONS[role]?.icon || 'User'
export const getRoleDescription = (role) => ROLE_DEFINITIONS[role]?.description || ''

// Get available roles for a specific user role
export const getAvailableRoles = (currentUserRole) => {
  if (!currentUserRole) return []
  
  const manageableRoles = RoleHierarchy.getManageableRoles(currentUserRole)
  return manageableRoles.map(role => ({
    value: role,
    name: getRoleDisplayName(role),
    description: getRoleDescription(role),
    hierarchyLevel: RoleHierarchy.getHierarchyLevel(role),
  }))
}

// Get role options for select components
export const getRoleOptions = (currentUserRole = null) => {
  const roles = currentUserRole 
    ? getAvailableRoles(currentUserRole)
    : Object.values(ROLE_DEFINITIONS).map(def => ({
        value: def.value,
        name: def.displayName,
        description: def.description,
        hierarchyLevel: def.hierarchyLevel,
      }))
  
  return roles.sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)
}