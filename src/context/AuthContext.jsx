'use client'
import { createContext, useContext, useReducer, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import Cookies from 'js-cookie'
import { toast } from 'react-toastify'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null
      }
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload
      }
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null
      }
    case 'REFRESH_TOKEN':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user
      }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
  error: null
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = Cookies.get('access_token')
    const userInfo = Cookies.get('user_info')

    if (token && userInfo) {
      try {
        const decodedToken = jwtDecode(token)
        const currentTime = Date.now() / 1000

        if (decodedToken.exp > currentTime) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              token,
              user: JSON.parse(userInfo)
            }
          })
        } else {
          // Token expired, clear cookies
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          Cookies.remove('user_info')
          dispatch({ type: 'LOGOUT' })
        }
      } catch (error) {
        console.error('Token validation error:', error)
        Cookies.remove('access_token')
        Cookies.remove('refresh_token')
        Cookies.remove('user_info')
        dispatch({ type: 'LOGOUT' })
      }
    } else {
      dispatch({ type: 'LOGOUT' })
    }
  }, [])

  // Login function
  const login = async (username, password) => {
    dispatch({ type: 'LOGIN_START' })

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed')
      }

      // Store tokens and user info in cookies
      Cookies.set('access_token', data.access_token, { expires: 7 })
      Cookies.set('refresh_token', data.refresh_token, { expires: 30 })
      Cookies.set('user_info', JSON.stringify(data.user_info), { expires: 7 })

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token: data.access_token,
          user: data.user_info
        }
      })

      toast.success('Login successful!')
      return { success: true }

    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.message
      })
      toast.error(error.message)
      return { success: false, error: error.message }
    }
  }

  // Logout function
  const logout = () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    Cookies.remove('user_info')
    dispatch({ type: 'LOGOUT' })
    toast.success('Logged out successfully')
  }

  // Refresh token function
  const refreshToken = async () => {
    const refreshToken = Cookies.get('refresh_token')
    
    if (!refreshToken) {
      logout()
      return false
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Token refresh failed')
      }

      Cookies.set('access_token', data.access_token, { expires: 7 })
      Cookies.set('user_info', JSON.stringify(data.user_info), { expires: 7 })

      dispatch({
        type: 'REFRESH_TOKEN',
        payload: {
          token: data.access_token,
          user: data.user_info
        }
      })

      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      logout()
      return false
    }
  }

  // Check if user has specific permission
  const hasPermission = (permission) => {
    if (!state.user || !state.user.permissions) return false
    return state.user.permissions[permission] === true
  }

  // Check if user has specific role
  const hasRole = (role) => {
    if (!state.user) return false
    return state.user.role === role
  }

  const value = {
    ...state,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' })
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}