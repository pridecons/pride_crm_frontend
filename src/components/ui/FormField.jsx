'use client'
import { useState, forwardRef } from 'react'
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Calendar,
  Clock,
  Search,
  Phone,
  Mail,
  User,
  Lock,
  DollarSign,
  Percent,
  Hash,
  Type,
  FileText,
  ChevronDown
} from 'lucide-react'

/**
 * FormField Component
 * Reusable form field with validation, icons, and multiple input types
 * 
 * @param {Object} props
 * @param {string} props.type - Input type (text, email, password, number, tel, etc.)
 * @param {string} props.label - Field label
 * @param {string} props.name - Field name
 * @param {any} props.value - Field value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onBlur - Blur handler
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Required field
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.error - Error message
 * @param {string} props.success - Success message
 * @param {string} props.hint - Help text
 * @param {React.ReactNode} props.icon - Custom icon
 * @param {string} props.className - Additional CSS classes
 * @param {Array} props.options - Options for select/radio/checkbox
 * @param {number} props.rows - Textarea rows
 * @param {number} props.min - Min value for number inputs
 * @param {number} props.max - Max value for number inputs
 * @param {number} props.step - Step for number inputs
 * @param {string} props.pattern - Validation pattern
 * @param {number} props.maxLength - Max length
 * @param {boolean} props.showPasswordToggle - Show password toggle for password fields
 * @param {string} props.size - Field size (sm, md, lg)
 * @param {string} props.variant - Field variant (default, filled, outlined)
 */
const FormField = forwardRef(({
  type = 'text',
  label,
  name,
  value = '',
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  error,
  success,
  hint,
  icon,
  className = '',
  options = [],
  rows = 3,
  min,
  max,
  step,
  pattern,
  maxLength,
  showPasswordToggle = true,
  size = 'md',
  variant = 'default',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(false)

  // Auto-select icon based on type
  const getDefaultIcon = (inputType) => {
    const iconMap = {
      email: Mail,
      password: Lock,
      tel: Phone,
      phone: Phone,
      search: Search,
      date: Calendar,
      time: Clock,
      datetime: Calendar,
      'datetime-local': Calendar,
      number: Hash,
      currency: DollarSign,
      percentage: Percent,
      text: Type,
      textarea: FileText,
      user: User
    }
    return iconMap[inputType] || null
  }

  const IconComponent = icon || getDefaultIcon(type)

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  // Variant classes
  const variantClasses = {
    default: 'border border-gray-300 bg-white',
    filled: 'border border-gray-300 bg-gray-50',
    outlined: 'border-2 border-gray-300 bg-white'
  }

  // Status classes
  const getStatusClasses = () => {
    if (error) {
      return 'border-red-300 focus:border-red-500 focus:ring-red-500'
    }
    if (success) {
      return 'border-green-300 focus:border-green-500 focus:ring-green-500'
    }
    return 'focus:border-blue-500 focus:ring-blue-500'
  }

  // Input classes
  const inputClasses = `
    w-full rounded-md shadow-sm transition-colors duration-200
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${getStatusClasses()}
    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
    ${IconComponent ? 'pl-10' : ''}
    ${(type === 'password' && showPasswordToggle) ? 'pr-10' : ''}
    ${className}
  `.trim()

  // Handle change with type-specific formatting
  const handleChange = (e) => {
    let newValue = e.target.value

    // Type-specific value formatting
    if (type === 'currency') {
      // Remove non-numeric characters except decimal point
      newValue = newValue.replace(/[^\d.]/g, '')
    } else if (type === 'percentage') {
      // Ensure percentage is between 0-100
      const numValue = parseFloat(newValue)
      if (!isNaN(numValue)) {
        newValue = Math.min(100, Math.max(0, numValue)).toString()
      }
    } else if (type === 'phone' || type === 'tel') {
      // Format phone number (basic formatting)
      newValue = newValue.replace(/\D/g, '')
      if (newValue.length <= 10) {
        newValue = newValue.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
      }
    }

    if (onChange) {
      onChange({
        ...e,
        target: {
          ...e.target,
          name: name || e.target.name,
          value: newValue
        }
      })
    }
  }

  // Render different input types
  const renderInput = () => {
    const commonProps = {
      id: name,
      name,
      value,
      onChange: handleChange,
      onBlur,
      onFocus: () => setFocused(true),
      onBlur: (e) => {
        setFocused(false)
        if (onBlur) onBlur(e)
      },
      placeholder,
      required,
      disabled,
      className: inputClasses,
      min,
      max,
      step,
      pattern,
      maxLength,
      ref,
      ...props
    }

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={rows}
            className={inputClasses}
          />
        )

      case 'select':
        return (
          <div className="relative">
            <select
              {...commonProps}
              className={`${inputClasses} pr-10 appearance-none`}
            >
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={handleChange}
                  disabled={disabled}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        if (options.length > 0) {
          // Multiple checkboxes
          return (
            <div className="space-y-2">
              {options.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    name={name}
                    value={option.value}
                    checked={Array.isArray(value) ? value.includes(option.value) : false}
                    onChange={(e) => {
                      const checked = e.target.checked
                      const currentValue = Array.isArray(value) ? value : []
                      let newValue
                      
                      if (checked) {
                        newValue = [...currentValue, option.value]
                      } else {
                        newValue = currentValue.filter(v => v !== option.value)
                      }
                      
                      if (onChange) {
                        onChange({
                          ...e,
                          target: {
                            ...e.target,
                            name,
                            value: newValue
                          }
                        })
                      }
                    }}
                    disabled={disabled}
                    className="mr-2 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          )
        } else {
          // Single checkbox
          return (
            <label className="flex items-center">
              <input
                type="checkbox"
                name={name}
                checked={!!value}
                onChange={(e) => {
                  if (onChange) {
                    onChange({
                      ...e,
                      target: {
                        ...e.target,
                        name,
                        value: e.target.checked
                      }
                    })
                  }
                }}
                disabled={disabled}
                className="mr-2 text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="text-sm text-gray-700">{placeholder || label}</span>
            </label>
          )
        }

      case 'password':
        return (
          <input
            {...commonProps}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
          />
        )

      case 'currency':
        return (
          <input
            {...commonProps}
            type="text"
            inputMode="decimal"
          />
        )

      case 'percentage':
        return (
          <input
            {...commonProps}
            type="number"
            min="0"
            max="100"
            step="0.01"
          />
        )

      case 'phone':
      case 'tel':
        return (
          <input
            {...commonProps}
            type="tel"
            inputMode="tel"
          />
        )

      default:
        return <input {...commonProps} type={type} />
    }
  }

  // Render status icon
  const renderStatusIcon = () => {
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return null
  }

  return (
    <div className="space-y-1">
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className={`block text-sm font-medium ${
            error ? 'text-red-700' : success ? 'text-green-700' : 'text-gray-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Leading Icon */}
        {IconComponent && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IconComponent className="h-4 w-4 text-gray-400" />
          </div>
        )}

        {/* Input */}
        {renderInput()}

        {/* Password Toggle */}
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}

        {/* Trailing Status Icon */}
        {(error || success) && !(type === 'password' && showPasswordToggle) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {renderStatusIcon()}
          </div>
        )}

        {/* Currency Symbol */}
        {type === 'currency' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">₹</span>
          </div>
        )}

        {/* Percentage Symbol */}
        {type === 'percentage' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">%</span>
          </div>
        )}
      </div>

      {/* Help Text, Error, or Success Message */}
      {(hint || error || success) && (
        <div className="flex items-start space-x-1">
          {error && (
            <>
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </>
          )}
          
          {success && !error && (
            <>
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-600">{success}</p>
            </>
          )}
          
          {hint && !error && !success && (
            <>
              <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-500">{hint}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
})

FormField.displayName = 'FormField'

export default FormField

// Specialized field components
export const EmailField = (props) => (
  <FormField
    type="email"
    icon={Mail}
    placeholder="Enter email address"
    {...props}
  />
)

export const PasswordField = (props) => (
  <FormField
    type="password"
    icon={Lock}
    placeholder="Enter password"
    {...props}
  />
)

export const PhoneField = (props) => (
  <FormField
    type="phone"
    icon={Phone}
    placeholder="(555) 123-4567"
    {...props}
  />
)

export const CurrencyField = (props) => (
  <FormField
    type="currency"
    icon={DollarSign}
    placeholder="0.00"
    {...props}
  />
)

export const PercentageField = (props) => (
  <FormField
    type="percentage"
    icon={Percent}
    placeholder="0"
    min="0"
    max="100"
    {...props}
  />
)

export const SearchField = (props) => (
  <FormField
    type="search"
    icon={Search}
    placeholder="Search..."
    {...props}
  />
)

export const TextAreaField = (props) => (
  <FormField
    type="textarea"
    icon={FileText}
    {...props}
  />
)

export const SelectField = (props) => (
  <FormField
    type="select"
    {...props}
  />
)

export const DateField = (props) => (
  <FormField
    type="date"
    icon={Calendar}
    {...props}
  />
)

export const TimeField = (props) => (
  <FormField
    type="time"
    icon={Clock}
    {...props}
  />
)

// Form validation helpers
export const validateField = (value, rules = {}) => {
  const errors = []

  if (rules.required && (!value || value.toString().trim() === '')) {
    errors.push('This field is required')
  }

  if (value && rules.minLength && value.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength} characters`)
  }

  if (value && rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`)
  }

  if (value && rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.patternMessage || 'Invalid format')
  }

  if (value && rules.min && parseFloat(value) < rules.min) {
    errors.push(`Minimum value is ${rules.min}`)
  }

  if (value && rules.max && parseFloat(value) > rules.max) {
    errors.push(`Maximum value is ${rules.max}`)
  }

  if (value && rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errors.push('Please enter a valid email address')
  }

  if (value && rules.phone && !/^\(\d{3}\) \d{3}-\d{4}$/.test(value)) {
    errors.push('Please enter a valid phone number')
  }

  return errors.length > 0 ? errors[0] : null
}

// Custom hook for form field state
export const useFormField = (initialValue = '', validationRules = {}) => {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState(null)
  const [touched, setTouched] = useState(false)

  const handleChange = (e) => {
    const newValue = e.target.value
    setValue(newValue)
    
    if (touched) {
      const validationError = validateField(newValue, validationRules)
      setError(validationError)
    }
  }

  const handleBlur = () => {
    setTouched(true)
    const validationError = validateField(value, validationRules)
    setError(validationError)
  }

  const reset = () => {
    setValue(initialValue)
    setError(null)
    setTouched(false)
  }

  return {
    value,
    error,
    touched,
    onChange: handleChange,
    onBlur: handleBlur,
    reset,
    isValid: !error && touched
  }
}