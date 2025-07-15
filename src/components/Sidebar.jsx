'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
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

// Simplified permission checking function
const checkPermission = (userRole, requiredPermissions) => {
  // If no permissions required, allow access
  if (!requiredPermissions || requiredPermissions.length === 0) return true
  
  // If no user role, deny access
  if (!userRole) return false
  
  // For SUPERADMIN, always allow
  if (userRole === 'SUPERADMIN') return true
  
  // Role-based permissions mapping
  const rolePermissions = {
    SUPERADMIN: Object.values(PERMISSIONS),
    BRANCH_MANAGER: [
      PERMISSIONS.ADD_USER, PERMISSIONS.EDIT_USER, PERMISSIONS.VIEW_USERS,
      PERMISSIONS.ADD_LEAD, PERMISSIONS.EDIT_LEAD, PERMISSIONS.DELETE_LEAD, PERMISSIONS.VIEW_LEAD,
      PERMISSIONS.VIEW_BRANCH, PERMISSIONS.VIEW_ACCOUNTS, PERMISSIONS.VIEW_RESEARCH,
      PERMISSIONS.VIEW_CLIENT, PERMISSIONS.VIEW_PAYMENT, PERMISSIONS.VIEW_INVOICE, PERMISSIONS.VIEW_KYC,
      PERMISSIONS.APPROVAL, PERMISSIONS.INTERNAL_MAILING, PERMISSIONS.CHATTING,
      PERMISSIONS.TARGETS, PERMISSIONS.REPORTS, PERMISSIONS.FETCH_LEAD
    ],
    SALES_MANAGER: [
      PERMISSIONS.VIEW_USERS, PERMISSIONS.ADD_LEAD, PERMISSIONS.EDIT_LEAD, PERMISSIONS.VIEW_LEAD,
      PERMISSIONS.VIEW_ACCOUNTS, PERMISSIONS.VIEW_RESEARCH, PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.VIEW_PAYMENT, PERMISSIONS.VIEW_INVOICE, PERMISSIONS.VIEW_KYC,
      PERMISSIONS.INTERNAL_MAILING, PERMISSIONS.CHATTING, PERMISSIONS.TARGETS,
      PERMISSIONS.REPORTS, PERMISSIONS.FETCH_LEAD
    ],
    HR: [
      PERMISSIONS.ADD_USER, PERMISSIONS.EDIT_USER, PERMISSIONS.VIEW_USERS,
      PERMISSIONS.VIEW_BRANCH, PERMISSIONS.INTERNAL_MAILING, PERMISSIONS.CHATTING,
      PERMISSIONS.REPORTS
    ],
    TL: [
      PERMISSIONS.VIEW_USERS, PERMISSIONS.ADD_LEAD, PERMISSIONS.EDIT_LEAD, PERMISSIONS.VIEW_LEAD,
      PERMISSIONS.VIEW_ACCOUNTS, PERMISSIONS.VIEW_RESEARCH, PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.VIEW_PAYMENT, PERMISSIONS.VIEW_INVOICE, PERMISSIONS.VIEW_KYC,
      PERMISSIONS.INTERNAL_MAILING, PERMISSIONS.CHATTING, PERMISSIONS.TARGETS,
      PERMISSIONS.REPORTS, PERMISSIONS.FETCH_LEAD
    ],
    SBA: [
      PERMISSIONS.ADD_LEAD, PERMISSIONS.EDIT_LEAD, PERMISSIONS.VIEW_LEAD,
      PERMISSIONS.VIEW_ACCOUNTS, PERMISSIONS.VIEW_RESEARCH, PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.VIEW_PAYMENT, PERMISSIONS.VIEW_INVOICE, PERMISSIONS.VIEW_KYC,
      PERMISSIONS.CHATTING, PERMISSIONS.FETCH_LEAD
    ],
    BA: [
      PERMISSIONS.ADD_LEAD, PERMISSIONS.EDIT_LEAD, PERMISSIONS.VIEW_LEAD,
      PERMISSIONS.VIEW_ACCOUNTS, PERMISSIONS.VIEW_RESEARCH, PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.VIEW_PAYMENT, PERMISSIONS.VIEW_INVOICE, PERMISSIONS.VIEW_KYC,
      PERMISSIONS.CHATTING, PERMISSIONS.FETCH_LEAD
    ]
  }
  
  const userPermissions = rolePermissions[userRole] || []
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

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
        icon: MessageCircle,
        requiredPermissions: [PERMISSIONS.VIEW_LEAD],
      },
      {
        id: 'bulk-upload',
        label: 'Bulk Upload',
        href: '/dashboard/leads/bulk',
        icon: FileText,
        requiredPermissions: [PERMISSIONS.ADD_LEAD],
      },
      {
        id: 'delete-leads',
        label: 'Delete Leads',
        href: '/dashboard/leads/delete',
        icon: Trash2,
        requiredPermissions: [PERMISSIONS.DELETE_LEAD],
      },
    ],
  },
  users: {
    title: 'User Management',
    icon: Users,
    requiredPermissions: [PERMISSIONS.VIEW_USERS],
    items: [
      {
        id: 'manage-users',
        label: 'Manage Users',
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
      {
        id: 'user-permissions',
        label: 'Permissions',
        href: '/dashboard/users/permissions',
        icon: Shield,
        requiredPermissions: [PERMISSIONS.EDIT_USER],
      },
    ],
  },
  branches: {
    title: 'Branch Management',
    icon: Building2,
    requiredPermissions: [PERMISSIONS.VIEW_BRANCH],
    items: [
      {
        id: 'manage-branches',
        label: 'Manage Branches',
        href: '/dashboard/branches',
        icon: Building2,
        requiredPermissions: [PERMISSIONS.VIEW_BRANCH],
      },
      {
        id: 'add-branch',
        label: 'Add Branch',
        href: '/dashboard/branches/add',
        icon: Plus,
        requiredPermissions: [PERMISSIONS.ADD_USER], // Using ADD_USER as proxy for branch creation
      },
    ],
  },
  business: {
    title: 'Business Operations',
    icon: BarChart3,
    requiredPermissions: [PERMISSIONS.VIEW_ACCOUNTS],
    items: [
      {
        id: 'services',
        label: 'Services',
        href: '/dashboard/services',
        icon: Settings,
        requiredPermissions: [PERMISSIONS.VIEW_ACCOUNTS],
      },
      {
        id: 'kyc-verification',
        label: 'KYC Verification',
        href: '/dashboard/kyc',
        icon: Shield,
        requiredPermissions: [PERMISSIONS.VIEW_KYC],
      },
      {
        id: 'pan-verification',
        label: 'PAN Verification',
        href: '/dashboard/pan',
        icon: CreditCard,
        requiredPermissions: [PERMISSIONS.VIEW_PAYMENT],
      },
    ],
  },
  finance: {
    title: 'Finance',
    icon: DollarSign,
    requiredPermissions: [PERMISSIONS.VIEW_PAYMENT],
    items: [
      {
        id: 'payments',
        label: 'Payments',
        href: '/dashboard/payments',
        icon: DollarSign,
        requiredPermissions: [PERMISSIONS.VIEW_PAYMENT],
      },
      {
        id: 'cashfree',
        label: 'Cashfree',
        href: '/dashboard/cashfree',
        icon: CreditCard,
        requiredPermissions: [PERMISSIONS.VIEW_PAYMENT],
      },
    ],
  },
  reports: {
    title: 'Reports & Analytics',
    icon: BarChart3,
    requiredPermissions: [PERMISSIONS.REPORTS],
    items: [
      {
        id: 'lead-reports',
        label: 'Lead Reports',
        href: '/dashboard/reports/leads',
        icon: Target,
        requiredPermissions: [PERMISSIONS.REPORTS],
      },
      {
        id: 'user-reports',
        label: 'User Reports',
        href: '/dashboard/reports/users',
        icon: Users,
        requiredPermissions: [PERMISSIONS.REPORTS],
      },
      {
        id: 'branch-reports',
        label: 'Branch Reports',
        href: '/dashboard/reports/branches',
        icon: Building2,
        requiredPermissions: [PERMISSIONS.REPORTS],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        href: '/dashboard/analytics',
        icon: BarChart3,
        requiredPermissions: [PERMISSIONS.REPORTS],
      },
    ],
  },
  configuration: {
    title: 'Configuration',
    icon: Settings,
    requiredPermissions: [PERMISSIONS.APPROVAL],
    items: [
      {
        id: 'settings',
        label: 'System Settings',
        href: '/dashboard/settings',
        icon: Settings,
        requiredPermissions: [PERMISSIONS.APPROVAL],
      },
      {
        id: 'themes',
        label: 'Themes',
        href: '/dashboard/themes',
        icon: Palette,
        requiredPermissions: [PERMISSIONS.APPROVAL],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: '/dashboard/notifications',
        icon: Bell,
        requiredPermissions: [PERMISSIONS.APPROVAL],
      },
    ],
  },
  communication: {
    title: 'Communication',
    icon: MessageCircle,
    requiredPermissions: [PERMISSIONS.INTERNAL_MAILING],
    items: [
      {
        id: 'email',
        label: 'Email',
        href: '/dashboard/communication/email',
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
  const { user, isAuthenticated } = useAuth()
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    leads: true,
    users: false,
    branches: false,
    business: false,
    finance: false,
    reports: false,
    configuration: false,
    communication: false,
  })

  // Debug information
  useEffect(() => {
    console.log('🔍 Sidebar Debug Info:', {
      user,
      isAuthenticated,
      userRole: user?.role,
      userName: user?.name,
      isCollapsed,
      pathname
    })
  }, [user, isAuthenticated, isCollapsed, pathname])

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
    if (isCollapsed) return
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
    return checkPermission(user?.role, requiredPermissions)
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
            active ? 'scale-110' : 'group-hover:scale-105'
          }`}
        />
        {!isCollapsed && (
          <span className="truncate">{item.label}</span>
        )}
        
        {active && !isCollapsed && (
          <div className="absolute right-2 w-2 h-2 bg-white rounded-full opacity-80" />
        )}
      </Link>
    )
  }

  const SectionHeader = ({ section, sectionKey }) => {
    const Icon = section.icon
    const isExpanded = expandedSections[sectionKey]
    const hasItems = section.items && section.items.length > 0
    const filteredItems = hasItems ? filterNavigationItems(section.items) : []
    const hasVisibleItems = filteredItems.length > 0

    if (!hasVisibleItems && hasItems) return null

    return (
      <div className="mb-2">
        {!isCollapsed && (
          <button
            onClick={() => toggleSection(sectionKey)}
            className={`
              w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 transition-colors duration-200
              ${hasItems ? 'cursor-pointer' : 'cursor-default'}
            `}
            disabled={!hasItems}
          >
            <div className="flex items-center space-x-2">
              {Icon && <Icon size={14} />}
              <span>{section.title}</span>
            </div>
            {hasItems && (
              <ChevronRight 
                size={14} 
                className={`transform transition-transform duration-200 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            )}
          </button>
        )}
        
        {isCollapsed && Icon && hasVisibleItems && (
          <div className="flex justify-center py-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-200">
              <Icon size={16} />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Show loading state if auth is not ready
  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-r border-gray-200">
        <div className="text-center text-gray-500">
          <Users size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Show debug info if no user
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-r border-gray-200">
        <div className="text-center text-red-500">
          <Users size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No user data found</p>
          <p className="text-xs mt-1">Check authentication</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 shadow-sm">
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Pride CRM</h1>
              <p className="text-xs text-gray-500">Trading Consultancy</p>
            </div>
          </div>
        )}
        
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-500 hover:text-gray-700"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
        </button>
      </div>

      {/* User info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {user.role?.toLowerCase().replace('_', ' ') || 'No Role'}
              </p>
              {user.branch_name && (
                <p className="text-xs text-gray-400 truncate">
                  {user.branch_name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {Object.entries(NAVIGATION_STRUCTURE).map(([sectionKey, section]) => {
          // Check if user has permission to see this section
          if (!hasPermission(section.requiredPermissions)) {
            return null
          }

          const filteredItems = section.items ? filterNavigationItems(section.items) : []
          const isExpanded = expandedSections[sectionKey]

          return (
            <div key={sectionKey}>
              <SectionHeader section={section} sectionKey={sectionKey} />
              
              {section.items && (isCollapsed || isExpanded) && (
                <div className={`space-y-1 ${isCollapsed ? '' : 'mb-4'}`}>
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
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Pride CRM v2.1.0</span>
            <Link 
              href="/dashboard/help"
              className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-200"
            >
              <HelpCircle size={12} />
              <span>Help</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}