'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-toastify'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, error } = useAuth()
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebar_collapsed')
    if (savedCollapsedState !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsedState))
    }
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Handle route changes
  useEffect(() => {
    const handleRouteChangeStart = () => setPageLoading(true)
    const handleRouteChangeComplete = () => {
      setPageLoading(false)
      setSidebarOpen(false) // Close mobile sidebar on navigation
    }

    // Close mobile sidebar when route changes
    handleRouteChangeComplete()
  }, [pathname])

  // Handle authentication errors
  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Authentication error occurred')
      if (error.status === 401) {
        router.push('/login')
      }
    }
  }, [error, router])

  // Handle mobile sidebar close on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarCollapsed(!sidebarCollapsed)
      }
      
      // Escape to close mobile sidebar
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarCollapsed, sidebarOpen])

  const handleMenuClick = () => {
    setSidebarOpen(true)
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  const handleSidebarToggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // Show loading spinner while authentication is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
            onClick={handleSidebarClose}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 bg-white shadow-xl transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0 lg:shadow-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
        `}>
          <Sidebar 
            onClose={handleSidebarClose}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleSidebarToggleCollapse}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <Header 
            onMenuClick={handleMenuClick}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={handleSidebarToggleCollapse}
          />

          {/* Page loading indicator */}
          {pageLoading && (
            <div className="h-1 bg-blue-200">
              <div className="h-full bg-blue-600 animate-pulse"></div>
            </div>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            {/* Breadcrumb area (optional) */}
            <div className="bg-white border-b border-gray-200">
              <div className="px-4 py-3 sm:px-6 lg:px-8">
                <BreadcrumbNavigation pathname={pathname} />
              </div>
            </div>

            {/* Page content */}
            <div className="px-4 py-6 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </div>
          </main>

          {/* Footer (optional) */}
          <footer className="bg-white border-t border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <DashboardFooter />
            </div>
          </footer>
        </div>

        {/* Mobile keyboard shortcut hint */}
        <div className="hidden lg:block fixed bottom-4 right-4 z-30">
          <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg opacity-0 hover:opacity-100 transition-opacity duration-200">
            Press <kbd className="bg-gray-700 px-1 rounded">Ctrl+B</kbd> to toggle sidebar
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

/**
 * Breadcrumb Navigation Component
 */
function BreadcrumbNavigation({ pathname }) {
  const breadcrumbItems = generateBreadcrumbs(pathname)
  
  if (breadcrumbItems.length <= 1) return null

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-400 mx-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {index === breadcrumbItems.length - 1 ? (
              <span className="text-sm font-medium text-gray-900">
                {item.title}
              </span>
            ) : (
              <a
                href={item.href}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                {item.title}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * Dashboard Footer Component
 */
function DashboardFooter() {
  const { user } = useAuth()
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 space-y-2 sm:space-y-0">
      <div className="flex items-center space-x-4">
        <span>© 2024 Pride Trading Consultancy</span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">v2.1.0</span>
      </div>
      
      {user && (
        <div className="flex items-center space-x-4">
          <span>Welcome, {user.name}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline capitalize">{user.role?.toLowerCase().replace('_', ' ')}</span>
          {user.branch_name && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{user.branch_name}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Generate breadcrumb items from pathname
 */
function generateBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = []

  // Always start with Dashboard
  breadcrumbs.push({
    title: 'Dashboard',
    href: '/dashboard',
  })

  // Build breadcrumbs from path segments
  let currentPath = ''
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`
    
    // Skip the 'dashboard' segment as it's already added
    if (segment === 'dashboard') continue
    
    // Convert segment to title case
    const title = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    breadcrumbs.push({
      title,
      href: currentPath,
    })
  }

  return breadcrumbs
}

/**
 * Custom hook for dashboard layout state
 */
export function useDashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const savedState = localStorage.getItem('sidebar_collapsed')
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState))
    }
  }, [])

  const toggleSidebarCollapsed = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebar_collapsed', JSON.stringify(newState))
  }

  const openSidebar = () => setSidebarOpen(true)
  const closeSidebar = () => setSidebarOpen(false)

  return {
    sidebarCollapsed,
    sidebarOpen,
    toggleSidebarCollapsed,
    openSidebar,
    closeSidebar,
  }
}