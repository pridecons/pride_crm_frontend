'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const API_BASE = 'http://147.93.30.144:8000/api/v1/lead-config/sources'

export default function LeadSourceManager() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    created_by: '',
  })

  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState([])

  const fetchSources = async () => {
    try {
      const res = await axios.get(`${API_BASE}/?skip=0&limit=100`)
      setSources(res.data)
    } catch (err) {
      console.error('Error fetching sources:', err)
      toast.error('Failed to fetch lead sources')
    }
  }

  useEffect(() => {
    fetchSources()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { name, description, created_by } = formData

    if (!name || (!editId && !created_by)) {
      toast.error('Please fill in required fields.')
      return
    }

    try {
      setLoading(true)
      if (editId) {
        // Update existing
        const res = await axios.put(`${API_BASE}/${editId}`, { name, description })
        toast.success(`Lead source "${res.data.name}" updated!`)
      } else {
        // Create new
        const res = await axios.post(API_BASE, { name, description, created_by })
        toast.success(`Lead source "${res.data.name}" created!`)
      }

      setFormData({ name: '', description: '', created_by: '' })
      setEditId(null)
      fetchSources()
    } catch (err) {
      console.error(err)
      toast.error('Error saving lead source')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (source) => {
    setFormData({
      name: source.name,
      description: source.description,
      created_by: source.created_by || '',
    })
    setEditId(source.id)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this source?')) return

    try {
      await axios.delete(`${API_BASE}/${id}?force=false`)
      toast.success('Lead source deleted')
      fetchSources()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete lead source')
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-6 shadow rounded">
      <h1 className="text-2xl font-bold mb-6">
        {editId ? 'Edit Lead Source' : 'Create Lead Source'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Source Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        {!editId && (
          <input
            type="text"
            name="created_by"
            placeholder="Created By"
            value={formData.created_by}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? 'Saving...' : editId ? 'Update Source' : 'Create Source'}
        </button>
      </form>

      {sources.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Lead Sources</h2>
          <ul className="space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="border p-3 rounded bg-gray-50 flex justify-between items-center">
                <div>
                  <div><strong>Name:</strong> {source.name}</div>
                  <div><strong>Description:</strong> {source.description}</div>
                  <div><strong>Created By:</strong> {source.created_by || '—'}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(source)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(source.id)}
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
