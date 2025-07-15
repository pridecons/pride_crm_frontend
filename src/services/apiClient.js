// src/services/apiClient.js - FIXED VERSION

import axios from 'axios'
import Cookies from 'js-cookie'
import { toast } from 'react-toastify'

// Create axios instance
const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1",
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Handle FormData requests
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'] // Let browser set boundary
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = Cookies.get('refresh_token')
      
      if (refreshToken) {
        try {
          const response = await axios.post(
            `http://127.0.0.1:8000/api/v1/auth/refresh`,
            { refresh_token: refreshToken },
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )

          const { access_token, user_info } = response.data

          // Update cookies
          Cookies.set('access_token', access_token, { expires: 7 })
          if (user_info) {
            Cookies.set('user_info', JSON.stringify(user_info), { expires: 7 })
          }

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          // Refresh failed, redirect to login
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          Cookies.remove('user_info')
          
          if (typeof window !== 'undefined') {
            window.location.href = '/login?message=Session expired, please login again'
          }
          
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login?message=Please login to continue'
        }
      }
    }

    // Handle different error status codes
    const { status, data } = error.response || {}
    
    // Don't show toast for certain errors (let components handle them)
    const skipToastFor = [401, 403]
    
    if (!skipToastFor.includes(status)) {
      switch (status) {
        case 400:
          toast.error(data?.detail || 'Bad request')
          break
        case 404:
          toast.error('Resource not found')
          break
        case 422:
          // Validation errors
          if (data?.detail && Array.isArray(data.detail)) {
            data.detail.forEach(err => {
              toast.error(`${err.loc?.join(' -> ')}: ${err.msg}`)
            })
          } else {
            toast.error(data?.detail || 'Validation error')
          }
          break
        case 429:
          toast.error('Too many requests. Please try again later.')
          break
        case 500:
          toast.error('Internal server error. Please try again later.')
          break
        case 503:
          toast.error('Service unavailable. Please try again later.')
          break
        default:
          if (status >= 500) {
            toast.error('Server error. Please try again later.')
          }
      }
    }

    return Promise.reject(error)
  }
)

// API methods with proper error handling
export const apiMethods = {
  get: async (url, config = {}) => {
    try {
      return await apiClient.get(url, config)
    } catch (error) {
      throw error
    }
  },

  post: async (url, data = null, config = {}) => {
    try {
      return await apiClient.post(url, data, config)
    } catch (error) {
      throw error
    }
  },

  put: async (url, data = null, config = {}) => {
    try {
      return await apiClient.put(url, data, config)
    } catch (error) {
      throw error
    }
  },

  patch: async (url, data = null, config = {}) => {
    try {
      return await apiClient.patch(url, data, config)
    } catch (error) {
      throw error
    }
  },

  delete: async (url, config = {}) => {
    try {
      return await apiClient.delete(url, config)
    } catch (error) {
      throw error
    }
  },

  // Upload method for file uploads
  upload: async (url, formData, onUploadProgress = null) => {
    try {
      return await apiClient.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      })
    } catch (error) {
      throw error
    }
  },

  // Download method for file downloads
  download: async (url, config = {}) => {
    try {
      return await apiClient.get(url, {
        ...config,
        responseType: 'blob',
      })
    } catch (error) {
      throw error
    }
  }
}

export default apiClient