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
    leads: true,
    configuration: true,
  })

  const toggleSection = (section) => {
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
        flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${isActive(href)
          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
      onClick={onClose}
    >
      <Icon size={16} />
      <span>{children}</span>
    </Link>
  )

  const SectionHeader = ({ title, icon: Icon, isExpanded, onToggle }) => (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-2 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-lg"
    >
      <div className="flex items-center space-x-2">
        <Icon size={16} />
        <span>{title}</span>
      </div>
      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavItem href={`/dashboard`} icon={BarChart3}>Home</NavItem>

        {/* Leads Dropdown */}
        <div className="space-y-1">
          <SectionHeader
            title="Leads"
            icon={FileText}
            isExpanded={expandedSections.leads}
            onToggle={() => toggleSection('leads')}
          />
          {expandedSections.leads && (
            <div className="ml-4 space-y-1">
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
        <div className="space-y-1">
          <SectionHeader
            title="Configuration"
            icon={Settings}
            isExpanded={expandedSections.configuration}
            onToggle={() => toggleSection('configuration')}
          />
          {expandedSections.configuration && (
            <div className="ml-4 space-y-1">
              <NavItem href={`/dashboard/configuration/user`} icon={Users}>Users</NavItem>
              <NavItem href={`/dashboard/configuration/user/add`} icon={UserPlus}>Add User</NavItem>
              <NavItem href={`/dashboard/configuration/attendance`} icon={Clock}>Attendance</NavItem>
            </div>
          )}
        </div>

        {/* Static Links */}
        <NavItem href="#" icon={Mail}>Internal Mailing</NavItem>
        <NavItem href="#" icon={MessageCircle}>Chatting</NavItem>
        <NavItem href="#" icon={Newspaper}>Notice Board</NavItem>
        <NavItem href="#" icon={Palette}>Themes</NavItem>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>System Online</span>
        </div>
      </div>
    </div>
  )
}
