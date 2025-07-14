'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const API_BASE = 'http://127.0.0.1:8000/api/v1/lead-config/responses'

export default function LeadResponseManager() {
  const [formData, setFormData] = useState({
    name: '',
    lead_limit: '',
  })

  const [loading, setLoading] = useState(false)
  const [responses, setResponses] = useState([])
  const [editId, setEditId] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'lead_limit' ? parseInt(value) || '' : value,
    }))
  }

  const fetchResponses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/?skip=0&limit=100`)
      setResponses(res.data || [])
    } catch (err) {
      console.error('Error fetching responses:', err)
      toast.error('Failed to fetch responses')
    }
  }

  useEffect(() => {
    fetchResponses()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.lead_limit) {
      toast.error('Both Name and Lead Limit are required.')
      return
    }

    try {
      setLoading(true)

      if (editId) {
        const res = await axios.put(`${API_BASE}/${editId}`, formData, {
          headers: { 'Content-Type': 'application/json' },
        })
        toast.success(`Lead response "${res.data.name}" updated!`)
      } else {
        const res = await axios.post(API_BASE, formData, {
          headers: { 'Content-Type': 'application/json' },
        })
        toast.success(`Lead response "${res.data.name}" created!`)
      }

      setFormData({ name: '', lead_limit: '' })
      setEditId(null)
      fetchResponses()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save lead response')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (resp) => {
    setEditId(resp.id)
    setFormData({ name: resp.name, lead_limit: resp.lead_limit })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this response?')) return

    try {
      await axios.delete(`${API_BASE}/${id}?force=false`)
      toast.success('Response deleted')
      fetchResponses()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete response')
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 shadow rounded">
      <h1 className="text-2xl font-bold mb-6">
        {editId ? 'Edit Lead Response' : 'Create Lead Response'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Response Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="number"
          name="lead_limit"
          placeholder="Lead Limit"
          value={formData.lead_limit}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? 'Saving...' : editId ? 'Update Response' : 'Create Lead Response'}
        </button>
      </form>

      {responses.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Existing Lead Responses</h2>
          <ul className="space-y-2">
            {responses.map((res) => (
              <li key={res.id} className="border p-3 rounded bg-gray-50 flex justify-between items-center">
                <div>
                  <div><strong>Name:</strong> {res.name}</div>
                  <div><strong>Lead Limit:</strong> {res.lead_limit}</div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(res)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(res.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
