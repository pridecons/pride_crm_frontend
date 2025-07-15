// src/hooks/useAuth.js - FIXED VERSION

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import authService from '@/services/authService'
import { toast } from 'react-toastify'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

/**
 * Custom hook for authentication operations
 * Provides login, logout, and user management functionality
 */
export const useAuth = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    const token = Cookies.get('access_token')
    if (!token) return false
    
    try {
      const decoded = jwtDecode(token)
      const now = Date.now() / 1000
      return decoded.exp > now
    } catch (error) {
      console.error('Token validation error:', error)
      return false
    }
  }, [])

  // Get current user from cookies
  const getCurrentUser = useCallback(() => {
    try {
      const userInfo = Cookies.get('user_info')
      const token = Cookies.get('access_token')
      
      if (!userInfo || !token) return null
      
      const decoded = jwtDecode(token)
      const userData = JSON.parse(userInfo)
      
      return {
        ...userData,
        role: decoded.role,
        permissions: decoded.permissions || {},
        employee_code: decoded.sub
      }
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  }, [])

  // Initialize user state
  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getCurrentUser())
    }
  }, [isAuthenticated, getCurrentUser])

  /**
   * Login user with credentials
   */
  const login = useCallback(async (credentials, redirectTo = '/dashboard') => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔐 Attempting login with:', { username: credentials.username })
      
      const response = await authService.login(credentials)
      console.log('✅ Login response received:', response)
      
      // Verify response structure
      if (!response.access_token || !response.refresh_token) {
        throw new Error('Invalid response: missing tokens')
      }

      const { access_token, refresh_token, user_info } = response

      // Verify token is valid
      let decoded
      try {
        decoded = jwtDecode(access_token)
        console.log('🔓 Token decoded:', decoded)
      } catch (tokenError) {
        console.error('❌ Invalid token received:', tokenError)
        throw new Error('Invalid token received from server')
      }

      // Store tokens with appropriate expiration
      const expires = credentials.rememberMe ? 30 : 7 // 30 days if remember me, 7 days otherwise
      
      Cookies.set('access_token', access_token, { expires, secure: true, sameSite: 'strict' })
      Cookies.set('refresh_token', refresh_token, { expires, secure: true, sameSite: 'strict' })
      Cookies.set('user_info', JSON.stringify(user_info), { expires, secure: true, sameSite: 'strict' })

      // Create user object
      const userObj = {
        ...user_info,
        role: decoded.role,
        permissions: decoded.permissions || {},
        employee_code: decoded.sub
      }

      setUser(userObj)
      console.log('👤 User object created:', userObj)

      toast.success(`Welcome back, ${userObj.name || userObj.full_name}!`)

      // Determine redirect route based on role
      let targetRoute = redirectTo
      if (redirectTo === '/dashboard') {
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

      console.log(`🎯 Redirecting to: ${targetRoute}`)
      
      // Small delay to ensure state updates
      setTimeout(() => {
        router.push(targetRoute)
      }, 100)
      
      return { 
        success: true, 
        user: userObj, 
        message: 'Login successful' 
      }
      
    } catch (err) {
      console.error('❌ Login failed:', err)
      
      let errorMessage = 'Login failed'
      
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Clear any partial auth data
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      Cookies.remove('user_info')
      setUser(null)
      
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
   */
  const logout = useCallback(async (redirectTo = '/login') => {
    setLoading(true)
    console.log('🚪 Logging out...')
    
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
    setUser(null)
    
    toast.info('You have been logged out')
    router.push(redirectTo)
    
    setLoading(false)
  }, [router])

  /**
   * Clear authentication error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((roles) => {
    const currentUser = getCurrentUser()
    if (!currentUser) return false
    
    if (Array.isArray(roles)) {
      return roles.includes(currentUser.role)
    }
    return currentUser.role === roles
  }, [getCurrentUser])

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback((permission) => {
    const currentUser = getCurrentUser()
    if (!currentUser) return false
    
    return currentUser.permissions?.[permission] === true
  }, [getCurrentUser])

  return {
    // State
    loading,
    error,
    user: user || getCurrentUser(),
    
    // Methods
    login,
    logout,
    clearError,
    isAuthenticated,
    getCurrentUser,
    hasRole,
    hasPermission
  }
}