'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'https://crm.24x7techelp.com/api/v1'

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

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
      })

      let payload = null
      try { payload = await res.json() } catch {}

      if (!res.ok) {
        const apiDetail =
          (payload && (payload.detail || payload.message)) || `HTTP ${res.status}`
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

      // store tokens & info
      if (access_token) Cookies.set('access_token', access_token, { expires: 7 })
      if (refresh_token) Cookies.set('refresh_token', refresh_token, { expires: 7 })
      if (user_info) Cookies.set('user_info', JSON.stringify(user_info), { expires: 7 })

      // robust role detection
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg shadow w-full max-w-sm" noValidate>
        <h1 className="text-2xl font-bold mb-4 text-center">CRM Login</h1>

        {error ? (
          <p className="text-red-600 text-sm mb-3">{error}</p>
        ) : (
          <p className="text-gray-500 text-xs mb-3">Enter your credentials to continue.</p>
        )}

        <label className="block text-sm font-medium mb-1">Username</label>
        <input
          ref={usernameRef}
          type="text"
          placeholder="e.g. username@gmail.com"
          className="w-full p-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <div className="relative mb-4">
          <input
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            placeholder="Your password"
            className="w-full p-2 border rounded pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-2 flex items-center"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full ${submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 rounded transition`}
        >
          {submitting ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  )
}
