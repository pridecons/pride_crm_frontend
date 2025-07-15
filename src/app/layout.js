import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ErrorBoundary from '@/components/common/ErrorBoundary'
// import { ThemeProvider } from '@/context/ThemeContext'

// Font configurations
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

// Metadata configuration
export const metadata = {
  title: {
    default: 'Pride CRM System',
    template: '%s | Pride CRM',
  },
  description: 'Professional CRM system built with Next.js for Pride Trading Consultancy'
}

// Viewport configuration
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

/**
 * Root Layout Component
 * Provides global context providers, error boundaries, and base styling
 */
export default function RootLayout({ children }) {
  return (
    <html 
      lang="en" 
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body 
        className="antialiased bg-gray-50 text-gray-900 selection:bg-blue-100 selection:text-blue-900"
        suppressHydrationWarning
      >
        {/* Error Boundary to catch and handle React errors */}
        <ErrorBoundary>
          {/* Theme Provider for dark/light mode support */}
          {/* <ThemeProvider> */}
            {/* Authentication Context Provider */}
            <AuthProvider>
              {/* Main Application Content */}
              <div id="app-root" className="min-h-screen">
                {children}
              </div>
              
              {/* Global Toast Notifications */}
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                className="z-50"
                toastClassName="font-sans"
                bodyClassName="text-sm"
                progressClassName="bg-blue-500"
                closeButton={true}
                limit={5}
              />
              
              {/* Global Loading Overlay (if needed) */}
              <div id="loading-overlay" className="hidden" />
              
              {/* Global Modal Portal */}
              <div id="modal-root" />
              
              {/* Global Tooltip Portal */}
              <div id="tooltip-root" />
            </AuthProvider>
          {/* </ThemeProvider> */}
        </ErrorBoundary>
      
      </body>
    </html>
  )
}

/**
 * Loading Component for Suspense boundaries
 */
export function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  )
}

/**
 * Error Component for error boundaries
 */
export function GlobalError({ error, reset }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-gray-50 text-gray-900">
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}