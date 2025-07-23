'use client'

import { useState } from 'react'
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import { usePathname } from 'next/navigation'

export default function Main({ children }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const headerHeight = 64 // Adjust based on your Header height in px (e.g., h-16 = 64px)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {pathname !== "/login" && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md z-50">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
      )}

      {/* Sidebar */}
      {pathname !== "/login" && (
        <div
          className="fixed left-0 top-16 w-64 bg-white border-r border-gray-200 shadow-md h-[calc(100vh-64px)] z-40"
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <main
        className={`overflow-y-auto p-6 ${
          pathname !== "/login" ? 'ml-64 mt-16' : ''
        }`}
        style={{ height: `calc(100vh - ${headerHeight}px)` }}
      >
        {children}
      </main>
    </div>
  )
}
