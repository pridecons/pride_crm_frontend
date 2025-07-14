'use client'

import { useState } from 'react'
import {
  Plus,
  Upload,
  Download,
  Settings2,
  SlidersHorizontal,
  UserPlus,
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lead Management</h1>
          <p className="text-gray-500 text-sm">Manage, upload, fetch, and assign leads efficiently.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setOpenCreate(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> New Lead
          </button>
          <button
            onClick={() => setOpenUpload(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
          >
            <Upload size={16} /> Upload CSV
          </button>
          <button
            onClick={() => setOpenFetch(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
          >
            <Download size={16} /> Fetch Leads
          </button>
          <button
            onClick={() => setOpenSource(true)}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
          >
            <Settings2 size={16} /> Lead Sources
          </button>
          <button
            onClick={() => setOpenResponse(true)}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
          >
            <SlidersHorizontal size={16} /> Lead Responses
          </button>
        </div>
      </div>

      {/* Main content can go here */}
      <div className="border border-dashed rounded-lg p-10 text-center text-gray-400">
        Select an action above to manage leads.
      </div>

      {/* Modals */}
      <CreateLeadModal open={openCreate} onClose={() => setOpenCreate(false)} />
      <UploadLeadsModal open={openUpload} onClose={() => setOpenUpload(false)} />
      <FetchLeadsModal open={openFetch} onClose={() => setOpenFetch(false)} />
      <LeadSourceManagerModal open={openSource} onClose={() => setOpenSource(false)} />
      <LeadResponseManagerModal open={openResponse} onClose={() => setOpenResponse(false)} />
    </div>
  )
}
