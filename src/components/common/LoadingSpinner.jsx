'use client'

/**
 * LoadingSpinner Component
 * Reusable loading indicator with multiple variants and configurations
 * 
 * @param {Object} props
 * @param {string} props.size - Size variant: 'xs', 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} props.variant - Style variant: 'spinner', 'dots', 'pulse', 'bars', 'ring' (default: 'spinner')
 * @param {string} props.color - Color variant: 'blue', 'white', 'gray', 'green', 'red', 'yellow', 'purple' (default: 'blue')
 * @param {string} props.text - Optional loading text
 * @param {boolean} props.fullScreen - Whether to display full screen overlay
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.speed - Animation speed: 'slow', 'normal', 'fast' (default: 'normal')
 * @param {boolean} props.center - Whether to center the spinner (default: false)
 */
export default function LoadingSpinner({ 
  size = 'md', 
  variant = 'spinner',
  color = 'blue',
  text = '',
  fullScreen = false,
  className = '',
  speed = 'normal',
  center = false
}) {
  // Size configurations
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  // Color configurations
  const colorClasses = {
    blue: {
      primary: 'text-blue-600 border-blue-600',
      secondary: 'text-blue-200 border-blue-200',
      bg: 'bg-blue-600'
    },
    white: {
      primary: 'text-white border-white',
      secondary: 'text-gray-300 border-gray-300',
      bg: 'bg-white'
    },
    gray: {
      primary: 'text-gray-600 border-gray-600',
      secondary: 'text-gray-200 border-gray-200',
      bg: 'bg-gray-600'
    },
    green: {
      primary: 'text-green-600 border-green-600',
      secondary: 'text-green-200 border-green-200',
      bg: 'bg-green-600'
    },
    red: {
      primary: 'text-red-600 border-red-600',
      secondary: 'text-red-200 border-red-200',
      bg: 'bg-red-600'
    },
    yellow: {
      primary: 'text-yellow-600 border-yellow-600',
      secondary: 'text-yellow-200 border-yellow-200',
      bg: 'bg-yellow-600'
    },
    purple: {
      primary: 'text-purple-600 border-purple-600',
      secondary: 'text-purple-200 border-purple-200',
      bg: 'bg-purple-600'
    }
  }

  // Text size based on spinner size
  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  // Speed configurations
  const speedClasses = {
    slow: 'animate-slow-spin',
    normal: 'animate-spin',
    fast: 'animate-fast-spin'
  }

  const spinnerClasses = `${sizeClasses[size]} ${colorClasses[color].primary} ${className}`
  const textClasses = `${textSizeClasses[size]} ${colorClasses[color].primary} mt-2 font-medium`

  // Custom CSS for animation speeds (add to your global CSS)
  const customStyles = `
    @keyframes slow-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fast-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-slow-spin {
      animation: slow-spin 2s linear infinite;
    }
    .animate-fast-spin {
      animation: fast-spin 0.5s linear infinite;
    }
  `

  // Spinner variants
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${sizeClasses[size]} ${colorClasses[color].bg} rounded-full animate-pulse`}
                style={{ 
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: speed === 'fast' ? '0.8s' : speed === 'slow' ? '2s' : '1.2s'
                }}
              />
            ))}
          </div>
        )
      
      case 'pulse':
        return (
          <div className={`${spinnerClasses} ${colorClasses[color].bg} rounded-full animate-pulse`} 
               style={{ 
                 animationDuration: speed === 'fast' ? '0.8s' : speed === 'slow' ? '2s' : '1.2s'
               }} />
        )
      
      case 'bars':
        return (
          <div className={`flex space-x-1 ${className}`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-1 ${sizeClasses[size].replace('w-', 'h-')} ${colorClasses[color].bg} animate-pulse`}
                style={{ 
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: speed === 'fast' ? '0.6s' : speed === 'slow' ? '1.8s' : '1s'
                }}
              />
            ))}
          </div>
        )
      
      case 'ring':
        return (
          <div className={`${spinnerClasses} ${speedClasses[speed] || 'animate-spin'}`}>
            <div className={`border-4 ${colorClasses[color].secondary} border-t-4 border-t-current rounded-full w-full h-full`} />
          </div>
        )
      
      case 'spinner':
      default:
        return (
          <div
            className={`${spinnerClasses} ${speedClasses[speed] || 'animate-spin'} border-2 border-current border-t-transparent rounded-full`}
          />
        )
    }
  }

  const content = (
    <div className={`flex flex-col items-center justify-center ${center ? 'text-center' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      {renderSpinner()}
      {text && (
        <p className={textClasses}>
          {text}
        </p>
      )}
    </div>
  )

  // Full screen overlay
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full mx-4 border">
          {content}
        </div>
      </div>
    )
  }

  // Centered container
  if (center) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        {content}
      </div>
    )
  }

  return content
}

// Export additional specialized loading components
export const PageLoader = ({ 
  text = 'Loading...', 
  variant = 'spinner',
  color = 'blue',
  className = '' 
}) => (
  <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${className}`}>
    <LoadingSpinner size="lg" text={text} variant={variant} color={color} center />
  </div>
)

export const ButtonLoader = ({ 
  size = 'sm', 
  color = 'white',
  variant = 'spinner',
  className = ''
}) => (
  <LoadingSpinner 
    size={size} 
    color={color} 
    variant={variant}
    className={className}
  />
)

export const InlineLoader = ({ 
  text = '', 
  size = 'md',
  variant = 'spinner',
  color = 'blue',
  className = ''
}) => (
  <div className={`flex items-center justify-center py-8 ${className}`}>
    <LoadingSpinner size={size} text={text} variant={variant} color={color} />
  </div>
)

export const TableLoader = ({ 
  rows = 5,
  variant = 'pulse',
  color = 'gray'
}) => (
  <div className="animate-pulse">
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <LoadingSpinner size="lg" variant={variant} color={color} />
        <p className="mt-4 text-gray-500">Loading data...</p>
      </div>
    </div>
    {/* Skeleton rows */}
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/6"></div>
        </div>
      ))}
    </div>
  </div>
)

export const CardLoader = ({ 
  lines = 3,
  showImage = false,
  className = ''
}) => (
  <div className={`animate-pulse p-6 ${className}`}>
    {showImage && (
      <div className="h-32 bg-gray-200 rounded mb-4"></div>
    )}
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`h-4 bg-gray-200 rounded ${
            i === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  </div>
)

export const FormLoader = ({ 
  fields = 5,
  showButton = true,
  className = ''
}) => (
  <div className={`animate-pulse space-y-6 ${className}`}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    ))}
    {showButton && (
      <div className="h-10 bg-gray-200 rounded w-32"></div>
    )}
  </div>
)

export const SpinnerOverlay = ({ 
  show = false, 
  text = 'Loading...',
  variant = 'spinner',
  color = 'blue',
  opacity = 'bg-opacity-75'
}) => {
  if (!show) return null
  
  return (
    <div className={`absolute inset-0 bg-white ${opacity} flex items-center justify-center z-40`}>
      <LoadingSpinner size="lg" text={text} variant={variant} color={color} />
    </div>
  )
}

// Hook for managing loading states
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState)
  
  const startLoading = () => setLoading(true)
  const stopLoading = () => setLoading(false)
  const toggleLoading = () => setLoading(prev => !prev)
  
  return {
    loading,
    startLoading,
    stopLoading,
    toggleLoading,
    setLoading
  }
}