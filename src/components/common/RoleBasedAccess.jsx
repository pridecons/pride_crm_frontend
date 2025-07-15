'use client'
import { useAuth } from '@/context/AuthContext'

/**
 * RoleBasedAccess Component
 * Conditionally renders content based on user roles and permissions
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if access is granted
 * @param {string[]} props.allowedRoles - Array of roles that can access this content
 * @param {string[]} props.requiredPermissions - Array of permissions required
 * @param {React.ReactNode} props.fallback - Content to render if access is denied
 * @param {string} props.mode - Access mode: 'any' (default) or 'all' for permissions
 * @param {boolean} props.hideIfDenied - Hide completely if access denied (default: true)
 * @param {function} props.renderDenied - Custom render function for denied access
 */
export default function RoleBasedAccess({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  fallback = null,
  mode = 'any',
  hideIfDenied = true,
  renderDenied = null
}) {
  const { user, hasRole, hasPermission, isAuthenticated } = useAuth()

  // Not authenticated - hide content
  if (!isAuthenticated || !user) {
    return hideIfDenied ? null : (fallback || null)
  }

  // Check role-based access
  let hasRoleAccess = true
  if (allowedRoles.length > 0) {
    hasRoleAccess = hasRole(allowedRoles)
  }

  // Check permission-based access
  let hasPermissionAccess = true
  if (requiredPermissions.length > 0) {
    if (mode === 'all') {
      // User must have ALL specified permissions
      hasPermissionAccess = requiredPermissions.every(permission => 
        hasPermission(permission)
      )
    } else {
      // User must have ANY of the specified permissions
      hasPermissionAccess = requiredPermissions.some(permission => 
        hasPermission(permission)
      )
    }
  }

  // Determine final access
  const hasAccess = hasRoleAccess && hasPermissionAccess

  // Render content based on access
  if (hasAccess) {
    return children
  }

  // Access denied - render fallback or custom denied content
  if (renderDenied) {
    return renderDenied({ 
      user, 
      hasRoleAccess, 
      hasPermissionAccess, 
      allowedRoles, 
      requiredPermissions 
    })
  }

  if (hideIfDenied) {
    return null
  }

  return fallback
}

/**
 * RoleGuard Component
 * Simple role-based conditional rendering
 */
export function RoleGuard({ roles, children, fallback = null, hideIfDenied = true }) {
  return (
    <RoleBasedAccess 
      allowedRoles={Array.isArray(roles) ? roles : [roles]}
      fallback={fallback}
      hideIfDenied={hideIfDenied}
    >
      {children}
    </RoleBasedAccess>
  )
}

/**
 * PermissionGuard Component
 * Simple permission-based conditional rendering
 */
export function PermissionGuard({ 
  permissions, 
  children, 
  fallback = null, 
  hideIfDenied = true,
  mode = 'any' 
}) {
  return (
    <RoleBasedAccess 
      requiredPermissions={Array.isArray(permissions) ? permissions : [permissions]}
      fallback={fallback}
      hideIfDenied={hideIfDenied}
      mode={mode}
    >
      {children}
    </RoleBasedAccess>
  )
}

/**
 * AdminOnly Component
 * Only renders for SUPERADMIN role
 */
export function AdminOnly({ children, fallback = null, hideIfDenied = true }) {
  return (
    <RoleGuard 
      roles={['SUPERADMIN']} 
      fallback={fallback}
      hideIfDenied={hideIfDenied}
    >
      {children}
    </RoleGuard>
  )
}

/**
 * ManagerOnly Component
 * Only renders for management roles
 */
export function ManagerOnly({ children, fallback = null, hideIfDenied = true }) {
  return (
    <RoleGuard 
      roles={['SUPERADMIN', 'BRANCH_MANAGER', 'SALES_MANAGER']} 
      fallback={fallback}
      hideIfDenied={hideIfDenied}
    >
      {children}
    </RoleGuard>
  )
}

/**
 * SalesTeamOnly Component
 * Only renders for sales team members
 */
export function SalesTeamOnly({ children, fallback = null, hideIfDenied = true }) {
  return (
    <RoleGuard 
      roles={['SALES_MANAGER', 'TL', 'BA', 'SBA']} 
      fallback={fallback}
      hideIfDenied={hideIfDenied}
    >
      {children}
    </RoleGuard>
  )
}

/**
 * ConditionalRender Component
 * Advanced conditional rendering with multiple conditions
 */
export function ConditionalRender({
  children,
  conditions = {},
  fallback = null,
  hideIfDenied = true
}) {
  const { user, hasRole, hasPermission, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return hideIfDenied ? null : fallback
  }

  // Check all conditions
  const shouldRender = Object.entries(conditions).every(([key, value]) => {
    switch (key) {
      case 'roles':
        return hasRole(Array.isArray(value) ? value : [value])
      case 'permissions':
        return Array.isArray(value) 
          ? value.every(permission => hasPermission(permission))
          : hasPermission(value)
      case 'anyPermissions':
        return Array.isArray(value)
          ? value.some(permission => hasPermission(permission))
          : hasPermission(value)
      case 'userProperty':
        const [property, expectedValue] = value
        return user[property] === expectedValue
      case 'customCheck':
        return typeof value === 'function' ? value(user) : value
      default:
        return true
    }
  })

  if (shouldRender) {
    return children
  }

  return hideIfDenied ? null : fallback
}

/**
 * useRoleAccess Hook
 * Hook for accessing role/permission checks in components
 */
export function useRoleAccess() {
  const { user, hasRole, hasPermission, isAuthenticated } = useAuth()

  const checkAccess = (config = {}) => {
    if (!isAuthenticated || !user) return false

    const { roles = [], permissions = [], mode = 'any' } = config

    // Check roles
    let hasRoleAccess = true
    if (roles.length > 0) {
      hasRoleAccess = hasRole(roles)
    }

    // Check permissions
    let hasPermissionAccess = true
    if (permissions.length > 0) {
      if (mode === 'all') {
        hasPermissionAccess = permissions.every(permission => hasPermission(permission))
      } else {
        hasPermissionAccess = permissions.some(permission => hasPermission(permission))
      }
    }

    return hasRoleAccess && hasPermissionAccess
  }

  const canAccess = {
    // Role-based checks
    isAdmin: () => hasRole(['SUPERADMIN']),
    isManager: () => hasRole(['SUPERADMIN', 'BRANCH_MANAGER', 'SALES_MANAGER']),
    isBranchManager: () => hasRole(['BRANCH_MANAGER']),
    isSalesManager: () => hasRole(['SALES_MANAGER']),
    isTeamLead: () => hasRole(['TL']),
    isSalesAgent: () => hasRole(['BA', 'SBA']),
    isHR: () => hasRole(['HR']),
    isSalesTeam: () => hasRole(['SALES_MANAGER', 'TL', 'BA', 'SBA']),

    // Permission-based checks
    canManageUsers: () => hasPermission('manage_users'),
    canAddLead: () => hasPermission('add_lead'),
    canEditLead: () => hasPermission('edit_lead'),
    canDeleteLead: () => hasPermission('delete_lead'),
    canViewReports: () => hasPermission('view_reports'),
    canManageBranches: () => hasPermission('manage_branches'),
    canAssignLeads: () => hasPermission('assign_leads'),
    canConvertLeads: () => hasPermission('convert_leads'),

    // Combined checks
    canAccessUserManagement: () => checkAccess({
      roles: ['SUPERADMIN', 'HR'],
      permissions: ['manage_users']
    }),
    canAccessLeadManagement: () => checkAccess({
      roles: ['SUPERADMIN', 'SALES_MANAGER', 'TL', 'BA', 'SBA'],
      permissions: ['add_lead', 'edit_lead'],
      mode: 'any'
    }),
    canAccessBranchManagement: () => checkAccess({
      roles: ['SUPERADMIN', 'BRANCH_MANAGER'],
      permissions: ['manage_branches']
    }),
    canAccessReports: () => checkAccess({
      roles: ['SUPERADMIN', 'BRANCH_MANAGER', 'SALES_MANAGER'],
      permissions: ['view_reports']
    })
  }

  return {
    checkAccess,
    canAccess,
    user,
    isAuthenticated
  }
}

/**
 * Higher-Order Component for role-based access
 */
export function withRoleAccess(WrappedComponent, accessConfig = {}) {
  return function RoleAccessComponent(props) {
    const { checkAccess } = useRoleAccess()
    const hasAccess = checkAccess(accessConfig)

    if (!hasAccess) {
      return accessConfig.fallback || null
    }

    return <WrappedComponent {...props} />
  }
}

/**
 * RoleBasedNavigation Component
 * Renders navigation items based on user role/permissions
 */
export function RoleBasedNavigation({ navigationItems, className = '' }) {
  const { checkAccess } = useRoleAccess()

  const filteredItems = navigationItems.filter(item => {
    if (!item.access) return true
    return checkAccess(item.access)
  })

  return (
    <nav className={className}>
      {filteredItems.map((item, index) => (
        <div key={index}>
          {item.render ? item.render() : item.component}
        </div>
      ))}
    </nav>
  )
}

/**
 * RoleBasedButton Component
 * Button that's only visible/enabled based on role/permissions
 */
export function RoleBasedButton({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  mode = 'any',
  hideIfDenied = true,
  disableIfDenied = false,
  className = '',
  disabledClassName = 'opacity-50 cursor-not-allowed',
  ...buttonProps
}) {
  const { checkAccess } = useRoleAccess()
  
  const hasAccess = checkAccess({
    roles: allowedRoles,
    permissions: requiredPermissions,
    mode
  })

  if (!hasAccess && hideIfDenied) {
    return null
  }

  const isDisabled = (!hasAccess && disableIfDenied) || buttonProps.disabled

  return (
    <button
      {...buttonProps}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? disabledClassName : ''}`}
    >
      {children}
    </button>
  )
}