// components/AddBranchModal.jsx
'use client'

import { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function AddBranchModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    authorized_person: '',
    pan: '',
    aadhaar: '',
    agreement: null,
    manager_name: '',
    manager_email: '',
    manager_phone: '',
    manager_doj: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, files } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = new FormData()
    data.append('name', formData.name)
    data.append('address', formData.address)
    data.append('authorized_person', formData.authorized_person)
    data.append('pan', formData.pan)
    data.append('aadhaar', formData.aadhaar)
    data.append('agreement', formData.agreement)
    data.append('manager_name', formData.manager_name)
    data.append('manager_email', formData.manager_email)
    data.append('manager_phone', formData.manager_phone)
    data.append('manager_doj', formData.manager_doj)

    try {
      setLoading(true)
      const res = await axios.post('http://127.0.0.1:8000/api/v1/branches/create-with-manager', data)
      toast.success(res.data.message)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Branch creation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow max-w-2xl w-full space-y-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold">Create Branch with Manager</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input name="name" placeholder="Branch Name" onChange={handleChange} required className="p-2 border rounded" />
          <input name="authorized_person" placeholder="Authorized Person" onChange={handleChange} required className="p-2 border rounded" />
          <input name="pan" placeholder="PAN" onChange={handleChange} required className="p-2 border rounded" />
          <input name="aadhaar" placeholder="Aadhaar" onChange={handleChange} required className="p-2 border rounded" />
          <textarea name="address" placeholder="Address" onChange={handleChange} required className="col-span-2 p-2 border rounded" />
          <input type="file" name="agreement" onChange={handleChange} className="col-span-2" accept=".pdf" />

          <hr className="col-span-2 my-2" />
          <h3 className="col-span-2 text-lg font-medium text-gray-700">Manager Details</h3>
          <input name="manager_name" placeholder="Manager Name" onChange={handleChange} required className="p-2 border rounded" />
          <input name="manager_email" type="email" placeholder="Manager Email" onChange={handleChange} required className="p-2 border rounded" />
          <input name="manager_phone" placeholder="Manager Phone" onChange={handleChange} required className="p-2 border rounded" />
          <input name="manager_doj" type="date" placeholder="DOJ" onChange={handleChange} required className="p-2 border rounded" />

          <div className="col-span-2 flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white">
              {loading ? 'Saving...' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
