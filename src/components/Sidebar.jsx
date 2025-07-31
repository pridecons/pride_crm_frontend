'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { LogOut } from 'lucide-react'
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

  const isActive = (path) => pathname === path

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
      { href: '/dashboard', icon: BarChart3, label: 'Home' },
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
