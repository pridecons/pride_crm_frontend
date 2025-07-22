'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const API = 'http://147.93.30.144:8000/api/v1/lead-config/responses'

export default function LeadResponseManagerModal({ open, onClose }) {
  const [formData, setFormData] = useState({ name: '', lead_limit: '' })
  const [responses, setResponses] = useState([])
  const [editId, setEditId] = useState(null)

  const fetchResponses = async () => {
    try {
      const res = await axios.get(`${API}/?skip=0&limit=100`)
      setResponses(res.data || [])
    } catch (err) {
      toast.error('Failed to fetch responses')
    }
  }

  useEffect(() => {
    if (open) fetchResponses()
  }, [open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'lead_limit' ? parseInt(value) || '' : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.lead_limit) {
      toast.error('Name and Lead Limit are required')
      return
    }

    try {
      if (editId) {
        await axios.put(`${API}/${editId}`, formData)
        toast.success('Response updated')
      } else {
        await axios.post(API, formData)
        toast.success('Response created')
      }
      setFormData({ name: '', lead_limit: '' })
      setEditId(null)
      fetchResponses()
    } catch (err) {
      toast.error('Save failed')
    }
  }

  const handleEdit = (item) => {
    setEditId(item.id)
    setFormData({ name: item.name, lead_limit: item.lead_limit })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead response?')) return
    try {
      await axios.delete(`${API}/${id}?force=false`)
      toast.success('Deleted')
      fetchResponses()
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
                    {editId ? 'Edit' : 'Add'} Lead Response
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
                    placeholder="Response Name"
                    className="w-full border px-3 py-2 rounded"
                  />
                  <input
                    name="lead_limit"
                    type="number"
                    value={formData.lead_limit}
                    onChange={handleChange}
                    placeholder="Lead Limit"
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
                  <h3 className="text-lg font-semibold mb-2">Existing Responses</h3>
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {responses.map((res) => (
                      <li
                        key={res.id}
                        className="p-3 bg-gray-50 rounded flex justify-between items-center border"
                      >
                        <div>
                          <div className="font-medium">{res.name}</div>
                          <div className="text-sm text-gray-600">
                            Lead Limit: {res.lead_limit}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => handleEdit(res)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600 hover:underline"
                            onClick={() => handleDelete(res.id)}
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
