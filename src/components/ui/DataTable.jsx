'use client'
import { useState, useMemo, useCallback } from 'react'
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Table,
  X
} from 'lucide-react'
import LoadingSpinner, { TableLoader } from '@/components/common/LoadingSpinner'

/**
 * DataTable Component
 * Reusable table with sorting, filtering, pagination, and actions
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data objects
 * @param {Array} props.columns - Column configuration
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.pagination - Pagination configuration
 * @param {Function} props.onPageChange - Page change handler
 * @param {Function} props.onSort - Sort handler
 * @param {Function} props.onFilter - Filter handler
 * @param {Function} props.onSearch - Search handler
 * @param {Function} props.onRefresh - Refresh handler
 * @param {Function} props.onExport - Export handler
 * @param {boolean} props.selectable - Enable row selection
 * @param {Array} props.selectedRows - Selected row IDs
 * @param {Function} props.onSelectionChange - Selection change handler
 * @param {React.ReactNode} props.actions - Custom action buttons
 * @param {string} props.emptyMessage - Empty state message
 * @param {React.ReactNode} props.emptyIcon - Empty state icon
 * @param {string} props.searchPlaceholder - Search input placeholder
 * @param {boolean} props.showFilters - Show filter controls
 * @param {boolean} props.showExport - Show export button
 * @param {boolean} props.showRefresh - Show refresh button
 * @param {boolean} props.showSearch - Show search input
 * @param {string} props.className - Additional CSS classes
 */
export default function DataTable({
  data = [],
  columns = [],
  loading = false,
  pagination = null,
  onPageChange,
  onSort,
  onFilter,
  onSearch,
  onRefresh,
  onExport,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  actions,
  emptyMessage = "No data available",
  emptyIcon = Table,
  searchPlaceholder = "Search...",
  showFilters = true,
  showExport = true,
  showRefresh = true,
  showSearch = true,
  className = ""
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [activeFilters, setActiveFilters] = useState({})

  // Handle search
  const handleSearch = useCallback((value) => {
    setSearchTerm(value)
    if (onSearch) {
      onSearch(value)
    }
  }, [onSearch])

  // Handle sorting
  const handleSort = useCallback((key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
    if (onSort) {
      onSort(key, direction)
    }
  }, [sortConfig, onSort])

  // Handle row selection
  const handleRowSelect = useCallback((rowId, selected) => {
    if (!onSelectionChange) return
    
    if (selected) {
      onSelectionChange([...selectedRows, rowId])
    } else {
      onSelectionChange(selectedRows.filter(id => id !== rowId))
    }
  }, [selectedRows, onSelectionChange])

  // Handle select all
  const handleSelectAll = useCallback((selected) => {
    if (!onSelectionChange) return
    
    if (selected) {
      const allIds = data.map(row => getRowId(row))
      onSelectionChange(allIds)
    } else {
      onSelectionChange([])
    }
  }, [data, onSelectionChange])

  // Get row ID
  const getRowId = useCallback((row) => {
    return row.id || row._id || row.key || JSON.stringify(row)
  }, [])

  // Filter data locally if no onFilter handler
  const filteredData = useMemo(() => {
    if (onSearch || !searchTerm) return data
    
    return data.filter(row => {
      return columns.some(column => {
        const value = getNestedValue(row, column.key)
        return String(value).toLowerCase().includes(searchTerm.toLowerCase())
      })
    })
  }, [data, searchTerm, columns, onSearch])

  // Sort data locally if no onSort handler
  const sortedData = useMemo(() => {
    if (onSort || !sortConfig.key) return filteredData
    
    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key)
      const bValue = getNestedValue(b, sortConfig.key)
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig, onSort])

  // Get nested value from object
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((curr, key) => curr?.[key], obj)
  }

  // Render cell value
  const renderCellValue = (row, column) => {
    const value = getNestedValue(row, column.key)
    
    if (column.render) {
      return column.render(value, row)
    }
    
    if (column.type === 'date' && value) {
      return new Date(value).toLocaleDateString()
    }
    
    if (column.type === 'currency' && value) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(value)
    }
    
    if (column.type === 'number' && value) {
      return new Intl.NumberFormat('en-IN').format(value)
    }
    
    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    return value || '-'
  }

  // All rows selected check
  const allRowsSelected = data.length > 0 && selectedRows.length === data.length
  const someRowsSelected = selectedRows.length > 0 && selectedRows.length < data.length

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Table Header */}
      {(showSearch || showFilters || showExport || showRefresh || actions) && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search */}
            {showSearch && (
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {actions}
              
              {showFilters && (
                <div className="relative">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </button>
                  
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
                          <button
                            onClick={() => setShowFilterDropdown(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {columns.filter(col => col.filterable).map(column => (
                          <div key={column.key} className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {column.title}
                            </label>
                            {column.filterType === 'select' ? (
                              <select
                                value={activeFilters[column.key] || ''}
                                onChange={(e) => {
                                  const newFilters = { ...activeFilters, [column.key]: e.target.value }
                                  setActiveFilters(newFilters)
                                  if (onFilter) onFilter(newFilters)
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">All</option>
                                {column.filterOptions?.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={column.filterType || 'text'}
                                value={activeFilters[column.key] || ''}
                                onChange={(e) => {
                                  const newFilters = { ...activeFilters, [column.key]: e.target.value }
                                  setActiveFilters(newFilters)
                                  if (onFilter) onFilter(newFilters)
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                placeholder={`Filter ${column.title.toLowerCase()}`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {showExport && onExport && (
                <button
                  onClick={onExport}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </button>
              )}
              
              {showRefresh && onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selection Actions */}
      {selectable && selectedRows.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedRows.length} item(s) selected
            </span>
            <button
              onClick={() => onSelectionChange([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <TableLoader rows={5} />
        ) : (
          <table className="w-full">
            {/* Table Header */}
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {selectable && (
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={allRowsSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someRowsSelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    } ${column.width ? `w-${column.width}` : ''}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title}</span>
                      {column.sortable && (
                        <div className="flex flex-col">
                          {sortConfig.key === column.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                
                {/* Actions column */}
                {columns.some(col => col.actions) && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (columns.some(col => col.actions) ? 1 : 0)}
                    className="px-6 py-12 text-center"
                  >
                    <EmptyState message={emptyMessage} icon={emptyIcon} />
                  </td>
                </tr>
              ) : (
                sortedData.map((row, index) => {
                  const rowId = getRowId(row)
                  const isSelected = selectedRows.includes(rowId)
                  
                  return (
                    <tr
                      key={rowId}
                      className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      {selectable && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-6 py-4 text-sm text-gray-900 ${column.className || ''}`}
                        >
                          {renderCellValue(row, column)}
                        </td>
                      ))}
                      
                      {/* Row Actions */}
                      {columns.some(col => col.actions) && (
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <RowActions
                            row={row}
                            actions={columns.find(col => col.actions)?.actions || []}
                          />
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

// Empty State Component
function EmptyState({ message, icon: Icon }) {
  return (
    <div className="text-center py-6">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
  )
}

// Row Actions Component
function RowActions({ row, actions }) {
  const [showDropdown, setShowDropdown] = useState(false)

  if (!actions || actions.length === 0) return null

  if (actions.length === 1) {
    const action = actions[0]
    return (
      <button
        onClick={() => action.handler(row)}
        className={`text-${action.color || 'blue'}-600 hover:text-${action.color || 'blue'}-900`}
        title={action.label}
      >
        <action.icon className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-gray-400 hover:text-gray-600 p-1"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
          <div className="py-1">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.handler(row)
                  setShowDropdown(false)
                }}
                className={`flex items-center px-4 py-2 text-sm w-full text-left hover:bg-gray-100 ${
                  action.color === 'red' ? 'text-red-700 hover:bg-red-50' : 'text-gray-700'
                }`}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Table Pagination Component
function TablePagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange 
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getVisiblePages = () => {
    const pages = []
    const maxVisiblePages = 5
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            {/* First page */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            
            {/* Previous page */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {/* Page numbers */}
            {getVisiblePages().map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            {/* Next page */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            
            {/* Last page */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}