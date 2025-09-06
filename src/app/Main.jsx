'use client';
import './polyfills'
import { useState } from 'react'
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { PermissionsProvider } from '@/context/PermissionsContext' 

export default function Main({ children }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const headerHeight = 64 // Adjust based on your Header height in px (e.g., h-16 = 64px)

  return (
    <PermissionsProvider>
    <div className="min-h-screen bg-gray-50">
      <Toaster
        position="bottom-center"
        reverseOrder={false}
      />
      {/* Header */}
      {pathname !== "/login" && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md z-50">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
      )}

      {/* Sidebar */}
      {pathname !== "/login" && (
        <div
          className="fixed left-0 top-16 w-64 bg-white border-r border-gray-200 shadow-md h-[calc(100vh-64px)] z-40 hidden lg:block"
        >
          <Sidebar onClose={() => setSidebarOpen(false)}  />
        </div>
      )}
      {pathname !== "/login" && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-200 opacity-60"
            onClick={() => setSidebarOpen(false)}
          ></div>

          {/* Sidebar panel */}
          <div className="relative w-64 bg-white h-full shadow-md z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}


      {/* Main Content */}
      <main
        className={`${
          pathname !== "/login" ? 'lg:ml-64 mt-16' : ''
        }`}
      >
        {children}
      </main>
    </div>
    </PermissionsProvider>
  )
}
