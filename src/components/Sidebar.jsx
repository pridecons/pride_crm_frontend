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
  X,
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
    main: true,
    leads: true,
    configuration: true,
  })

  const toggleSection = (section) => {
    if (isCollapsed) return
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const isActive = (path) => pathname === path

  const NavItem = ({ href, icon: Icon, children }) => (
    <Link
      href={href}
      className={`
        group relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out
        ${isActive(href)
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 border-l-4 border-blue-400'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md hover:scale-[1.02] hover:border-l-4 hover:border-blue-200'
        }
      `}
      onClick={onClose}
    >
      <Icon size={18} className={`transition-transform duration-200 ${isActive(href) ? 'text-blue-100' : 'group-hover:scale-110'}`} />
      <span className="font-semibold tracking-wide">{children}</span>
      {isActive(href) && (
        <div className="absolute right-2 w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
      )}
    </Link>
  )

  const SectionHeader = ({ title, icon: Icon, isExpanded, onToggle }) => (
    <button
      onClick={onToggle}
      className="group flex items-center justify-between w-full px-4 py-3 text-left text-sm font-bold text-gray-800 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
    >
      <div className="flex items-center space-x-3">
        <div className="p-1 rounded-lg bg-gray-100 group-hover:bg-blue-50 transition-colors duration-200">
          <Icon size={16} className="text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
        </div>
        <span className="text-gray-800 font-semibold tracking-wide">{title}</span>
      </div>
      <div className="p-1 rounded-full bg-gray-100 group-hover:bg-blue-50 transition-all duration-200">
        {isExpanded ? 
          <ChevronDown size={14} className="text-gray-500 group-hover:text-blue-600 transition-colors duration-200" /> : 
          <ChevronRight size={14} className="text-gray-500 group-hover:text-blue-600 transition-colors duration-200" />
        }
      </div>
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-gray-100 border-r border-gray-200 shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-gray-500 font-medium">Lead Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="mb-6">
          <NavItem href={`/dashboard`} icon={BarChart3}>Home</NavItem>
        </div>

        {/* Leads Dropdown */}
        <div className="space-y-2">
          <SectionHeader
            title="Leads"
            icon={FileText}
            isExpanded={expandedSections.leads}
            onToggle={() => toggleSection('leads')}
          />
          {expandedSections.leads && (
            <div className="ml-2 space-y-1 pb-2">
              <NavItem href={`/dashboard/leads/add`} icon={Plus}>Add Lead</NavItem>
              <NavItem href={`/dashboard/leads/new`} icon={FileText}>New Leads</NavItem>
              <NavItem href={`/dashboard/leads/old`} icon={Clock}>Old Leads</NavItem>
              <NavItem href={`/dashboard/leads/fetch`} icon={Clock}>Today's Follow Up</NavItem>
              <NavItem href={`/dashboard/leads/web`} icon={Globe}>Web Leads</NavItem>
              <NavItem href={`/dashboard/leads/source`} icon={Target}>Lead Sources</NavItem>
              <NavItem href={`/dashboard/leads/responses`} icon={Target}>Lead Responses</NavItem>
              <NavItem href={`/dashboard/leads/upload`} icon={Target}>Upload Leads</NavItem>
              <NavItem href={`/dashboard/leads/disposed`} icon={Trash2}>Disposed Leads</NavItem>
            </div>
          )}
        </div>

        {/* Configuration Dropdown */}
        <div className="space-y-2">
          <SectionHeader
            title="Configuration"
            icon={Settings}
            isExpanded={expandedSections.configuration}
            onToggle={() => toggleSection('configuration')}
          />
          {expandedSections.configuration && (
            <div className="ml-2 space-y-1 pb-2">
              <NavItem href={`/dashboard/configuration/user`} icon={Users}>Users</NavItem>
              <NavItem href={`/dashboard/configuration/user/add`} icon={UserPlus}>Add User</NavItem>
              <NavItem href={`/dashboard/configuration/attendance`} icon={Clock}>Attendance</NavItem>
            </div>
          )}
        </div>

        {/* Static Links */}
        <div className="pt-4 border-t border-gray-200 space-y-1">
          <NavItem href="#" icon={Mail}>Internal Mailing</NavItem>
          <NavItem href="#" icon={MessageCircle}>Chatting</NavItem>
          <NavItem href="#" icon={Newspaper}>Notice Board</NavItem>
          <NavItem href="#" icon={Palette}>Themes</NavItem>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg"></div>
              <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">System Online</span>
              <p className="text-xs text-gray-500">All services operational</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 font-medium">
            v2.1.0
          </div>
        </div>
      </div>
    </div>
  )
}