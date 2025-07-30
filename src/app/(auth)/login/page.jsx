'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from '@/api/Axios';

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Username and Password are required')
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('grant_type', '')
      params.append('username', username)
      params.append('password', password)
      params.append('scope', '')
      params.append('client_id', '')
      params.append('client_secret', '')

      const res = await axiosInstance.post('/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      })

      const { access_token, refresh_token, user_info } = res.data

      Cookies.set('access_token', access_token, { expires: 7 })
      Cookies.set('refresh_token', refresh_token, { expires: 7 })
      Cookies.set('user_info', JSON.stringify(user_info), { expires: 7 })

      const decoded = jwtDecode(access_token)
      console.log("Decoded JWT:", decoded)

      toast.success('Login successful')

      // ✅ Redirect based on role
      if (decoded.role === 'SUPERADMIN' || decoded.role === 'BRANCH MANAGER') {
        router.push('/dashboard/super')
      } else {
        router.push('/dashboard')
      }

    } catch (err) {
      console.error('Login error:', err)
      setError('Invalid credentials')
      toast.error('Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4 text-center">CRM Login</h1>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 border rounded mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full bg-blue-600 text-white py-2 rounded">
          Login
        </button>
      </form>
    </div>
  )
}
