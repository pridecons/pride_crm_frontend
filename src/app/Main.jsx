'use client'

import { useState } from 'react'
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import { usePathname } from 'next/navigation'

export default function Main({ children }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      {pathname !== "/login" && (
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      )}

      {/* Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {pathname !== "/login" && (
          <div className="w-64 bg-white border-r border-gray-200 shadow-md overflow-y-auto">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
