'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Building, Users, TrendingUp, Globe, Search, Filter } from 'lucide-react'
import BranchCard from '../../components/Branch/BranchCard'
import EditBranchModal from './modals/EditBranchModal'
import AddBranchModal from '@/components/Branch/AddBranchModal' // ✅ Import our modal

export default function DashboardPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false)

  const handleEditBranch = (branch) => {
    setSelectedBranch(branch)
    setShowEditModal(true)
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const res = await axios.get('http://147.93.30.144:8000/api/v1/branches/')
      setBranches(res.data || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.address?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || (filterStatus === 'active' && branch.active) || (filterStatus === 'inactive' && !branch.active)
    return matchesSearch && matchesFilter
  })

  const stats = [
    {
      title: 'Total Branches',
      value: branches.length,
      icon: Building,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Active Users',
      value: branches.reduce((sum, branch) => sum + (branch.activeUsers || 0), 0),
      icon: Users,
      color: 'bg-green-500',
      change: '+5%'
    },
    {
      title: 'Total Leads',
      value: branches.reduce((sum, branch) => sum + (branch.totalLeads || 0), 0),
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+23%'
    },
    {
      title: 'Web Leads',
      value: branches.reduce((sum, branch) => sum + (branch.webLeads || 0), 0),
      icon: Globe,
      color: 'bg-orange-500',
      change: '+8%'
    }
  ]

  const StatCard = ({ stat }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{stat.title}</p>
          <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">{stat.change} from last month</p>
        </div>
        <div className={`p-3 rounded-full ${stat.color}`}>
          <stat.icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="mt-2 text-sm text-gray-600">Manage and monitor all your branches</p>
        </div>
        <button
          onClick={() => setIsAddBranchModalOpen(true)}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium"
        >
          + Add Branch
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900">All Branches</h2>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search branches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.length > 0 ? (
          filteredBranches.map(branch => (
            <BranchCard key={branch.id} branch={branch} onEdit={handleEditBranch} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Building size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No branches found</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first branch'
              }
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditBranchModal
        open={showEditModal}
        branch={selectedBranch}
        onClose={() => {
          setShowEditModal(false)
          setSelectedBranch(null)
        }}
        onUpdated={() => {
          setShowEditModal(false)
          setSelectedBranch(null)
          fetchBranches()
        }}
      />

      {/* ✅ Add Branch Modal */}
      {isAddBranchModalOpen && (
        <AddBranchModal
          isOpen={isAddBranchModalOpen}
          onClose={() => {
            setIsAddBranchModalOpen(false)
            fetchBranches() // Refresh branch list after creation
          }}
        />
      )}
    </div>
  )
}
