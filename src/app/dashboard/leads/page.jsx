'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Plus,
  Upload,
  Download,
  Settings2,
  SlidersHorizontal,
  Users,
  Clock,
  Search,
  Filter,
  MoreHorizontal,
  Globe,
  PhoneCall,
  CheckCircle,
  Trash2,
  Target,
  TrendingUp,
  Calendar
} from 'lucide-react'

import CreateLeadModal from './components/CreateLeadModel'
import UploadLeadsModal from './components/UploadLeadModel'
import FetchLeadsModal from './components/FetchLeadsModal'
import LeadSourceManagerModal from './components/LeadSourceManagerModal'
import LeadResponseManagerModal from './components/LeadResponseManagerModal'

export default function LeadsDashboardPage() {
  const [openCreate, setOpenCreate] = useState(false)
  const [openUpload, setOpenUpload] = useState(false)
  const [openFetch, setOpenFetch] = useState(false)
  const [openSource, setOpenSource] = useState(false)
  const [openResponse, setOpenResponse] = useState(false)

  const [activeTab, setActiveTab] = useState('all')

  const [leads, setLeads] = useState({
    all: [],
    new: [],
    old: [],
  })

  const [leadResponses, setLeadResponses] = useState([])

  // Fetch lead responses for dropdown
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/v1/lead-config/responses/?skip=0&limit=100')
      .then(res => setLeadResponses(res.data || []))
      .catch(() => console.error('Failed to load lead responses'))
  }, [])

  // ✅ Handler when FetchLeadsModal returns leads
  const handleLeadsFetched = (fetched) => {
    setLeads(prev => ({
      ...prev,
      all: [...fetched, ...prev.all],
      new: [...fetched, ...prev.new],
    }))
  }

  // ✅ Handler when response changes
  const handleResponseChange = async (leadId, newResponseId) => {
    try {
      await axios.put(`http://127.0.0.1:8000/api/v1/leads/${leadId}`, {
        lead_response_id: newResponseId
      })
      // Move lead from "new" to "old"
      setLeads(prev => {
        const updatedNew = prev.new.filter(l => l.id !== leadId)
        const movedLead = prev.new.find(l => l.id === leadId)
        if (movedLead) movedLead.lead_response_id = newResponseId
        return {
          ...prev,
          new: updatedNew,
          old: [movedLead, ...prev.old],
          all: prev.all.map(l => l.id === leadId ? { ...l, lead_response_id: newResponseId } : l)
        }
      })
    } catch (err) {
      console.error(err)
    }
  }

  const leadCategories = [
    { id: 'all', label: 'All Leads', icon: Users, color: 'blue' },
    { id: 'new', label: 'New Leads', icon: Plus, color: 'green' },
    { id: 'old', label: 'Old Leads', icon: Clock, color: 'orange' },
    { id: 'web', label: 'Web Leads', icon: Globe, color: 'purple' },
    { id: 'followup', label: "Today's Follow-up", icon: PhoneCall, color: 'cyan' },
    { id: 'disposed', label: 'Disposed Leads', icon: CheckCircle, color: 'gray' },
    { id: 'deleted', label: 'Deleted Leads', icon: Trash2, color: 'red' }
  ]

  const stats = [
    { title: 'Total Leads', value: leads.all.length, change: '+12%', icon: Users, color: 'blue' },
    { title: 'Active Leads', value: leads.old.length, change: '+8%', icon: Target, color: 'green' },
    { title: 'Conversion Rate', value: '24.5%', change: '+3%', icon: TrendingUp, color: 'purple' },
    { title: 'This Month', value: leads.new.length, change: '+15%', icon: Calendar, color: 'orange' }
  ]

  const quickActions = [
    {
      title: 'Create New Lead',
      description: 'Add individual lead manually',
      icon: Plus,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      onClick: () => setOpenCreate(true)
    },
    {
      title: 'Upload CSV',
      description: 'Bulk import leads from file',
      icon: Upload,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      onClick: () => setOpenUpload(true)
    },
    {
      title: 'Fetch Leads',
      description: 'Import from external sources',
      icon: Download,
      bgColor: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      borderColor: 'border-cyan-200',
      hoverColor: 'hover:bg-cyan-100',
      onClick: () => setOpenFetch(true)
    },
    {
      title: 'Lead Sources',
      description: 'Manage lead source settings',
      icon: Settings2,
      bgColor: 'bg-gray-50',
      iconColor: 'text-gray-600',
      borderColor: 'border-gray-200',
      hoverColor: 'hover:bg-gray-100',
      onClick: () => setOpenSource(true)
    },
    {
      title: 'Lead Responses',
      description: 'Configure response templates',
      icon: SlidersHorizontal,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      hoverColor: 'hover:bg-indigo-100',
      onClick: () => setOpenResponse(true)
    }
  ]

  const getLeadsForTab = () => {
    switch (activeTab) {
      case 'new': return leads.new
      case 'old': return leads.old
      case 'all': return leads.all
      default: return []
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
            <p className="text-gray-600">Manage, upload, fetch, and assign leads efficiently</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setOpenCreate(true)} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              <Plus size={16} /> New Lead
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4 flex justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={action.onClick}
              className={`${action.bgColor} ${action.borderColor} ${action.hoverColor} border rounded-xl p-6 cursor-pointer`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 bg-white rounded-lg`}>
                  <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lead Tabs */}
        <div className="flex space-x-4 border-b mb-4">
          {leadCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-4 py-2 ${activeTab === cat.id ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow p-4">
          {getLeadsForTab().length > 0 ? (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Mobile</th>
                  <th className="px-4 py-2 text-left">City</th>
                  <th className="px-4 py-2 text-left">Response</th>
                </tr>
              </thead>
              <tbody>
                {getLeadsForTab().map((lead) => (
                  <tr key={lead.id} className="border-b">
                    <td className="px-4 py-2">{lead.full_name}</td>
                    <td className="px-4 py-2">{lead.email}</td>
                    <td className="px-4 py-2">{lead.mobile}</td>
                    <td className="px-4 py-2">{lead.city}</td>
                    <td className="px-4 py-2">
                      <select
                        value={lead.lead_response_id || ''}
                        onChange={(e) => handleResponseChange(lead.id, e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select Response</option>
                        {leadResponses.map((resp) => (
                          <option key={resp.id} value={resp.id}>{resp.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-6">No leads available in this category</p>
          )}
        </div>

        {/* Modals */}
        <CreateLeadModal open={openCreate} onClose={() => setOpenCreate(false)} />
        <UploadLeadsModal open={openUpload} onClose={() => setOpenUpload(false)} />
        <FetchLeadsModal
          open={openFetch}
          onClose={() => setOpenFetch(false)}
          onLeadsFetched={handleLeadsFetched} // ✅ Pass callback to update leads
        />
        <LeadSourceManagerModal open={openSource} onClose={() => setOpenSource(false)} />
        <LeadResponseManagerModal open={openResponse} onClose={() => setOpenResponse(false)} />
      </div>
    </div>
  )
}
