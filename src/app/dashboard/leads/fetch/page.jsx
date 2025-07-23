'use client'

import { useState } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'

export default function FetchLeadsPage() {
  const [count, setCount] = useState(100)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFetch = async () => {
    setLoading(true)
    setError('')
    try {
      const token = Cookies.get('access_token')

      const res = await axios.post(
        'http://147.93.30.144:8000/api/v1/leads/fetch',
        { count: parseInt(count) || 100 },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setLeads(res.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Fetch Leads</h1>

      <div className="mb-4 flex gap-4 items-center">
        <input
          type="number"
          className="border p-2 rounded"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          placeholder="Number of leads"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? 'Fetching...' : 'Fetch Leads'}
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {leads.length > 0 && (
        <div className="overflow-x-auto mt-6">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">#</th>
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Mobile</th>
                <th className="border px-4 py-2">City</th>
                <th className="border px-4 py-2">Segment</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr key={lead.id} className="text-center">
                  <td className="border px-4 py-2">{index + 1}</td>
                  <td className="border px-4 py-2">{lead.full_name}</td>
                  <td className="border px-4 py-2">{lead.mobile}</td>
                  <td className="border px-4 py-2">{lead.city}</td>
                  <td className="border px-4 py-2">{lead.segment?.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leads.length === 0 && !loading && (
        <p className="mt-6 text-gray-500">No leads found.</p>
      )}
    </div>
  )
}
