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
            `http://127.0.0.1:8000/api/v1/refresh`,
            { refresh_token: refreshToken }
          )

          const { access_token, user_info } = response.data

          // Update cookies
          Cookies.set('access_token', access_token, { expires: 7 })
          Cookies.set('user_info', JSON.stringify(user_info), { expires: 7 })

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh failed, redirect to login
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          Cookies.remove('user_info')
          
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }

    // Handle different error status codes
    const { status, data } = error.response || {}
    
    switch (status) {
      case 400:
        toast.error(data?.detail || 'Bad request')
        break
      case 403:
        toast.error('Access denied. You do not have permission to perform this action.')
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
      case 500:
        toast.error('Internal server error. Please try again later.')
        break
      case 503:
        toast.error('Service temporarily unavailable. Please try again later.')
        break
      default:
        if (error.code === 'ECONNABORTED') {
          toast.error('Request timeout. Please check your connection.')
        } else if (error.message === 'Network Error') {
          toast.error('Network error. Please check your internet connection.')
        } else {
          toast.error(data?.detail || error.message || 'An unexpected error occurred')
        }
    }

    return Promise.reject(error)
  }
)

// Generic API methods
export const apiMethods = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data, config = {}) => apiClient.post(url, data, config),
  put: (url, data, config = {}) => apiClient.put(url, data, config),
  patch: (url, data, config = {}) => apiClient.patch(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
  
  // File upload method
  upload: (url, formData, onUploadProgress) => {
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    })
  },

  // Download method
  download: async (url, filename) => {
    try {
      const response = await apiClient.get(url, {
        responseType: 'blob',
      })
      
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      
      return response
    } catch (error) {
      console.error('Download error:', error)
      throw error
    }
  }
}

export default apiClient