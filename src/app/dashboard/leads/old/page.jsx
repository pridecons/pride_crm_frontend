'use client'

import { useState } from 'react'
import axios from 'axios'
import { PlusCircle } from 'lucide-react'
import FetchConfigModal from '../components/FetchLeadsModal'

export default function OldLeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [showFetchModal, setShowFetchModal] = useState(false)

  const handleFetchLeads = async () => {
    try {
      setLoading(true)
      const res = await axios.post('http://127.0.0.1:8000/api/v1/leads/fetch', {})
      setLeads(res.data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Old Leads</h1>
        <button
  onClick={() => setShowFetchModal(true)}
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
>
  Fetch
</button>
      </div>

      {/* Lead Table */}
      <div className="overflow-auto bg-white rounded-lg shadow border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 font-semibold text-gray-700">S.No.</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Client Name</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Email</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Mobile</th>
              <th className="px-4 py-2 font-semibold text-gray-700">City</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Occupation</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Investment</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Response</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                  No leads found. Click 'Fetch' to load leads.
                </td>
              </tr>
            ) : (
              leads.map((lead, index) => (
                <tr key={lead.id}>
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2">{lead.full_name}</td>
                  <td className="px-4 py-2">{lead.email}</td>
                  <td className="px-4 py-2">{lead.mobile}</td>
                  <td className="px-4 py-2">{lead.city}</td>
                  <td className="px-4 py-2">{lead.occupation}</td>
                  <td className="px-4 py-2">{lead.investment}</td>
                  <td className="px-4 py-2">
                    <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full">
                      <option value="">Select</option>
                      <option value="Interested">Interested</option>
                      <option value="Not Interested">Not Interested</option>
                      <option value="Follow Up">Follow Up</option>
                      <option value="Wrong Number">Wrong Number</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Comment here..."
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <FetchConfigModal open={showFetchModal} onClose={() => setShowFetchModal(false)} />

    </div>
  )
}
