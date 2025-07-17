'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import { Bell, Menu, Search, User, LogOut, Settings, Clock, ChevronDown, Calendar, MapPin } from 'lucide-react'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

export default function Header({ onMenuClick, onSearch }) {
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [user, setUser] = useState(null)
  const [searchValue, setSearchValue] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  // ✅ Live Clock Update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const dateString = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      setCurrentTime(timeString)
      setCurrentDate(dateString)
    }

    updateClock() // Initial call
    const interval = setInterval(updateClock, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

  // ✅ Debounced Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (typeof onSearch === 'function') {
        onSearch(searchValue)
      }
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('globalSearchQuery', searchValue)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [searchValue])

  // ✅ Load user data from cookies
  useEffect(() => {
    const accessToken = Cookies.get('access_token')
    const userInfo = Cookies.get('user_info')

    if (accessToken && userInfo) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      const decoded = jwtDecode(accessToken)
      setUser({
        ...JSON.parse(userInfo),
        role: decoded.role,
      })
    }
  }, [])

  const handleLogout = () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    Cookies.remove('user_info')
    router.push('/login')
  }

  return (
    <header className="bg-white shadow-lg border-b border-gray-100 px-4 py-3 lg:px-6 relative">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 pointer-events-none"></div>
      
      <div className="flex items-center justify-between relative z-10">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden transition-all duration-200 hover:scale-105"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/pride.png" 
                alt="Logo" 
                width={110} 
                height={40} 
                className="transition-all duration-200 hover:scale-105"
              />
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 -z-10"></div>
            </div>
          </div>
        </div>

        {/* Center - Enhanced Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" size={16} />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white shadow-sm hover:shadow-md"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center space-x-6">
          {/* ✅ Enhanced Live Clock */}
          <div className="hidden md:flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 rounded-full p-1">
                <Clock size={14} className="text-blue-600" />
              </div>
              <div className="text-sm">
                <div className="font-semibold text-gray-900">{currentTime}</div>
                <div className="text-xs text-gray-500">{currentDate}</div>
              </div>
            </div>
          </div>

          {/* Location indicator */}
          <div className="hidden lg:flex items-center space-x-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
            <MapPin size={14} className="text-gray-500" />
            <span className="text-sm font-medium">Indore, IN</span>
          </div>

          {/* Enhanced Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-400 rounded-full animate-ping"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 transform transition-all duration-200 animate-in slide-in-from-top-2">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-100 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">1</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="bg-blue-100 rounded-full p-2">
                      <Bell size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">System Update</p>
                      <p className="text-xs text-gray-500">No new notifications available</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          
        </div>
      </div>
    </header>
  )
}