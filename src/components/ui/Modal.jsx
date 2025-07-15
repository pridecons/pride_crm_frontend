'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react'

/**
 * Modal Component
 * Reusable modal with various configurations and animations
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.size - Modal size: 'sm', 'md', 'lg', 'xl', 'full'
 * @param {boolean} props.showCloseButton - Show X button in header
 * @param {boolean} props.closeOnOverlayClick - Close when clicking overlay
 * @param {boolean} props.closeOnEscape - Close when pressing Escape
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.footer - Modal footer content
 * @param {boolean} props.preventScroll - Prevent body scroll when open
 */
export default function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  footer,
  preventScroll = true
}) {
  const modalRef = useRef(null)
  const overlayRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  // Handle mounting for SSR
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle body scroll prevention
  useEffect(() => {
    if (!preventScroll) return

    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, preventScroll])

  // Handle focus trap
  useEffect(() => {
    if (!isOpen) return

    const modal = modalRef.current
    if (!modal) return

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    // Focus first element when modal opens
    firstElement?.focus()

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose?.()
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  }

  if (!mounted || !isOpen) return null

  const modalContent = (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl transform transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

/**
 * Confirmation Modal
 * Pre-configured modal for confirmations
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  loading = false
}) {
  const icons = {
    warning: AlertTriangle,
    danger: AlertCircle,
    info: Info
  }

  const colors = {
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    info: 'text-blue-600'
  }

  const buttonColors = {
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    danger: 'bg-red-600 hover:bg-red-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  }

  const Icon = icons[type]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-${type === 'danger' ? 'red' : type === 'warning' ? 'yellow' : 'blue'}-100 mb-4`}>
          <Icon className={`h-6 w-6 ${colors[type]}`} />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>
        
        <div className="flex space-x-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${buttonColors[type]}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Alert Modal
 * Pre-configured modal for alerts and notifications
 */
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info', // 'success', 'error', 'warning', 'info'
  buttonText = 'OK'
}) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const colors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  }

  const bgColors = {
    success: 'bg-green-100',
    error: 'bg-red-100',
    warning: 'bg-yellow-100',
    info: 'bg-blue-100'
  }

  const Icon = icons[type]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${bgColors[type]} mb-4`}>
          <Icon className={`h-6 w-6 ${colors[type]}`} />
        </div>
        
        {title && (
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {title}
          </h3>
        )}
        
        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>
        
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {buttonText}
        </button>
      </div>
    </Modal>
  )
}

/**
 * Form Modal
 * Pre-configured modal for forms
 */
export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  size = 'md',
  submitDisabled = false
}) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.(e)
  }

  const footer = (
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        type="submit"
        form="modal-form"
        disabled={loading || submitDisabled}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Saving...' : submitText}
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={footer}
    >
      <form id="modal-form" onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  )
}

/**
 * Image Modal
 * Modal for displaying images
 */
export function ImageModal({
  isOpen,
  onClose,
  src,
  alt = 'Image',
  title
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      className="max-h-screen"
    >
      <div className="text-center">
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-96 mx-auto rounded-lg"
        />
      </div>
    </Modal>
  )
}

/**
 * Loading Modal
 * Modal with loading indicator
 */
export function LoadingModal({
  isOpen,
  message = 'Loading...',
  showSpinner = true
}) {
  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={false}
    >
      <div className="text-center py-4">
        {showSpinner && (
          <div className="mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </Modal>
  )
}

/**
 * Drawer Modal
 * Side-sliding modal/drawer
 */
export function DrawerModal({
  isOpen,
  onClose,
  title,
  children,
  position = 'right', // 'left', 'right'
  size = 'md' // 'sm', 'md', 'lg'
}) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  }

  const positionClasses = {
    left: 'left-0',
    right: 'right-0'
  }

  const transformClasses = {
    left: isOpen ? 'translate-x-0' : '-translate-x-full',
    right: isOpen ? 'translate-x-0' : 'translate-x-full'
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className={`absolute top-0 ${positionClasses[position]} h-full ${sizeClasses[size]} w-full`}>
        <div className={`h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${transformClasses[position]}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto h-full pb-20">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}