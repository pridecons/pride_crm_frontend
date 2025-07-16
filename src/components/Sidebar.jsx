'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  UserPlus,
  Clock,
  Globe,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
  Building,
  Plus,
  FileText,
  Target,
  BarChart3,
  Mail,
  MessageCircle,
  Newspaper,
  Palette
} from 'lucide-react'

export default function Sidebar({ branchId, onClose }) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState({
    leads: true,
    configuration: true
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const isActive = (path) => pathname === path

  const NavItem = ({ href, icon: Icon, label }) => (
    <Link
      href={href}
      className={`
        flex items-center space-x-3 px-4 py-3 rounded-lg transition
        ${isActive(href)
          ? 'bg-blue-600 text-white font-semibold'
          : 'text-gray-700 hover:bg-gray-100'
        }
      `}
      onClick={onClose}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )

  // ✅ Define menu structure
  const menu = [
    {
      title: 'Main',
      items: [
        { href: '/dashboard', icon: BarChart3, label: 'Home' }
      ]
    },
    {
      title: 'Leads',
      section: 'leads',
      icon: FileText,
      items: [
        { href: '/lead', icon: Target, label: 'Lead' },
        { href: '/lead/add', icon: Plus, label: 'Add Lead' },
        { href: '/lead/manage', icon: FileText, label: 'ManageLeads' },
      ]
    },
    {
      title: 'User',
      items: [
        { href: '/user', icon: Users, label: 'Users' },
      ]
    }
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200 shadow">
      {/* Header */}
      <div className="p-6 border-b bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Dashboard</h1>
            <p className="text-xs text-gray-500">Lead Management System</p>
          </div>
        </div>
      </div>

      {/* Dynamic Navigation */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {menu.map((section, idx) => (
          <div key={idx}>
            {section.section ? (
              <>
                <button
                  onClick={() => toggleSection(section.section)}
                  className="flex justify-between items-center w-full px-4 py-2 text-left text-gray-800 font-semibold hover:bg-gray-100 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
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
                  <div className="ml-4 mt-1 space-y-1">
                    {section.items.map((item, i) => (
                      <NavItem key={i} href={item.href} icon={item.icon} label={item.label} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs text-gray-500 font-bold mb-2">{section.title}</p>
                {section.items.map((item, i) => (
                  <NavItem key={i} href={item.href} icon={item.icon} label={item.label} />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t bg-white text-xs text-gray-500 text-center">
        v2.1.0 • System Online
      </div>
    </div>
  )
}
