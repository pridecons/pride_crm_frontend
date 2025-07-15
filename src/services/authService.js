// src/services/authService.js - FIXED VERSION

import { apiMethods } from './apiClient'

class AuthService {
  /**
   * Login user with credentials - FIXED to match backend
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Username or email
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} Login response
   */
  async login(credentials) {
    try {
      // Backend expects OAuth2PasswordRequestForm (form-data)
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
      console.error('Login error:', error)
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
}

export default new AuthService()