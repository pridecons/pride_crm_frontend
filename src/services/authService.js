// src/services/authService.js - FIXED VERSION

import { apiMethods } from './apiClient'

class AuthService {
  /**
   * Login user with credentials
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Username or email
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} Login response
   */
  async login(credentials) {
    try {
      // Use the JSON login endpoint that matches your backend
      const response = await apiMethods.post('/auth/login/json', {
        username: credentials.username,
        password: credentials.password
      })
      
      return response.data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  /**
   * Alternative: Form-data login (if your backend expects OAuth2PasswordRequestForm)
   * @param {Object} credentials - Login credentials
   */
  async loginForm(credentials) {
    try {
      // Create FormData for OAuth2PasswordRequestForm
      const formData = new FormData()
      formData.append('username', credentials.username)
      formData.append('password', credentials.password)
      
      const response = await apiMethods.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      return response.data
    } catch (error) {
      console.error('Form login error:', error)
      throw error
    }
  }

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await apiMethods.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with logout even if server call fails
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  async register(userData) {
    try {
      const response = await apiMethods.post('/auth/register', userData)
      return response.data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Refresh authentication token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken(refreshToken) {
    try {
      const response = await apiMethods.post('/auth/refresh', {
        refresh_token: refreshToken
      })
      return response.data
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
  }

  /**
   * Verify token
   * @param {string} token - Access token to verify
   * @returns {Promise<Object>} Token verification result
   */
  async verifyToken(token) {
    try {
      const response = await apiMethods.post('/auth/verify', {
        token: token
      })
      return response.data
    } catch (error) {
      console.error('Token verification error:', error)
      throw error
    }
  }

  /**
   * Change user password
   * @param {Object} passwordData - Password change data
   * @returns {Promise<Object>} Password change result
   */
  async changePassword(passwordData) {
    try {
      const response = await apiMethods.post('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      })
      return response.data
    } catch (error) {
      console.error('Password change error:', error)
      throw error
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Password reset request result
   */
  async requestPasswordReset(email) {
    try {
      const response = await apiMethods.post('/auth/forgot-password', {
        email: email
      })
      return response.data
    } catch (error) {
      console.error('Password reset request error:', error)
      throw error
    }
  }

  /**
   * Reset password with token
   * @param {Object} resetData - Password reset data
   * @returns {Promise<Object>} Password reset result
   */
  async resetPassword(resetData) {
    try {
      const response = await apiMethods.post('/auth/reset-password', {
        token: resetData.token,
        new_password: resetData.newPassword
      })
      return response.data
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  async getCurrentUser() {
    try {
      const response = await apiMethods.get('/auth/me')
      return response.data
    } catch (error) {
      console.error('Get current user error:', error)
      throw error
    }
  }
}

// Create and export instance
const authService = new AuthService()
export default authService