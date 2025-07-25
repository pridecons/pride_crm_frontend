'use client'

import { useState, useEffect, useRef } from "react";
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import { Bell, X, Menu, Search, User, LogOut, Settings, Clock, ChevronDown, Calendar, MapPin } from 'lucide-react'
import { jwtDecode } from 'jwt-decode'
import { axiosInstance } from '@/api/Axios'
import toast from 'react-hot-toast'

export default function Header({ onMenuClick, onSearch }) {
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [user, setUser] = useState(null)
  const [searchValue, setSearchValue] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [isConnect, setIsConnect] = useState(false)

  const profileRef = useRef(null); // ✅ added
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

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

  useEffect(() => {
    const accessToken = Cookies.get('access_token')
    const userInfo = Cookies.get('user_info')

    if (accessToken && userInfo) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      const decoded = jwtDecode(accessToken)
      setUser({
        ...JSON.parse(userInfo),
        role: decoded.role,
      })
    }
  }, [])

  const toggleProfileMenu = () => {
    setShowProfileMenu((prev) => !prev);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


 return (
  <header className="bg-white border-b border-gray-100 px-4 py-2 lg:px-4 relative">
    <div className="absolute inset-0 pointer-events-none" />
    <div className="flex items-center justify-between relative z-10">
      
      {/* Logo + Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden transition duration-150"
        >
          <Menu size={20} />
        </button>
        <div className="relative">
          <img
            src="/pride.png"
            alt="Logo"
            width={130}
            height={55}
            className="transition-transform duration-200 hover:scale-105"
          />
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 -z-10" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-3">
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 focus:bg-white shadow-sm hover:shadow-md"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
        </div>
      </div>

      {/* Clock + Notifications + Profile */}
      <div className="flex items-center gap-2">
        {/* Clock */}
        <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-1 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 rounded-full p-1">
              <Clock size={14} className="text-blue-600" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-gray-900">{currentTime}</div>
              <div className="text-xs text-gray-500">{currentDate}</div>
            </div>
          </div>
        </div>

        {/* Notifications + Profile with no space */}
        <div className="flex items-center gap-1">
          <ShowNotifications setIsConnect={setIsConnect} />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={toggleProfileMenu}
              className="flex items-center space-x-1 px-1 py-1 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <User size={18} className="text-white" />
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-3 h-3 ${
                    isConnect ? "bg-green-500" : "bg-red-500"
                  } rounded-full border-2 border-white`}
                ></div>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500">{user?.role || "Role"}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
);
}
const ShowNotifications = ({ setIsConnect }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState([]);
  const retryCountRef = useRef(0);
  const socketRef = useRef(null);
  const wrapperRef = useRef(null); // 🔹 Added

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket(`wss://crm.24x7techelp.com/api/v1/ws/notification/Admin001`);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnect(true);
        retryCountRef.current = 0;
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!["connection_confirmed", "ping", "pong"].includes(data.type)) {
          setMessages((prev) => [...prev, data]);
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 w-full">
                <div className="bg-blue-100 rounded-full p-2">
                  <Bell size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 w-full">
                  <p className="text-sm font-medium text-gray-900">{data?.title}</p>
                  <p className="text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: data.message }} />
                </div>
              </div>
            </div>
          ));
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnect(false);
        if (retryCountRef.current < 10) {
          retryCountRef.current += 1;
          setTimeout(connect, 1000);
        } else {
          console.warn("Maximum retry attempts reached.");
        }
      };
    };

    connect();

    return () => {
      socketRef.current?.close();
    };
  }, []);

  // 🔹 Outside click to close notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}> {/* 🔹 Attach ref here */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
      >
        <Bell size={20} />
        {messages.length > 0 ? (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow">
            {messages.length}
          </span>
        ) : (
          <>
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-400 rounded-full animate-ping"></span>
          </>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 transform transition-all duration-200 animate-in slide-in-from-top-2">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-100 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{messages?.length}</span>
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-xs text-blue-600 hover:underline hover:text-blue-800"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 max-h-60 overflow-y-auto space-y-3">
            {messages?.map((val, index) => (
              <div
                key={index}
                className="relative flex items-start space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100"
              >
                <div className="bg-blue-100 rounded-full p-2">
                  <Bell size={16} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{val?.title}</p>
                  <p className="text-xs text-gray-500 break-words" dangerouslySetInnerHTML={{ __html: val.message }} />
                </div>
                <button
                  onClick={() => {
                    const updatedMessages = [...messages];
                    updatedMessages.splice(index, 1);
                    setMessages(updatedMessages);
                  }}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

