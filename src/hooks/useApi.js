import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'

/**
 * useApi Hook
 * Custom hook for API calls with loading and error states
 * 
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Call API immediately on mount
 * @param {any} options.initialData - Initial data value
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {boolean} options.showErrorToast - Show error toast notifications
 * @param {boolean} options.showSuccessToast - Show success toast notifications
 * @param {string} options.successMessage - Custom success message
 * @param {Array} options.dependencies - Dependencies to trigger refetch
 * @returns {Object} API state and methods
 */
export const useApi = (apiFunction, options = {}) => {
  const {
    immediate = false,
    initialData = null,
    onSuccess,
    onError,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage = 'Operation completed successfully',
    dependencies = []
  } = options

  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const abortControllerRef = useRef(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Execute API call
  const execute = useCallback(async (...args) => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      if (!isMountedRef.current) return

      setLoading(true)
      setError(null)

      // Call the API function with abort signal
      const result = await apiFunction(...args, {
        signal: abortControllerRef.current.signal
      })

      if (!isMountedRef.current) return

      setData(result)
      setLastFetch(new Date())
      setLoading(false)

      // Show success toast if enabled
      if (showSuccessToast) {
        toast.success(successMessage)
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result)
      }

      return result
    } catch (err) {
      if (!isMountedRef.current) return

      // Don't handle aborted requests
      if (err.name === 'AbortError') {
        return
      }

      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.detail || 
                          err.message || 
                          'An error occurred'

      setError({
        message: errorMessage,
        status: err.response?.status,
        data: err.response?.data,
        original: err
      })
      setLoading(false)

      // Show error toast if enabled
      if (showErrorToast) {
        toast.error(errorMessage)
      }

      // Call error callback
      if (onError) {
        onError(err)
      }

      throw err
    }
  }, [apiFunction, onSuccess, onError, showErrorToast, showSuccessToast, successMessage])

  // Refetch data
  const refetch = useCallback(() => {
    return execute()
  }, [execute])

  // Reset state
  const reset = useCallback(() => {
    setData(initialData)
    setError(null)
    setLoading(false)
    setLastFetch(null)
  }, [initialData])

  // Execute immediately on mount if enabled
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute])

  // Execute when dependencies change
  useEffect(() => {
    if (dependencies.length > 0 && !immediate) {
      execute()
    }
  }, dependencies)

  return {
    data,
    loading,
    error,
    lastFetch,
    execute,
    refetch,
    reset,
    isIdle: !loading && !error && !data,
    isSuccess: !loading && !error && data !== null,
    isError: !loading && error !== null
  }
}

/**
 * useLazyApi Hook
 * Similar to useApi but doesn't execute immediately
 */
export const useLazyApi = (apiFunction, options = {}) => {
  return useApi(apiFunction, { ...options, immediate: false })
}

/**
 * useMutation Hook
 * Hook for create/update/delete operations
 */
export const useMutation = (mutationFunction, options = {}) => {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    showSuccessToast = true,
    successMessage = 'Operation completed successfully'
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const mutate = useCallback(async (variables) => {
    try {
      setLoading(true)
      setError(null)

      const result = await mutationFunction(variables)

      setData(result)
      setLoading(false)

      if (showSuccessToast) {
        toast.success(successMessage)
      }

      if (onSuccess) {
        onSuccess(result, variables)
      }

      return result
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.detail || 
                          err.message || 
                          'An error occurred'

      setError({
        message: errorMessage,
        status: err.response?.status,
        data: err.response?.data,
        original: err
      })
      setLoading(false)

      if (showErrorToast) {
        toast.error(errorMessage)
      }

      if (onError) {
        onError(err, variables)
      }

      throw err
    }
  }, [mutationFunction, onSuccess, onError, showErrorToast, showSuccessToast, successMessage])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    mutate,
    data,
    loading,
    error,
    reset,
    isIdle: !loading && !error && !data,
    isSuccess: !loading && !error && data !== null,
    isError: !loading && error !== null
  }
}

/**
 * usePaginatedApi Hook
 * Hook for paginated API calls
 */
export const usePaginatedApi = (apiFunction, options = {}) => {
  const {
    initialPage = 1,
    initialLimit = 20,
    ...apiOptions
  } = options

  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0
  })

  const apiCall = useCallback(
    () => apiFunction({ 
      page: pagination.page, 
      limit: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit 
    }),
    [apiFunction, pagination.page, pagination.limit]
  )

  const { data, loading, error, execute, refetch } = useApi(apiCall, {
    ...apiOptions,
    onSuccess: (result) => {
      if (result.pagination) {
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages || Math.ceil(result.pagination.total / prev.limit)
        }))
      }
      if (apiOptions.onSuccess) {
        apiOptions.onSuccess(result)
      }
    }
  })

  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const setPageSize = useCallback((limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }, [])

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      goToPage(pagination.page + 1)
    }
  }, [pagination.page, pagination.totalPages, goToPage])

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1)
    }
  }, [pagination.page, goToPage])

  return {
    data: data?.data || data?.items || data,
    loading,
    error,
    pagination,
    goToPage,
    setPageSize,
    nextPage,
    prevPage,
    refetch,
    hasNextPage: pagination.page < pagination.totalPages,
    hasPrevPage: pagination.page > 1
  }
}

/**
 * useInfiniteApi Hook
 * Hook for infinite scroll/load more functionality
 */
export const useInfiniteApi = (apiFunction, options = {}) => {
  const {
    initialPage = 1,
    limit = 20,
    getNextPageParam = (lastPage, allPages) => {
      const nextPage = allPages.length + 1
      return lastPage.hasMore ? nextPage : undefined
    },
    ...apiOptions
  } = options

  const [pages, setPages] = useState([])
  const [hasNextPage, setHasNextPage] = useState(true)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)

  const fetchPage = useCallback(async (page = initialPage) => {
    const result = await apiFunction({ 
      page, 
      limit,
      skip: (page - 1) * limit 
    })
    return {
      ...result,
      page,
      hasMore: result.pagination ? page < result.pagination.totalPages : false
    }
  }, [apiFunction, limit, initialPage])

  const { loading: isLoading, error, execute } = useApi(
    () => fetchPage(initialPage),
    {
      ...apiOptions,
      onSuccess: (firstPage) => {
        setPages([firstPage])
        setHasNextPage(!!getNextPageParam(firstPage, [firstPage]))
        if (apiOptions.onSuccess) {
          apiOptions.onSuccess(firstPage)
        }
      }
    }
  )

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return

    try {
      setIsFetchingNextPage(true)
      const nextPageNumber = getNextPageParam(pages[pages.length - 1], pages)
      
      if (nextPageNumber) {
        const nextPage = await fetchPage(nextPageNumber)
        setPages(prev => [...prev, nextPage])
        setHasNextPage(!!getNextPageParam(nextPage, [...pages, nextPage]))
      }
    } catch (err) {
      console.error('Error fetching next page:', err)
    } finally {
      setIsFetchingNextPage(false)
    }
  }, [hasNextPage, isFetchingNextPage, pages, getNextPageParam, fetchPage])

  const data = pages.flatMap(page => page.data || page.items || [])

  return {
    data,
    pages,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: execute
  }
}

/**
 * useDebounceApi Hook
 * Hook that debounces API calls (useful for search)
 */
export const useDebounceApi = (apiFunction, delay = 500, options = {}) => {
  const [debouncedExecute, setDebouncedExecute] = useState(null)
  const timeoutRef = useRef(null)

  const { execute, ...apiState } = useLazyApi(apiFunction, options)

  const debouncedApiCall = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      execute(...args)
    }, delay)
  }, [execute, delay])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    ...apiState,
    execute: debouncedApiCall
  }
}

/**
 * useApiCache Hook
 * Hook with simple caching mechanism
 */
export const useApiCache = (apiFunction, cacheKey, options = {}) => {
  const { cacheTime = 5 * 60 * 1000, ...apiOptions } = options // 5 minutes default
  
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(`api_cache_${cacheKey}`)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < cacheTime) {
          return data
        }
      }
    } catch (err) {
      console.warn('Cache read error:', err)
    }
    return null
  }, [cacheKey, cacheTime])

  const setCachedData = useCallback((data) => {
    try {
      localStorage.setItem(`api_cache_${cacheKey}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (err) {
      console.warn('Cache write error:', err)
    }
  }, [cacheKey])

  const apiState = useApi(apiFunction, {
    ...apiOptions,
    initialData: getCachedData(),
    onSuccess: (data) => {
      setCachedData(data)
      if (apiOptions.onSuccess) {
        apiOptions.onSuccess(data)
      }
    }
  })

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(`api_cache_${cacheKey}`)
    } catch (err) {
      console.warn('Cache clear error:', err)
    }
  }, [cacheKey])

  return {
    ...apiState,
    clearCache
  }
}

/**
 * useApiQueue Hook
 * Hook for queuing API calls
 */
export const useApiQueue = () => {
  const [queue, setQueue] = useState([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState([])

  const addToQueue = useCallback((apiFunction, ...args) => {
    const id = Date.now() + Math.random()
    setQueue(prev => [...prev, { id, apiFunction, args }])
    return id
  }, [])

  const processQueue = useCallback(async () => {
    if (processing || queue.length === 0) return

    setProcessing(true)
    const currentQueue = [...queue]
    setQueue([])

    for (const item of currentQueue) {
      try {
        const result = await item.apiFunction(...item.args)
        setResults(prev => [...prev, { id: item.id, result, error: null }])
      } catch (error) {
        setResults(prev => [...prev, { id: item.id, result: null, error }])
      }
    }

    setProcessing(false)
  }, [queue, processing])

  const clearQueue = useCallback(() => {
    setQueue([])
    setResults([])
  }, [])

  return {
    queue,
    results,
    processing,
    addToQueue,
    processQueue,
    clearQueue
  }
}

export default useApi