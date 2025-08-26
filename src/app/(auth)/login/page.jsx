'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'https://crm.24x7techelp.com/api/v1'

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
      setError(msg)
      toast.error(msg)
      usernameRef.current?.focus()
      return
    }
    if (!username) {
      const msg = 'Username is required'
      setError(msg)
      toast.error(msg)
      usernameRef.current?.focus()
      return
    }
    if (!password) {
      const msg = 'Password is required'
      setError(msg)
      toast.error(msg)
      passwordRef.current?.focus()
      return
    }

    try {
      setSubmitting(true)

      const body = new URLSearchParams()
      body.append('grant_type', 'password') // your curl uses 'password'
      body.append('username', username)
      body.append('password', password)
      body.append('scope', '')
      body.append('client_id', 'string')
      body.append('client_secret', 'string')

      // Use fetch to avoid axios interceptors that reload on 401
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
      })

      let payload = null
      try {
        payload = await res.json()
      } catch {
        // keep payload as null; will fall through to error mapping below
      }

      if (!res.ok) {
        // Map common error shapes to a friendly message (do NOT clear inputs)
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
        setError(msg)
        toast.error(msg)
        setSubmitting(false)
        return
      }

      const { access_token, refresh_token, user_info } = payload || {}

      Cookies.set('access_token', access_token, { expires: 7 })
      Cookies.set('refresh_token', refresh_token, { expires: 7 })
      Cookies.set('user_info', JSON.stringify(user_info), { expires: 7 })

      let decodedRole = ''
      try {
        const decoded = jwtDecode(access_token)
        decodedRole = decoded?.role || ''
      } catch {
        decodedRole = user_info?.role || ''
      }

      toast.success('Login successful')

      if (decodedRole === 'SUPERADMIN' || decodedRole === 'BRANCH MANAGER') {
        router.push('/dashboard/super')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      const msg = 'Network error. Please check your connection.'
      setError(msg)
      toast.error(msg)
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
