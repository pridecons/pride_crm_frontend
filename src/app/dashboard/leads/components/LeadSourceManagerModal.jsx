'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const API = 'http://127.0.0.1:8000/api/v1/lead-config/sources'

export default function LeadSourceManagerModal({ open, onClose }) {
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [sources, setSources] = useState([])
  const [editId, setEditId] = useState(null)

  const fetchSources = async () => {
    try {
      const res = await axios.get(`${API}/?skip=0&limit=100`)
      setSources(res.data || [])
    } catch (err) {
      toast.error('Failed to load lead sources')
    }
  }

  useEffect(() => {
    if (open) fetchSources()
  }, [open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.description) {
      toast.error('Both name and description are required')
      return
    }

    try {
      if (editId) {
        await axios.put(`${API}/${editId}`, formData)
        toast.success('Source updated')
      } else {
        await axios.post(API, { ...formData, created_by: 'ADMIN' })
        toast.success('Source created')
      }
      fetchSources()
      setFormData({ name: '', description: '' })
      setEditId(null)
    } catch (err) {
      toast.error('Save failed')
    }
  }

  const handleEdit = (source) => {
    setEditId(source.id)
    setFormData({ name: source.name, description: source.description })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead source?')) return
    try {
      await axios.delete(`${API}/${id}?force=false`)
      toast.success('Deleted')
      fetchSources()
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded bg-white shadow-xl transition-all">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {editId ? 'Edit' : 'Add'} Lead Source
                  </h2>
                  <button onClick={onClose} className="text-gray-500 text-xl font-bold">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Source Name"
                    className="w-full border px-3 py-2 rounded"
                  />
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Description"
                    className="w-full border px-3 py-2 rounded"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    {editId ? 'Update' : 'Create'}
                  </button>
                </form>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-2">Existing Sources</h3>
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {sources.map((src) => (
                      <li
                        key={src.id}
                        className="p-3 bg-gray-50 rounded flex justify-between items-center border"
                      >
                        <div>
                          <div className="font-medium">{src.name}</div>
                          <div className="text-sm text-gray-600">{src.description}</div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => handleEdit(src)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600 hover:underline"
                            onClick={() => handleDelete(src.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
