'use client'
import { Component } from 'react'

/**
 * ErrorBoundary Class Component
 * Catches JavaScript errors anywhere in the child component tree
 * Logs error details and displays a fallback UI
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now().toString()
    }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo)
  }

  reportError = (error, errorInfo) => {
    // Example: Send to error tracking service
    try {
      // You can integrate with services like Sentry, LogRocket, etc.
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(), // Get from your auth context
        errorId: this.state.errorId
      }

      // Example API call to log error
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // })

      console.log('Error report:', errorReport)
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  getUserId = () => {
    // Get user ID from your auth context or cookies
    try {
      // Example: return user ID from context or localStorage
      return localStorage.getItem('userId') || 'anonymous'
    } catch {
      return 'anonymous'
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry)
      }

      // Custom error component from props
      if (this.props.errorComponent) {
        return (
          <this.props.errorComponent 
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
          />
        )
      }

      // Default error UI
      return (
        <DefaultErrorUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          showDetails={this.props.showDetails || false}
          level={this.props.level || 'page'}
        />
      )
    }

    // No error, render children normally
    return this.props.children
  }
}

/**
 * Default Error UI Component
 */
function DefaultErrorUI({ 
  error, 
  errorInfo, 
  errorId, 
  onRetry, 
  onReload, 
  showDetails,
  level 
}) {
  const isPageLevel = level === 'page'
  const isComponentLevel = level === 'component'

  const containerClasses = isPageLevel 
    ? 'min-h-screen flex items-center justify-center bg-gray-50 p-4'
    : 'flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg'

  const cardClasses = isPageLevel
    ? 'max-w-lg w-full bg-white shadow-xl rounded-lg p-8'
    : 'w-full bg-white shadow-sm rounded-md p-6'

  return (
    <div className={containerClasses}>
      <div className={cardClasses}>
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-6">
          <h2 className={`font-bold text-gray-900 mb-2 ${isPageLevel ? 'text-2xl' : 'text-xl'}`}>
            {isPageLevel ? 'Oops! Something went wrong' : 'Component Error'}
          </h2>
          <p className="text-gray-600">
            {isPageLevel 
              ? 'We encountered an unexpected error. Please try again or contact support if the problem persists.'
              : 'This component encountered an error and cannot be displayed.'
            }
          </p>
        </div>

        {/* Error ID */}
        {errorId && (
          <div className="bg-gray-100 rounded-md p-3 mb-6">
            <p className="text-sm text-gray-600 text-center">
              Error ID: <code className="bg-gray-200 px-1 rounded text-xs">{errorId}</code>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          {isPageLevel && (
            <button
              onClick={onReload}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
            >
              Reload Page
            </button>
          )}
        </div>

        {/* Error Details (Development) */}
        {showDetails && error && (
          <ErrorDetails error={error} errorInfo={errorInfo} />
        )}

        {/* Support Contact */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Error Details Component (for development)
 */
function ErrorDetails({ error, errorInfo }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="mt-6 border-t pt-6">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <span>Technical Details</span>
        <svg 
          className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showDetails && (
        <div className="mt-3 space-y-3">
          {/* Error Message */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Error Message:</h4>
            <code className="block text-xs bg-red-50 border border-red-200 rounded p-2 text-red-800">
              {error.message}
            </code>
          </div>

          {/* Stack Trace */}
          {error.stack && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Stack Trace:</h4>
              <code className="block text-xs bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 overflow-auto max-h-32">
                {error.stack}
              </code>
            </div>
          )}

          {/* Component Stack */}
          {errorInfo?.componentStack && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Component Stack:</h4>
              <code className="block text-xs bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 overflow-auto max-h-32">
                {errorInfo.componentStack}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Hook for using error boundaries with function components
export function useErrorHandler() {
  return (error, errorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo)
    
    // You can also trigger error reporting here
    // reportError(error, errorInfo)
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary(WrappedComponent, errorBoundaryConfig = {}) {
  const ComponentWithErrorBoundary = (props) => {
    return (
      <ErrorBoundary {...errorBoundaryConfig}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`

  return ComponentWithErrorBoundary
}

// Specialized error boundaries for different use cases
export function PageErrorBoundary({ children, ...props }) {
  return (
    <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'} {...props}>
      {children}
    </ErrorBoundary>
  )
}

export function ComponentErrorBoundary({ children, ...props }) {
  return (
    <ErrorBoundary level="component" {...props}>
      {children}
    </ErrorBoundary>
  )
}

export function FormErrorBoundary({ children, onError, ...props }) {
  const fallback = (error, retry) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Form Error</h3>
          <p className="text-sm text-red-600 mt-1">
            There was an error with this form. Please try again.
          </p>
        </div>
        <button
          onClick={retry}
          className="ml-4 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <ErrorBoundary fallback={fallback} {...props}>
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary