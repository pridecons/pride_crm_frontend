'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { PermissionManager, NavigationHelper } from '@/config/roles'
import { PERMISSIONS } from '@/utils/constants'
import {
  // Navigation Icons
  Home,
  Users,
  UserPlus,
  Building2,
  Target,
  FileText,
  Plus,
  Clock,
  Globe,
  Trash2,
  Settings,
  BarChart3,
  DollarSign,
  CreditCard,
  Shield,
  Search,
  Mail,
  MessageCircle,
  Newspaper,
  Palette,
  Bell,
  HelpCircle,
  
  // UI Icons
  ChevronDown,
  ChevronRight,
  X,
  Menu,
  Minimize2,
  Maximize2,
} from 'lucide-react'

const NAVIGATION_STRUCTURE = {
  main: {
    title: 'Main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        requiredPermissions: [],
      },
    ],
  },
  leads: {
    title: 'Lead Management',
    icon: Target,
    requiredPermissions: [PERMISSIONS.VIEW_LEAD],
    items: [
      {
        id: 'add-lead',
        label: 'Add Lead',
        href: '/dashboard/leads/add',
        icon: Plus,
        requiredPermissions: [PERMISSIONS.ADD_LEAD],
      },
      {
        id: 'manage-leads',
        label: 'Manage Leads',
        href: '/dashboard/leads/manage',
        icon: FileText,
        requiredPermissions: [PERMISSIONS.VIEW_LEAD],
      },
      {
        id: 'new-leads',
        label: 'New Leads',
        href: '/dashboard/leads/new',
        icon: FileText,
        requiredPermissions: [PERMISSIONS.VIEW_LEAD],
      },
      {
        id: 'follow-up',
        label: "Today's Follow Up",
        href: '/dashboard/leads/fetch',
        icon: Clock,
        requiredPermissions: [PERMISSIONS.VIEW_LEAD],
      },
      {
        id: 'web-leads',
        label: 'Web Leads',
        href: '/dashboard/leads/web',
        icon: Globe,
        requiredPermissions: [PERMISSIONS.VIEW_LEAD],
      },
      {
        id: 'lead-sources',
        label: 'Lead Sources',
        href: '/dashboard/leads/sources',
        icon: Target,
        requiredPermissions: [PERMISSIONS.VIEW_LEAD],
      },
      {
        id: 'lead-responses',
        label: 'Lead Responses',
        href: '/dashboard/leads/responses',
        icon: Target,
        requiredPermissions: [PERMISSIONS.VIEW_LEAD],
      },
      {
        id: 'upload-leads',
        label: 'Upload Leads',
        href: '/dashboard/leads/upload',
        icon: Plus,
        requiredPermissions: [PERMISSIONS.ADD_LEAD],
      },
      {
        id: 'disposed-leads',
        label: 'Disposed Leads',
        href: '/dashboard/leads/disposed',
        icon: Trash2,
        requiredPermissions: [PERMISSIONS.VIEW_LEAD],
      },
    ],
  },
  users: {
    title: 'User Management',
    icon: Users,
    requiredPermissions: [PERMISSIONS.VIEW_USERS],
    items: [
      {
        id: 'users-list',
        label: 'Users',
        href: '/dashboard/users',
        icon: Users,
        requiredPermissions: [PERMISSIONS.VIEW_USERS],
      },
      {
        id: 'add-user',
        label: 'Add User',
        href: '/dashboard/users/add',
        icon: UserPlus,
        requiredPermissions: [PERMISSIONS.ADD_USER],
      },
    ],
  },
  branches: {
    title: 'Branch Management',
    icon: Building2,
    requiredPermissions: [PERMISSIONS.VIEW_BRANCH],
    items: [
      {
        id: 'branches-list',
        label: 'Branches',
        href: '/dashboard/branches',
        icon: Building2,
        requiredPermissions: [PERMISSIONS.VIEW_BRANCH],
      },
    ],
  },
  business: {
    title: 'Business Operations',
    icon: BarChart3,
    requiredPermissions: [
      PERMISSIONS.VIEW_ACCOUNTS,
      PERMISSIONS.VIEW_RESEARCH,
      PERMISSIONS.VIEW_CLIENT,
    ],
    items: [
      {
        id: 'accounts',
        label: 'Accounts',
        href: '/dashboard/accounts',
        icon: CreditCard,
        requiredPermissions: [PERMISSIONS.VIEW_ACCOUNTS],
      },
      {
        id: 'research',
        label: 'Research',
        href: '/dashboard/research',
        icon: Search,
        requiredPermissions: [PERMISSIONS.VIEW_RESEARCH],
      },
      {
        id: 'clients',
        label: 'Clients',
        href: '/dashboard/clients',
        icon: Users,
        requiredPermissions: [PERMISSIONS.VIEW_CLIENT],
      },
    ],
  },
  finance: {
    title: 'Finance & KYC',
    icon: DollarSign,
    requiredPermissions: [
      PERMISSIONS.VIEW_PAYMENT,
      PERMISSIONS.VIEW_INVOICE,
      PERMISSIONS.VIEW_KYC,
    ],
    items: [
      {
        id: 'payments',
        label: 'Payments',
        href: '/dashboard/payments',
        icon: DollarSign,
        requiredPermissions: [PERMISSIONS.VIEW_PAYMENT],
      },
      {
        id: 'invoices',
        label: 'Invoices',
        href: '/dashboard/invoices',
        icon: FileText,
        requiredPermissions: [PERMISSIONS.VIEW_INVOICE],
      },
      {
        id: 'kyc',
        label: 'KYC',
        href: '/dashboard/kyc',
        icon: Shield,
        requiredPermissions: [PERMISSIONS.VIEW_KYC],
      },
    ],
  },
  reports: {
    title: 'Reports & Analytics',
    icon: BarChart3,
    requiredPermissions: [PERMISSIONS.REPORTS],
    items: [
      {
        id: 'reports',
        label: 'Reports',
        href: '/dashboard/reports',
        icon: BarChart3,
        requiredPermissions: [PERMISSIONS.REPORTS],
      },
      {
        id: 'targets',
        label: 'Targets',
        href: '/dashboard/targets',
        icon: Target,
        requiredPermissions: [PERMISSIONS.TARGETS],
      },
    ],
  },
  configuration: {
    title: 'Configuration',
    icon: Settings,
    requiredPermissions: [PERMISSIONS.APPROVAL],
    items: [
      {
        id: 'permissions',
        label: 'Permissions',
        href: '/dashboard/configuration/permissions',
        icon: Shield,
        requiredPermissions: [PERMISSIONS.APPROVAL],
      },
      {
        id: 'attendance',
        label: 'Attendance',
        href: '/dashboard/configuration/attendance',
        icon: Clock,
        requiredPermissions: [PERMISSIONS.APPROVAL],
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/dashboard/configuration/settings',
        icon: Settings,
        requiredPermissions: [PERMISSIONS.APPROVAL],
      },
    ],
  },
  communication: {
    title: 'Communication',
    icon: Mail,
    requiredPermissions: [PERMISSIONS.INTERNAL_MAILING, PERMISSIONS.CHATTING],
    items: [
      {
        id: 'internal-mail',
        label: 'Internal Mailing',
        href: '/dashboard/communication/mail',
        icon: Mail,
        requiredPermissions: [PERMISSIONS.INTERNAL_MAILING],
      },
      {
        id: 'chat',
        label: 'Chat',
        href: '/dashboard/communication/chat',
        icon: MessageCircle,
        requiredPermissions: [PERMISSIONS.CHATTING],
      },
      {
        id: 'notice-board',
        label: 'Notice Board',
        href: '/dashboard/communication/notices',
        icon: Newspaper,
        requiredPermissions: [PERMISSIONS.INTERNAL_MAILING],
      },
    ],
  },
}

export default function Sidebar({ onClose, isCollapsed, onToggleCollapse }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [expandedSections, setExpandedSections] = useState({
    leads: true,
    users: false,
    branches: false,
    business: false,
    finance: false,
    reports: false,
    configuration: false,
    communication: false,
  })

  // Auto-expand active sections
  useEffect(() => {
    Object.keys(NAVIGATION_STRUCTURE).forEach(sectionKey => {
      const section = NAVIGATION_STRUCTURE[sectionKey]
      if (section.items) {
        const hasActiveItem = section.items.some(item => pathname.startsWith(item.href))
        if (hasActiveItem) {
          setExpandedSections(prev => ({ ...prev, [sectionKey]: true }))
        }
      }
    })
  }, [pathname])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const isActive = (path) => {
    if (path === '/dashboard') {
      return pathname === path
    }
    return pathname.startsWith(path)
  }

  const hasPermission = (requiredPermissions) => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true
    if (!user?.role) return false
    return PermissionManager.hasAnyPermission(user.role, requiredPermissions)
  }

  const filterNavigationItems = (items) => {
    return items.filter(item => hasPermission(item.requiredPermissions))
  }

  const NavItem = ({ item, isSubItem = false }) => {
    const Icon = item.icon
    const active = isActive(item.href)
    
    return (
      <Link
        href={item.href}
        className={`
          group relative flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out
          ${isSubItem ? 'ml-6' : ''}
          ${active
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
          }
          ${isCollapsed ? 'justify-center px-2' : ''}
        `}
        onClick={onClose}
        title={isCollapsed ? item.label : ''}
      >
        <Icon 
          size={18} 
          className={`transition-transform duration-200 ${
            active ? 'text-blue-100' : 'group-hover:scale-110'
          }`} 
        />
        {!isCollapsed && (
          <>
            <span className="font-medium tracking-wide">{item.label}</span>
            {active && (
              <div className="absolute right-2 w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
            )}
          </>
        )}
      </Link>
    )
  }

  const SectionHeader = ({ section, sectionKey, isExpanded, onToggle }) => {
    const Icon = section.icon
    
    if (isCollapsed) return null
    
    return (
      <button
        onClick={onToggle}
        className="group flex items-center justify-between w-full px-4 py-3 text-left text-sm font-bold text-gray-800 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-lg transition-all duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="p-1 rounded-lg bg-gray-100 group-hover:bg-blue-50 transition-colors duration-200">
            <Icon size={16} className="text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
          </div>
          <span className="text-gray-800 font-semibold tracking-wide">{section.title}</span>
        </div>
        <div className="p-1 rounded-full bg-gray-100 group-hover:bg-blue-50 transition-all duration-200">
          {isExpanded ? (
            <ChevronDown size={14} className="text-gray-500 group-hover:text-blue-600 transition-colors duration-200" />
          ) : (
            <ChevronRight size={14} className="text-gray-500 group-hover:text-blue-600 transition-colors duration-200" />
          )}
        </div>
      </button>
    )
  }

  const renderNavigationSection = (sectionKey, section) => {
    // Check if user has permission to see this section
    if (!hasPermission(section.requiredPermissions)) return null

    // For main section (no grouping)
    if (sectionKey === 'main') {
      return (
        <div key={sectionKey} className="space-y-1">
          {filterNavigationItems(section.items).map(item => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
      )
    }

    // For grouped sections
    const filteredItems = filterNavigationItems(section.items || [])
    if (filteredItems.length === 0) return null

    const isExpanded = expandedSections[sectionKey]

    return (
      <div key={sectionKey} className="space-y-1">
        <SectionHeader
          section={section}
          sectionKey={sectionKey}
          isExpanded={isExpanded}
          onToggle={() => toggleSection(sectionKey)}
        />
        {(isExpanded || isCollapsed) && (
          <div className={`space-y-1 ${isCollapsed ? '' : 'pb-2'}`}>
            {filteredItems.map(item => (
              <NavItem 
                key={item.id} 
                item={item} 
                isSubItem={!isCollapsed}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`
      flex flex-col h-full bg-gradient-to-br from-slate-50 to-gray-100 border-r border-gray-200 shadow-xl
      transition-all duration-300 ease-in-out
      ${isCollapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Pride CRM</h1>
                <p className="text-xs text-gray-500 font-medium">Management System</p>
              </div>
            </div>
          )}
          
          {/* Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden transition-colors duration-200"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {Object.entries(NAVIGATION_STRUCTURE).map(([sectionKey, section]) =>
          renderNavigationSection(sectionKey, section)
        )}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
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
      )}
      
      {/* User Info (collapsed state) */}
      {isCollapsed && user && (
        <div className="p-3 border-t border-gray-200 bg-white shadow-sm">
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}