'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target,
  FileText,
  Send,
  UserPlus
} from 'lucide-react'
import { toast } from 'react-toastify'

import ProtectedRoute from '@/components/common/ProtectedRoute'
import RoleBasedAccess, { SalesTeamOnly, ManagerOnly } from '@/components/common/RoleBasedAccess'
import LoadingSpinner, { TableLoader, InlineLoader } from '@/components/common/LoadingSpinner'
import leadService from '@/services/leadService'
import userService from '@/services/userService'
import branchService from '@/services/branchService'
import { useAuth } from '@/context/AuthContext'

export default function LeadsManagePage() {
  return (
    <ProtectedRoute 
      allowedRoles={['SUPERADMIN', 'BRANCH_MANAGER', 'SALES_MANAGER', 'TL', 'BA', 'SBA']}
      requiredPermissions={['view_leads']}
    >
      <LeadManagementDashboard />
    </ProtectedRoute>
  )
}

function LeadManagementDashboard() {
  const router = useRouter()
  const { user: currentUser, hasPermission } = useAuth()

  // State management
  const [leads, setLeads] = useState([])
  const [leadSources, setLeadSources] = useState([])
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [statistics, setStatistics] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    interested: 0,
    converted: 0,
    lost: 0
  })
  
  // Pagination & Filtering
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
    assigned_to: '',
    branch_id: '',
    priority: '',
    date_from: '',
    date_to: ''
  })
  
  const [selectedLeads, setSelectedLeads] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [bulkAssignUser, setBulkAssignUser] = useState('')

  // Lead statuses and priorities
  const leadStatuses = [
    { value: 'new', label: 'New', color: 'blue' },
    { value: 'contacted', label: 'Contacted', color: 'yellow' },
    { value: 'interested', label: 'Interested', color: 'green' },
    { value: 'not_interested', label: 'Not Interested', color: 'red' },
    { value: 'follow_up', label: 'Follow Up', color: 'purple' },
    { value: 'converted', label: 'Converted', color: 'emerald' },
    { value: 'lost', label: 'Lost', color: 'gray' }
  ]

  const leadPriorities = [
    { value: 'high', label: 'High', color: 'red' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'low', label: 'Low', color: 'green' }
  ]

  // Fetch data
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        skip: (pagination.page - 1) * pagination.limit,
        limit: pagination.limit,
        search: filters.search,
        status: filters.status,
        source: filters.source,
        assigned_to: filters.assigned_to,
        branch_id: filters.branch_id,
        priority: filters.priority,
        date_from: filters.date_from,
        date_to: filters.date_to
      }

      const response = await leadService.getLeads(params)
      setLeads(response.data || response.leads || response)
      
      // Update pagination if response includes metadata
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
          totalPages: Math.ceil(response.pagination.total / pagination.limit)
        }))
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await leadService.getLeadStatistics(filters)
      setStatistics(response)
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }, [filters])

  const fetchMetadata = useCallback(async () => {
    try {
      const [sourcesRes, branchesRes, usersRes] = await Promise.all([
        leadService.getLeadSources(true),
        branchService.getBranches({ active_only: true }),
        userService.getUsersByRole('', true) // Get all active users
      ])
      
      setLeadSources(sourcesRes.data || sourcesRes)
      setBranches(branchesRes.data || branchesRes)
      setUsers(usersRes.data || usersRes)
    } catch (error) {
      console.error('Error fetching metadata:', error)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  // Event handlers
  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleLeadAction = async (action, leadId, data = {}) => {
    try {
      setActionLoading(prev => ({ ...prev, [leadId]: true }))
      
      switch (action) {
        case 'updateStatus':
          await leadService.updateLeadStatus(leadId, data.status, data.comments)
          toast.success('Lead status updated successfully')
          break
        case 'assign':
          await leadService.assignLead(leadId, data.assignedTo, data.comments)
          toast.success('Lead assigned successfully')
          break
        case 'delete':
          if (window.confirm('Are you sure you want to delete this lead?')) {
            await leadService.deleteLead(leadId)
            toast.success('Lead deleted successfully')
          } else {
            return
          }
          break
        default:
          return
      }
      
      fetchLeads()
      fetchStatistics()
    } catch (error) {
      console.error(`Error ${action} lead:`, error)
      toast.error(`Failed to ${action} lead`)
    } finally {
      setActionLoading(prev => ({ ...prev, [leadId]: false }))
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedLeads.length === 0) {
      toast.warning('Please select leads first')
      return
    }

    try {
      setLoading(true)
      
      switch (action) {
        case 'assign':
          if (!bulkAssignUser) {
            toast.warning('Please select a user to assign leads to')
            return
          }
          await leadService.bulkAssignLeads(selectedLeads, bulkAssignUser)
          toast.success(`${selectedLeads.length} leads assigned successfully`)
          setShowBulkAssign(false)
          setBulkAssignUser('')
          break
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedLeads.length} leads?`)) {
            // Note: You might need to implement bulk delete in your service
            for (const leadId of selectedLeads) {
              await leadService.deleteLead(leadId)
            }
            toast.success(`${selectedLeads.length} leads deleted successfully`)
          } else {
            return
          }
          break
        default:
          return
      }
      
      setSelectedLeads([])
      fetchLeads()
      fetchStatistics()
    } catch (error) {
      console.error(`Error bulk ${action}:`, error)
      toast.error(`Failed to ${action} selected leads`)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await leadService.exportLeads(filters, 'csv')
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Leads exported successfully')
    } catch (error) {
      console.error('Error exporting leads:', error)
      toast.error('Failed to export leads')
    }
  }

  const getStatusColor = (status) => {
    const statusObj = leadStatuses.find(s => s.value === status)
    return statusObj ? statusObj.color : 'gray'
  }

  const getPriorityColor = (priority) => {
    const priorityObj = leadPriorities.find(p => p.value === priority)
    return priorityObj ? priorityObj.color : 'gray'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Target className="mr-3 h-8 w-8 text-blue-600" />
              Lead Management
            </h1>
            <p className="mt-2 text-gray-600">
              Track, manage, and convert your sales leads effectively
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <RoleBasedAccess requiredPermissions={['add_lead']}>
              <button
                onClick={() => router.push('/dashboard/leads/add')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </button>
            </RoleBasedAccess>
            
            <RoleBasedAccess requiredPermissions={['import_leads']}>
              <button
                onClick={() => router.push('/dashboard/leads/import')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </button>
            </RoleBasedAccess>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        <StatCard
          title="Total Leads"
          value={statistics.total}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="New"
          value={statistics.new}
          icon={Plus}
          color="blue"
        />
        <StatCard
          title="Contacted"
          value={statistics.contacted}
          icon={Phone}
          color="yellow"
        />
        <StatCard
          title="Interested"
          value={statistics.interested}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Converted"
          value={statistics.converted}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Lost"
          value={statistics.lost}
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Conversion Rate"
          value={statistics.total > 0 ? `${((statistics.converted / statistics.total) * 100).toFixed(1)}%` : '0%'}
          icon={Target}
          color="purple"
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads by name, phone, email..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              {leadStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </button>
            
            <button
              onClick={() => {
                fetchLeads()
                fetchStatistics()
              }}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Sources</option>
                  {leadSources.map(source => (
                    <option key={source.id} value={source.id}>{source.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  value={filters.assigned_to}
                  onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Users</option>
                  {users.filter(user => ['SALES_MANAGER', 'TL', 'BA', 'SBA'].includes(user.role)).map(user => (
                    <option key={user.employee_code} value={user.employee_code}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Priorities</option>
                  {leadPriorities.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>

              <ManagerOnly>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    value={filters.branch_id}
                    onChange={(e) => handleFilterChange('branch_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Branches</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                    ))}
                  </select>
                </div>
              </ManagerOnly>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedLeads.length} lead(s) selected
            </span>
            <div className="flex gap-2">
              <RoleBasedAccess requiredPermissions={['assign_leads']}>
                <button
                  onClick={() => setShowBulkAssign(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
                >
                  <UserPlus className="mr-1 h-3 w-3" />
                  Assign
                </button>
              </RoleBasedAccess>
              
              <RoleBasedAccess requiredPermissions={['delete_lead']}>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </button>
              </RoleBasedAccess>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Assign {selectedLeads.length} Lead(s)
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to User
              </label>
              <select
                value={bulkAssignUser}
                onChange={(e) => setBulkAssignUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select User</option>
                {users.filter(user => ['SALES_MANAGER', 'TL', 'BA', 'SBA'].includes(user.role)).map(user => (
                  <option key={user.employee_code} value={user.employee_code}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBulkAssign(false)
                  setBulkAssignUser('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkAction('assign')}
                disabled={!bulkAssignUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <TableLoader rows={10} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === leads.length && leads.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeads(leads.map(l => l.id))
                          } else {
                            setSelectedLeads([])
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      isSelected={selectedLeads.includes(lead.id)}
                      onSelect={(selected) => {
                        if (selected) {
                          setSelectedLeads(prev => [...prev, lead.id])
                        } else {
                          setSelectedLeads(prev => prev.filter(id => id !== lead.id))
                        }
                      }}
                      onAction={handleLeadAction}
                      actionLoading={actionLoading[lead.id]}
                      currentUser={currentUser}
                      hasPermission={hasPermission}
                      users={users}
                      leadStatuses={leadStatuses}
                      getStatusColor={getStatusColor}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {leads.length === 0 && (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || filters.status || filters.source
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first lead.'}
                </p>
                {hasPermission('add_lead') && (
                  <div className="mt-6">
                    <button
                      onClick={() => router.push('/dashboard/leads/add')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Lead
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}

// Statistics Card Component
function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500'
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-md ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

// Lead Row Component
function LeadRow({ 
  lead, 
  isSelected, 
  onSelect, 
  onAction, 
  actionLoading, 
  currentUser, 
  hasPermission, 
  users,
  leadStatuses,
  getStatusColor,
  getPriorityColor
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const router = useRouter()

  const canEdit = hasPermission('edit_lead')
  const canDelete = hasPermission('delete_lead') && (
    currentUser.role === 'SUPERADMIN' || 
    lead.assigned_to === currentUser.employee_code ||
    currentUser.role === 'SALES_MANAGER'
  )
  const canAssign = hasPermission('assign_leads')

  const statusColor = getStatusColor(lead.status)
  const priorityColor = getPriorityColor(lead.priority)

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded border-gray-300"
          />
        </td>
        <td className="px-6 py-4">
          <div>
            <div className="text-sm font-medium text-gray-900">{lead.name}</div>
            <div className="text-sm text-gray-500">ID: {lead.id}</div>
            {lead.service_interested && (
              <div className="text-xs text-gray-400">{lead.service_interested}</div>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            <div className="flex items-center mb-1">
              <Phone className="h-3 w-3 text-gray-400 mr-1" />
              {lead.phone_number}
            </div>
            {lead.email && (
              <div className="flex items-center">
                <Mail className="h-3 w-3 text-gray-400 mr-1" />
                <span className="truncate max-w-xs">{lead.email}</span>
              </div>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800`}>
            {leadStatuses.find(s => s.value === lead.status)?.label || lead.status}
          </span>
        </td>
        <td className="px-6 py-4">
          {lead.priority && (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${priorityColor}-100 text-${priorityColor}-800`}>
              {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
            </span>
          )}
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          {lead.lead_source?.name || 'N/A'}
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          {lead.assigned_user?.name || 'Unassigned'}
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 text-gray-400 mr-1" />
            {new Date(lead.created_at).toLocaleDateString()}
          </div>
        </td>
        <td className="px-6 py-4 text-right text-sm font-medium">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                <div className="py-1">
                  <button
                    onClick={() => {
                      router.push(`/dashboard/leads/${lead.id}`)
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </button>
                  
                  {canEdit && (
                    <button
                      onClick={() => {
                        router.push(`/dashboard/leads/${lead.id}/edit`)
                        setShowDropdown(false)
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Lead
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowStatusModal(true)
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Update Status
                  </button>
                  
                  {canAssign && (
                    <button
                      onClick={() => {
                        setShowAssignModal(true)
                        setShowDropdown(false)
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign Lead
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      router.push(`/dashboard/leads/${lead.id}/responses`)
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Responses
                  </button>
                  
                  <hr className="my-1" />
                  
                  {canDelete && (
                    <button
                      onClick={() => {
                        onAction('delete', lead.id)
                        setShowDropdown(false)
                      }}
                      className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Status Update Modal */}
      {showStatusModal && (
        <StatusUpdateModal
          lead={lead}
          leadStatuses={leadStatuses}
          onClose={() => setShowStatusModal(false)}
          onUpdate={(status, comments) => {
            onAction('updateStatus', lead.id, { status, comments })
            setShowStatusModal(false)
          }}
        />
      )}

      {/* Assign Lead Modal */}
      {showAssignModal && (
        <AssignLeadModal
          lead={lead}
          users={users}
          onClose={() => setShowAssignModal(false)}
          onAssign={(assignedTo, comments) => {
            onAction('assign', lead.id, { assignedTo, comments })
            setShowAssignModal(false)
          }}
        />
      )}
    </>
  )
}

// Status Update Modal
function StatusUpdateModal({ lead, leadStatuses, onClose, onUpdate }) {
  const [status, setStatus] = useState(lead.status)
  const [comments, setComments] = useState('')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Update Lead Status
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {leadStatuses.map(statusOption => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add comments about this status change..."
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onUpdate(status, comments)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  )
}

// Assign Lead Modal
function AssignLeadModal({ lead, users, onClose, onAssign }) {
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || '')
  const [comments, setComments] = useState('')

  const salesUsers = users.filter(user => 
    ['SALES_MANAGER', 'TL', 'BA', 'SBA'].includes(user.role)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Assign Lead
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign to User
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select User</option>
            {salesUsers.map(user => (
              <option key={user.employee_code} value={user.employee_code}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assignment Comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add comments about this assignment..."
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onAssign(assignedTo, comments)}
            disabled={!assignedTo}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Assign Lead
          </button>
        </div>
      </div>
    </div>
  )
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }) {
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

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
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
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {pages.map(page => (
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
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}