'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import toast from 'react-hot-toast'
import { Eye, EyeOff, User, Lock, Shield } from 'lucide-react'
import { axiosInstance } from '@/api/Axios'  // Import axiosInstance

// Map numeric role_id → canonical key
const ROLE_ID_TO_KEY = {
  '1': 'SUPERADMIN',
  '2': 'BRANCH_MANAGER',
  '3': 'HR',
  '4': 'SALES_MANAGER',
  '5': 'TL',
  '6': 'SBA',
  '7': 'BA',
  '8': 'BA',             // your API shows BA id=8
  '9': 'RESEARCHER',
  '10': 'COMPLIANCE_OFFICER',
  '11': 'TESTPROFILE',
}

// Normalize any role-like string to a canonical key
function canonRole(s) {
  if (!s) return ''
  let x = String(s).trim().toUpperCase()
  // common variants
  x = x.replace(/\s+/g, '_') // "BRANCH MANAGER" -> "BRANCH_MANAGER"
  if (x === 'SUPER_ADMINISTRATOR') x = 'SUPERADMIN'
  return x
}

// Extract best-effort role from token + user_info
function getEffectiveRole({ accessToken, userInfo }) {
  // try from JWT first
  try {
    if (accessToken) {
      const d = jwtDecode(accessToken) || {}
      // many possible locations
      const jwtRole =
        d.role_name ||
        d.role ||
        d.profile_role?.name ||
        d.user?.role_name ||
        d.user?.role ||
        ''
      const r1 = canonRole(jwtRole)
      if (r1) return r1

      // fallback via id present in token
      const jwtRoleId =
        d.role_id ?? d.user?.role_id ?? d.profile_role?.id ?? null
      if (jwtRoleId != null) {
        const r2 = ROLE_ID_TO_KEY[String(jwtRoleId)]
        if (r2) return r2
      }
    }
  } catch {
    // ignore decode errors, fallback to user_info
  }

  // fallback to user_info object
  if (userInfo) {
    const uiRole =
      userInfo.role_name ||
      userInfo.role ||
      userInfo.profile_role?.name ||
      userInfo.user?.role_name ||
      userInfo.user?.role ||
      ''
    const r3 = canonRole(uiRole)
    if (r3) return r3

    const uiRoleId =
      userInfo.role_id ??
      userInfo.user?.role_id ??
      userInfo.profile_role?.id ??
      null
    if (uiRoleId != null) {
      const r4 = ROLE_ID_TO_KEY[String(uiRoleId)]
      if (r4) return r4
    }
  }
  return ''
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const usernameRef = useRef(null)
  const passwordRef = useRef(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (submitting) return

    setError('')
    if (!username && !password) {
      const msg = 'Username and Password are required'
      setError(msg); toast.error(msg); usernameRef.current?.focus(); return
    }
    if (!username) {
      const msg = 'Username is required'
      setError(msg); toast.error(msg); usernameRef.current?.focus(); return
    }
    if (!password) {
      const msg = 'Password is required'
      setError(msg); toast.error(msg); passwordRef.current?.focus(); return
    }

    try {
      setSubmitting(true)

      const body = new URLSearchParams()
      body.append('grant_type', 'password')
      body.append('username', username)
      body.append('password', password)
      body.append('scope', '')
      body.append('client_id', 'string')
      body.append('client_secret', 'string')

      const res = await axiosInstance.post('/auth/login', body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      })

      let payload = null
      try { payload = res.data } catch { }

      if (!res.status === 200) {
        const apiDetail = payload?.detail || payload?.message || `HTTP ${res.status}`
        let msg = 'Invalid username or password'
        if (typeof apiDetail === 'string') {
          if (/missing/i.test(apiDetail) && /username|password/i.test(apiDetail)) {
            msg = 'Username or password is missing'
          } else if (/network|timeout/i.test(apiDetail)) {
            msg = 'Network error. Please try again.'
          } else if (/HTTP 5\d{2}/.test(apiDetail)) {
            msg = 'Server error. Please try again.'
          } else if (res.status !== 401) {
            msg = apiDetail
          }
        } else if (!navigator.onLine) {
          msg = 'Network error. Please check your connection.'
        }
        setError(msg); toast.error(msg); setSubmitting(false); return
      }

      const { access_token, refresh_token, user_info } = payload || {}

      if (access_token) Cookies.set('access_token', access_token, { expires: 7 })
      if (refresh_token) Cookies.set('refresh_token', refresh_token, { expires: 7 })
      if (user_info) Cookies.set('user_info', JSON.stringify(user_info), { expires: 7 })

      const effRole = getEffectiveRole({ accessToken: access_token, userInfo: user_info })

      toast.success('Login successful')

      if (effRole === 'SUPERADMIN' || effRole === 'BRANCH_MANAGER') {
        router.push('/dashboard/super')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      const msg = 'Network error. Please check your connection.'
      setError(msg); toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gradient-to-br from-sky-500 via-gray-200 to-sky-600 w-full">
      
      {/* Left image side */}
      <div className="hidden md:flex items-center justify-center">
        <img
          src="/ganesha_no_bg.png"
          alt="Ganpati"
          className="w-80 h-80 opacity-90 select-none"
        />
      </div>

      {/* Right form side */}
      <div className="flex flex-col justify-center px-6">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center">
            <img src="/pride_logo_nobg.png" alt="Logo" className="h-12 w-auto" />
          </div>
          <p className="text-gray-700 text-sm">Sign in to access your CRM dashboard</p>
        </div>

        <div className="flex justify-center">
          <form
            onSubmit={handleLogin}
            className="bg-white/10 backdrop-blur-lg p-5 rounded-2xl shadow-2xl bg-gradient-to-br from-sky-500 via-gray-800 to-sky-600 w-full max-w-md"
            noValidate
          >
            {error ? (
              <div className="bg-red-500/20 border border-red-500/30 text-red-100 text-sm p-3 rounded-lg mb-6 backdrop-blur-sm">
                {error}
              </div>
            ) : (
              <p className="text-white/70 text-sm mb-6 text-center">
                Enter your credentials to continue
              </p>
            )}

            {/* Username */}
            <div className="mb-6">
              <label className="block text-white/90 text-sm font-medium mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 z-10" />
                <input
                  ref={usernameRef}
                  type="text"
                  placeholder="e.g. username@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 backdrop-blur-sm transition-all duration-200"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-white/90 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 z-10" />
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 backdrop-blur-sm transition-all duration-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center text-white/60 hover:text-white/80 transition-colors duration-200"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} className="text-gray-700" />
                  ) : (
                    <Eye size={18} className="text-gray-700" />
                  )}
                </button>
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/30 ${
                submitting
                  ? 'bg-gradient-to-r from-white/20 to-white/10 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-400 to-sky-600 hover:from-blue-600 hover:to-gray-700 shadow-lg hover:shadow-xl'
              }`}
            >
              <span className="flex items-center justify-center">
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    logging in…
                  </>
                ) : (
                  'Log In'
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-xs">
            © 2025 CRM System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
