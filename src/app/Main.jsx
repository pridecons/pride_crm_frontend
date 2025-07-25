'use client'

import { useState } from 'react'
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'

export default function Main({ children }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const headerHeight = 64 // Adjust based on your Header height in px (e.g., h-16 = 64px)

  return (
    <div className="min-h-[100vh] bg-gray-50">
      <Toaster
        position="bottom-center"
        reverseOrder={false}
      /> 
      {/* Header */}
      {pathname !== "/login" && (
        <div className="fixed top-0 left-0 right-0 h-8 bg-white shadow-md z-50">
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
        className={`${
          pathname !== "/login" ? 'ml-64 mt-16' : ''
        } px-2`}
      >
        {children}
      </main>
    </div>
  )
}
