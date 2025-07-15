'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingSpinner from './LoadingSpinner'

/**
 * ProtectedRoute Component
 * Wraps components that require authentication and authorization
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {string[]} props.allowedRoles - Array of roles allowed to access this route
 * @param {string[]} props.requiredPermissions - Array of permissions required for this route
 * @param {string} props.redirectTo - Route to redirect to if not authenticated (default: '/login')
 * @param {React.ReactNode} props.fallback - Component to show while loading
 * @param {boolean} props.requireAuth - Whether authentication is required (default: true)
 * @param {string} props.accessDeniedRedirect - Where to redirect on access denied (default: '/dashboard')
 * @param {boolean} props.showAccessDeniedPage - Show access denied page instead of redirecting
 */
export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requiredPermissions = [],
  redirectTo = '/login',
  fallback = null,
  requireAuth = true,
  accessDeniedRedirect = '/dashboard',
  showAccessDeniedPage = true
}) {
  const { user, isAuthenticated, loading, hasRole, hasPermission } = useAuth()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [denialReason, setDenialReason] = useState('')

  useEffect(() => {
    if (!loading) {
      // Skip auth check if not required
      if (!requireAuth) {
        setShouldRender(true)
        return
      }

      // Not authenticated - redirect to login
      if (!isAuthenticated) {
        console.log('🔒 Not authenticated, redirecting to login')
        router.push(redirectTo)
        return
      }

      // Check role-based access
      if (allowedRoles.length > 0) {
        const userHasRole = hasRole(allowedRoles)
        if (!userHasRole) {
          console.warn(`🚫 Access denied. User role: ${user?.role}, Required roles:`, allowedRoles)
          setDenialReason(`role`)
          setAccessDenied(true)
          
          if (!showAccessDeniedPage) {
            router.push(accessDeniedRedirect)
            return
          }
          return
        }
      }

      // Check permission-based access
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission => 
          hasPermission(permission)
        )
        
        if (!hasAllPermissions) {
          console.warn(`🚫 Access denied. Missing permissions:`, requiredPermissions)
          setDenialReason('permission')
          setAccessDenied(true)
          
          if (!showAccessDeniedPage) {
            router.push(accessDeniedRedirect)
            return
          }
          return
        }
      }

      // All checks passed
      console.log('✅ Access granted')
      setShouldRender(true)
      setAccessDenied(false)
    }
  }, [
    loading, 
    isAuthenticated, 
    user, 
    allowedRoles, 
    requiredPermissions, 
    hasRole, 
    hasPermission, 
    router, 
    redirectTo,
    requireAuth,
    accessDeniedRedirect,
    showAccessDeniedPage
  ])

  // Show loading state
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    )
  }

  // Not authenticated and auth is required
  if (requireAuth && !isAuthenticated) {
    return null // Router.push is async, prevent flash of content
  }

  // Access denied - show custom page
  if (accessDenied && showAccessDeniedPage) {
    return <AccessDeniedPage 
      reason={denialReason}
      allowedRoles={allowedRoles}
      requiredPermissions={requiredPermissions}
      userRole={user?.role}
      onGoBack={() => router.back()}
      onGoHome={() => router.push('/dashboard')}
    />
  }

  // Render children if all checks pass
  return shouldRender ? children : null
}

/**
 * Access Denied Page Component
 */
function AccessDeniedPage({ 
  reason, 
  allowedRoles, 
  requiredPermissions, 
  userRole,
  onGoBack,
  onGoHome 
}) {
  const isRoleIssue = reason === 'role'
  const isPermissionIssue = reason === 'permission'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        {/* Icon */}
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
          isRoleIssue ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          {isRoleIssue ? (
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>

        {/* Title and Description */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {isRoleIssue ? 'Access Denied' : 'Insufficient Permissions'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {isRoleIssue 
            ? "You don't have the required role to access this page."
            : "You don't have the required permissions to access this page."
          }
        </p>

        {/* Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          {userRole && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-500">Your role:</span>
              <span className="ml-2 text-sm text-gray-900 bg-gray-200 px-2 py-1 rounded">
                {userRole}
              </span>
            </div>
          )}
          
          {isRoleIssue && allowedRoles.length > 0 && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-500">Required roles:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {allowedRoles.map(role => (
                  <span key={role} className="text-sm text-red-700 bg-red-100 px-2 py-1 rounded">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {isPermissionIssue && requiredPermissions.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-500">Required permissions:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {requiredPermissions.map(permission => (
                  <span key={permission} className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onGoBack}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            ← Go Back
          </button>
          <button
            onClick={onGoHome}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            🏠 Go to Dashboard
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-6">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  )
}

// Export additional HOC for easier usage
export const withAuth = (Component, options = {}) => {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Export role-specific HOCs
export const withRole = (allowedRoles) => (Component) => {
  return withAuth(Component, { allowedRoles })
}

export const withPermission = (requiredPermissions) => (Component) => {
  return withAuth(Component, { requiredPermissions })
}