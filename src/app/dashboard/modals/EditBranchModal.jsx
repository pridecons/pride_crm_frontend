'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'

export default function EditBranchModal({ open, onClose, branch, onUpdated }) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    authorized_person: '',
    pan: '',
    aadhaar: '',
    active: true,
    manager_id: '',
    agreement_pdf: null
  })

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name || '',
        address: branch.address || '',
        authorized_person: branch.authorized_person || '',
        pan: branch.pan || '',
        aadhaar: branch.aadhaar || '',
        active: branch.active ?? true,
        manager_id: branch.manager_id || '',
        agreement_pdf: null
      })
    }
  }, [branch])

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }))
    } else if (type === 'file') {
      setForm((prev) => ({ ...prev, agreement_pdf: files[0] }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('address', form.address)
    formData.append('authorized_person', form.authorized_person)
    formData.append('pan', form.pan)
    formData.append('aadhaar', form.aadhaar)
    formData.append('active', form.active)
    if (form.manager_id) formData.append('manager_id', form.manager_id)
    if (form.agreement_pdf) formData.append('agreement_pdf', form.agreement_pdf)

    try {
      const res = await axios.put(`http://127.0.0.1:8000/api/v1/branches/${branch.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Branch updated successfully!')
      onBranchUpdated(res.data)
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to update branch')
    }
  }

  if (!open || !branch) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Branch: {branch.name}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Branch Name" className="border p-2 rounded" required />
            <input name="authorized_person" value={form.authorized_person} onChange={handleChange} placeholder="Authorized Person" className="border p-2 rounded" required />
            <input name="address" value={form.address} onChange={handleChange} placeholder="Address" className="border p-2 rounded" required />
            <input name="pan" value={form.pan} onChange={handleChange} placeholder="PAN" className="border p-2 rounded" required />
            <input name="aadhaar" value={form.aadhaar} onChange={handleChange} placeholder="Aadhaar" className="border p-2 rounded" required />
            <input name="manager_id" value={form.manager_id} onChange={handleChange} placeholder="Manager Employee Code (optional)" className="border p-2 rounded" />
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="active" checked={form.active} onChange={handleChange} />
              <span>Active</span>
            </label>

            <label className="flex-1">
              <span className="block text-sm text-gray-600 mb-1">Upload Agreement (PDF)</span>
              <input type="file" accept="application/pdf" name="agreement_pdf" onChange={handleChange} />
            </label>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
