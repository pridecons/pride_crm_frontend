'use client';

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { LogOut, User } from 'lucide-react'
import { jwtDecode } from 'jwt-decode'
import {
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Target,
  BarChart3,
} from 'lucide-react'

export default function Sidebar({ branchId, onClose }) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState({
    leads: true,
    configuration: true,
  })
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [user, setUser] = useState(null)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    const accessToken = Cookies.get('access_token')
    const userInfo = Cookies.get('user_info')

    if (accessToken && userInfo) {
      const decoded = jwtDecode(accessToken)
      setUser({
        ...JSON.parse(userInfo),
        role: decoded.role,
      })
    }
  }, [])

  useEffect(() => {
    if (!user) return;
    if (pathname === '/dashboard') {
      if (
        user.role === 'SUPERADMIN' ||
        user.role === 'BRANCH MANAGER'
      ) {
        router.replace('/dashboard/super');
      }
    }
  }, [user, pathname, router])


  const toggleProfileMenu = () => setShowProfileMenu((prev) => !prev)

  const handleLogout = () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    Cookies.remove('user_info')
    router.push('/login')
  }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const isActive = (path) => {
    // Home: highlight for either /dashboard or /dashboard/super
    if (path === '/dashboard' || path === '/dashboard/super') {
      return pathname === '/dashboard' || pathname === '/dashboard/super'
    }
    return pathname === path
  }

  const NavItem = ({ href, icon: Icon, label }) => (
    <Link
      href={href}
      onClick={onClose}
      className={`
        flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-150
        ${isActive(href)
          ? 'bg-blue-600 text-white font-semibold'
          : 'text-gray-700 hover:bg-gray-100'
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
      `}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )

  const menu = [
    {
      title: 'Main',
      items: [
        {
          href:
            user && (user.role === 'SUPERADMIN' || user.role === 'BRANCH MANAGER')
              ? '/dashboard/super'
              : '/dashboard',
          icon: BarChart3,
          label: 'Home'
        },
      ],
    },
    {
      items: [
        { href: '/branch', icon: BarChart3, label: 'Branch' },
      ],
    },
    {
      title: 'Leads',
      section: 'leads',
      icon: FileText,
      items: [
        { href: '/lead', icon: Target, label: 'New Lead' },
        { href: '/lead/old', icon: Target, label: 'Old Lead' },
        { href: '/lead/add', icon: Plus, label: 'Add Lead' },
        { href: '/lead/manage', icon: FileText, label: 'Manage Leads' },
      ],
    },
    {
      title: 'Configuration',
      section: 'configuration',
      icon: Settings,
      items: [
        { href: '/user', icon: Users, label: 'Users' },
        { href: '/permission', icon: Users, label: 'Permissions' },
      ],
    },
    {
      title: 'Payment',
      items: [
        { href: '/payment', icon: BarChart3, label: 'Payment' },
      ],
    },
    {
      title: 'Rationals',
      items: [
        { href: '/rational', icon: BarChart3, label: 'Rationals' },
      ],
    },
    {
      title: 'Services',
      items: [
        { href: '/services', icon: BarChart3, label: 'Services' },
      ],
    },
    {
      title: 'Email',
      items: [
        { href: '/email', icon: FileText, label: 'Email' },
      ],
    },
    {
      title: 'Clients',
      items: [
        { href: '/client', icon: Users, label: 'Client' },
      ],
    },
  ]


  if (!hasMounted) return null

  return (
    <aside className="flex flex-col h-full  bg-gray-50 shadow-md">
      {/* Profile - visible only on mobile */}
      <MobileProfile />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-5" role="navigation">
        {menu.map((section, idx) => (
          <div key={idx}>
            {section.section ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleSection(section.section)}
                  className="flex justify-between items-center w-full px-4 py-2 text-left text-gray-800 font-semibold hover:bg-gray-100 rounded-lg transition"
                  aria-expanded={expandedSections[section.section]}
                >
                  <div className="flex items-center gap-2">
                    <section.icon size={16} />
                    <span>{section.title}</span>
                  </div>
                  {expandedSections[section.section] ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                {expandedSections[section.section] && (
                  <ul className="mt-2 ml-4 space-y-1">
                    {section.items.map((item, i) => (
                      <li key={i}>
                        <NavItem {...item} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item, i) => (
                    <li key={i}>
                      <NavItem {...item} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <footer className="p-4 border-t bg-white text-center text-xs text-gray-500">
        <div className="w-full flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3  rounded-xl hover:bg-red-50 text-left transition-all duration-200 group"
          >
            <div className="bg-red-100 rounded-full p-2 group-hover:bg-red-200 transition-colors">
              <LogOut size={16} className="text-red-600" />
            </div>
            <span className="text-sm font-medium text-red-600">Logout</span>
          </button>
        </div>
      </footer>

    </aside>
  )
}



// components/MobileProfile.tsx
function MobileProfile() {
  const [user, setUser] = useState(null);
  const [isConnect, setIsConnect] = useState(false);

  useEffect(() => {
    const accessToken = Cookies.get('access_token');
    const userInfo = Cookies.get('user_info');
    if (accessToken && userInfo) {
      const decoded = jwtDecode(accessToken);
      setUser({ ...JSON.parse(userInfo), role: decoded.role });
    }
  }, []);

  return (
    <div className="flex items-center gap-3 p-4 border-t border-gray-100 md:hidden">
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <User size={18} className="text-white" />
        </div>
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${isConnect ? "bg-green-500" : "bg-red-500"} rounded-full border-2 border-white`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
        <p className="text-xs text-gray-500">{user?.role || 'Role'}</p>
      </div>
    </div>
  );
}
