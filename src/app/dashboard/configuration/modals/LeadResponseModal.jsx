'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'
import { toast } from 'react-toastify'

export default function LeadResponseModal({ onClose }) {
  const [responses, setResponses] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)

  const fetchResponses = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/v1/lead-response/')
      setResponses(res.data || [])
    } catch {
      toast.error('Failed to load lead responses')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Enter response name')

    try {
      if (editingId) {
        await axios.patch(`http://127.0.0.1:8000/api/v1/lead-response/${editingId}`, { name })
        toast.success('Updated successfully')
      } else {
        await axios.post('http://127.0.0.1:8000/api/v1/lead-response/', { name })
        toast.success('Created successfully')
      }
      setName('')
      setEditingId(null)
      fetchResponses()
    } catch {
      toast.error('Error saving response')
    }
  }

  const handleEdit = (res) => {
    setName(res.name)
    setEditingId(res.id)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this response?')) return
    try {
      await axios.delete(`http://127.0.0.1:8000/api/v1/lead-response/${id}`)
      toast.success('Deleted')
      fetchResponses()
    } catch {
      toast.error('Failed to delete')
    }
  }

  useEffect(() => {
    fetchResponses()
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
      <div className="bg-white w-full max-w-lg rounded shadow p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-black">
          <X />
        </button>

        <h2 className="text-xl font-semibold mb-4">Lead Responses</h2>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter response name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {editingId ? 'Update' : 'Add'}
          </button>
        </form>

        <ul className="space-y-2 max-h-[300px] overflow-auto">
          {responses.map((res) => (
            <li key={res.id} className="border p-2 rounded flex justify-between items-center">
              <span>{res.name}</span>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(res)} className="text-blue-600 text-sm">Edit</button>
                <button onClick={() => handleDelete(res.id)} className="text-red-600 text-sm">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
