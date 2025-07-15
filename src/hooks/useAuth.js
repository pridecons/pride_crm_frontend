import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import authService from '@/services/authService'
import { toast } from 'react-toastify'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

/**
 * Custom hook for authentication operations
 * Provides login, logout, and user management functionality
 * 
 * @returns {Object} Authentication methods and state
 */
export const useAuth = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Login user with credentials
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Username or email
   * @param {string} credentials.password - Password
   * @param {boolean} credentials.rememberMe - Remember login
   * @param {string} redirectTo - Route to redirect after successful login
   * @returns {Promise<Object>} Login result
   */
  const login = useCallback(async (credentials, redirectTo = '/dashboard') => {
    setLoading(true)
    setError(null)

    try {
      const response = await authService.login(credentials)
      const { access_token, refresh_token, user_info } = response

      // Store tokens with appropriate expiration
      const expires = credentials.rememberMe ? 30 : 7 // 30 days if remember me, 7 days otherwise
      
      Cookies.set('access_token', access_token, { expires })
      Cookies.set('refresh_token', refresh_token, { expires })
      Cookies.set('user_info', JSON.stringify(user_info), { expires })

      // Decode token to get user details
      const decoded = jwtDecode(access_token)
      const user = {
        ...user_info,
        role: decoded.role,
        permissions: decoded.permissions || {},
        employee_code: decoded.sub // JWT subject is usually the employee_code
      }

      toast.success(`Welcome back, ${user.name}!`)

      // Redirect based on role or provided route
      let targetRoute = redirectTo
      if (redirectTo === '/dashboard') {
        // Role-based default routing
        switch (decoded.role) {
          case 'SUPERADMIN':
            targetRoute = '/dashboard'
            break
          case 'HR':
            targetRoute = '/dashboard/users'
            break
          case 'BRANCH_MANAGER':
            targetRoute = '/dashboard/branches'
            break
          case 'SALES_MANAGER':
          case 'TL':
            targetRoute = '/dashboard/leads'
            break
          case 'BA':
          case 'SBA':
            targetRoute = '/dashboard/leads/add'
            break
          default:
            targetRoute = '/dashboard'
        }
      }

      router.push(targetRoute)
      
      return { 
        success: true, 
        user, 
        message: 'Login successful' 
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Login failed'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  /**
   * Logout user and clear session
   * @param {string} redirectTo - Route to redirect after logout
   */
  const logout = useCallback(async (redirectTo = '/login') => {
    setLoading(true)
    
    try {
      // Call server logout endpoint
      await authService.logout()
    } catch (err) {
      console.error('Server logout failed:', err)
      // Continue with local logout even if server call fails
    }

    // Clear local storage
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    Cookies.remove('user_info')
    
    toast.info('You have been logged out')
    router.push(redirectTo)
    
    setLoading(false)
  }, [router])

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  const register = useCallback(async (userData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authService.register(userData)
      toast.success('Registration successful! Please login.')
      
      return { 
        success: true, 
        data: response,
        message: 'Registration successful' 
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Registration failed'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Change user password
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @param {string} passwordData.confirmPassword - Confirm new password
   * @returns {Promise<Object>} Password change result
   */
  const changePassword = useCallback(async (passwordData) => {
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      const error = 'New passwords do not match'
      setError(error)
      toast.error(error)
      setLoading(false)
      return { success: false, error }
    }

    try {
      const response = await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      toast.success('Password changed successfully')
      
      return { 
        success: true, 
        data: response,
        message: 'Password changed successfully' 
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Password change failed'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Password reset request result
   */
  const requestPasswordReset = useCallback(async (email) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authService.requestPasswordReset(email)
      toast.success('Password reset link sent to your email')
      
      return { 
        success: true, 
        data: response,
        message: 'Password reset link sent' 
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Password reset request failed'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Reset password with token
   * @param {Object} resetData - Password reset data
   * @param {string} resetData.token - Reset token from email
   * @param {string} resetData.newPassword - New password
   * @param {string} resetData.confirmPassword - Confirm new password
   * @returns {Promise<Object>} Password reset result
   */
  const resetPassword = useCallback(async (resetData) => {
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (resetData.newPassword !== resetData.confirmPassword) {
      const error = 'Passwords do not match'
      setError(error)
      toast.error(error)
      setLoading(false)
      return { success: false, error }
    }

    try {
      const response = await authService.resetPassword({
        token: resetData.token,
        newPassword: resetData.newPassword
      })
      
      toast.success('Password reset successful! Please login.')
      router.push('/login')
      
      return { 
        success: true, 
        data: response,
        message: 'Password reset successful' 
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Password reset failed'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  /**
   * Check if user is currently authenticated
   * @returns {boolean} Authentication status
   */
  const isAuthenticated = useCallback(() => {
    const token = Cookies.get('access_token')
    if (!token) return false

    try {
      const decoded = jwtDecode(token)
      const currentTime = Date.now() / 1000
      return decoded.exp > currentTime
    } catch {
      return false
    }
  }, [])

  /**
   * Get current user from stored token
   * @returns {Object|null} Current user data or null
   */
  const getCurrentUser = useCallback(() => {
    const token = Cookies.get('access_token')
    const userInfo = Cookies.get('user_info')
    
    if (!token || !userInfo) return null

    try {
      const decoded = jwtDecode(token)
      const currentTime = Date.now() / 1000
      
      if (decoded.exp <= currentTime) return null

      return {
        ...JSON.parse(userInfo),
        role: decoded.role,
        permissions: decoded.permissions || {},
        employee_code: decoded.sub
      }
    } catch {
      return null
    }
  }, [])

  /**
   * Check if user has specific role(s)
   * @param {string|string[]} roles - Role(s) to check
   * @returns {boolean} Whether user has the role(s)
   */
  const hasRole = useCallback((roles) => {
    const user = getCurrentUser()
    if (!user?.role) return false
    
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }, [getCurrentUser])

  /**
   * Check if user has specific permission(s)
   * @param {string|string[]} permissions - Permission(s) to check
   * @returns {boolean} Whether user has the permission(s)
   */
  const hasPermission = useCallback((permissions) => {
    const user = getCurrentUser()
    if (!user?.permissions) return false
    
    const permissionArray = Array.isArray(permissions) ? permissions : [permissions]
    return permissionArray.every(permission => user.permissions[permission] === true)
  }, [getCurrentUser])

  /**
   * Refresh authentication token
   * @returns {Promise<boolean>} Whether refresh was successful
   */
  const refreshToken = useCallback(async () => {
    try {
      const refresh_token = Cookies.get('refresh_token')
      if (!refresh_token) return false

      const response = await authService.refreshToken(refresh_token)
      const { access_token, user_info } = response

      Cookies.set('access_token', access_token, { expires: 7 })
      Cookies.set('user_info', JSON.stringify(user_info), { expires: 7 })

      return true
    } catch (err) {
      console.error('Token refresh failed:', err)
      logout()
      return false
    }
  }, [logout])

  return {
    // State
    loading,
    error,
    
    // Authentication methods
    login,
    logout,
    register,
    changePassword,
    requestPasswordReset,
    resetPassword,
    refreshToken,
    
    // User methods
    isAuthenticated,
    getCurrentUser,
    hasRole,
    hasPermission,
    
    // Utilities
    clearError: () => setError(null)
  }
}

export default useAuth