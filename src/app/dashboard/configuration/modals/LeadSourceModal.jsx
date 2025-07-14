'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'
import { toast } from 'react-toastify'

export default function LeadSourceModal({ onClose }) {
  const [leadSources, setLeadSources] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)

  const fetchSources = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/v1/lead-source/')
      setLeadSources(res.data || [])
    } catch {
      toast.error('Failed to load lead sources')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Enter source name')
    try {
      if (editingId) {
        await axios.patch(`http://127.0.0.1:8000/api/v1/lead-source/${editingId}`, { name })
        toast.success('Updated successfully')
      } else {
        await axios.post('http://127.0.0.1:8000/api/v1/lead-source/', { name })
        toast.success('Created successfully')
      }
      setName('')
      setEditingId(null)
      fetchSources()
    } catch {
      toast.error('Error saving source')
    }
  }

  const handleEdit = (src) => {
    setName(src.name)
    setEditingId(src.id)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this source?')) return
    try {
      await axios.delete(`http://127.0.0.1:8000/api/v1/lead-source/${id}`)
      toast.success('Deleted')
      fetchSources()
    } catch {
      toast.error('Failed to delete')
    }
  }

  useEffect(() => {
    fetchSources()
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
      <div className="bg-white w-full max-w-lg rounded shadow p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-black">
          <X />
        </button>

        <h2 className="text-xl font-semibold mb-4">Lead Sources</h2>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter lead source name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {editingId ? 'Update' : 'Add'}
          </button>
        </form>

        <ul className="space-y-2 max-h-[300px] overflow-auto">
          {leadSources.map((src) => (
            <li key={src.id} className="border p-2 rounded flex justify-between items-center">
              <span>{src.name}</span>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(src)} className="text-blue-600 text-sm">Edit</button>
                <button onClick={() => handleDelete(src.id)} className="text-red-600 text-sm">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
