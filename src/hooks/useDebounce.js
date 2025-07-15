import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useDebounce Hook
 * Debounces a value, delaying updates until after wait time has elapsed
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @returns {any} Debounced value
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * useDebouncedCallback Hook
 * Debounces a callback function
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @param {Array} dependencies - Dependencies array for the callback
 * @returns {Function} Debounced callback function
 */
export const useDebouncedCallback = (callback, delay = 500, dependencies = []) => {
  const timeoutRef = useRef(null)
  const callbackRef = useRef(callback)

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...dependencies])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay])
}

/**
 * useDebouncedState Hook
 * Combines useState with debouncing
 * 
 * @param {any} initialValue - Initial state value
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @returns {Array} [debouncedValue, immediateValue, setValue, setDebouncedValue]
 */
export const useDebouncedState = (initialValue, delay = 500) => {
  const [immediateValue, setImmediateValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(immediateValue)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [immediateValue, delay])

  return [debouncedValue, immediateValue, setImmediateValue, setDebouncedValue]
}

/**
 * useDebouncedEffect Hook
 * Debounced version of useEffect
 * 
 * @param {Function} callback - Effect callback
 * @param {Array} dependencies - Dependencies array
 * @param {number} delay - Delay in milliseconds (default: 500)
 */
export const useDebouncedEffect = (callback, dependencies, delay = 500) => {
  const callbackRef = useRef(callback)
  const timeoutRef = useRef(null)

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Debounced effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current()
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [...dependencies, delay])
}

/**
 * useDebounceAsync Hook
 * Debounces async operations and handles loading states
 * 
 * @param {Function} asyncFunction - Async function to debounce
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @returns {Object} { execute, loading, data, error, cancel }
 */
export const useDebounceAsync = (asyncFunction, delay = 500) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const timeoutRef = useRef(null)
  const cancelTokenRef = useRef(null)

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancelled = true
    }
    setLoading(false)
  }, [])

  const execute = useCallback((...args) => {
    // Cancel previous execution
    cancel()

    // Clear previous data and error
    setError(null)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      const cancelToken = { cancelled: false }
      cancelTokenRef.current = cancelToken

      try {
        const result = await asyncFunction(...args)
        
        if (!cancelToken.cancelled) {
          setData(result)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelToken.cancelled) {
          setError(err)
          setLoading(false)
        }
      }
    }, delay)
  }, [asyncFunction, delay, cancel])

  // Cleanup on unmount
  useEffect(() => {
    return cancel
  }, [cancel])

  return {
    execute,
    loading,
    data,
    error,
    cancel
  }
}

/**
 * useSearchDebounce Hook
 * Specialized hook for search functionality
 * 
 * @param {Function} searchFunction - Function to perform search
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @param {number} minLength - Minimum search term length (default: 2)
 * @returns {Object} Search state and controls
 */
export const useSearchDebounce = (searchFunction, delay = 300, minLength = 2) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const debouncedQuery = useDebounce(query, delay)

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.length < minLength) {
        setResults([])
        setError(null)
        setHasSearched(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const searchResults = await searchFunction(debouncedQuery)
        setResults(searchResults)
        setHasSearched(true)
      } catch (err) {
        setError(err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery, searchFunction, minLength])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setHasSearched(false)
  }, [])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    hasSearched,
    clearSearch,
    isEmpty: hasSearched && results.length === 0,
    hasResults: results.length > 0
  }
}

/**
 * useThrottledDebounce Hook
 * Combines throttling and debouncing - executes immediately, then debounces subsequent calls
 * 
 * @param {Function} callback - Function to throttle and debounce
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @returns {Function} Throttled and debounced function
 */
export const useThrottledDebounce = (callback, delay = 500) => {
  const lastCall = useRef(0)
  const timeoutRef = useRef(null)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback((...args) => {
    const now = Date.now()

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // If enough time has passed since last call, execute immediately (throttle)
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      callbackRef.current(...args)
    } else {
      // Otherwise, debounce the call
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now()
        callbackRef.current(...args)
      }, delay - (now - lastCall.current))
    }
  }, [delay])
}

/**
 * useDebounceValidation Hook
 * Debounced validation for form fields
 * 
 * @param {any} value - Value to validate
 * @param {Function} validator - Validation function
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @returns {Object} Validation state
 */
export const useDebounceValidation = (value, validator, delay = 500) => {
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState(null)
  const [error, setError] = useState(null)

  const debouncedValue = useDebounce(value, delay)

  useEffect(() => {
    if (!debouncedValue) {
      setIsValid(null)
      setError(null)
      setIsValidating(false)
      return
    }

    const validate = async () => {
      setIsValidating(true)
      setError(null)

      try {
        const result = await validator(debouncedValue)
        setIsValid(result === true)
        if (result !== true && typeof result === 'string') {
          setError(result)
        }
      } catch (err) {
        setIsValid(false)
        setError(err.message || 'Validation failed')
      } finally {
        setIsValidating(false)
      }
    }

    validate()
  }, [debouncedValue, validator])

  return {
    isValidating,
    isValid,
    error,
    hasError: isValid === false
  }
}

/**
 * useDebounceCallback Hook with cancel functionality
 * Advanced debounced callback with explicit cancel method
 * 
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} dependencies - Dependencies array
 * @returns {Object} { debouncedCallback, cancel, isPending }
 */
export const useAdvancedDebounce = (callback, delay = 500, dependencies = []) => {
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef(null)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...dependencies])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      setIsPending(false)
    }
  }, [])

  const debouncedCallback = useCallback((...args) => {
    cancel()
    setIsPending(true)

    timeoutRef.current = setTimeout(() => {
      setIsPending(false)
      callbackRef.current(...args)
    }, delay)
  }, [delay, cancel])

  useEffect(() => {
    return cancel
  }, [cancel])

  return {
    debouncedCallback,
    cancel,
    isPending
  }
}

// Export default useDebounce
export default useDebounce