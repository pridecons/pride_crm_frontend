'use client'
import { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function CreateBranchWithManagerPage() {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)

  const [formData, setFormData] = useState({
    branch_name: '',
    branch_address: '',
    branch_pan: '',
    branch_aadhaar: '',
    branch_active: true,
    authorized_person: '',
    manager_name: '',
    manager_email: '',
    manager_phone: '',
    manager_password: '',
    manager_address: '',
    manager_dob: '',
    manager_experience: '',
    manager_father_name: '',
    manager_pan: '',
    manager_aadhaar: '',
    manager_comment: '',
    manager_city: '',
    manager_state: '',
    manager_pincode: '',
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!file) {
      toast.error('Please upload the agreement PDF.')
      return
    }

    try {
      setLoading(true)
      const form = new FormData()

      Object.entries(formData).forEach(([key, val]) => {
        form.append(key, val)
      })

      form.append('agreement_pdf', file)

      const response = await axios.post(
        'http://127.0.0.1:8000/branches/create-with-manager',
        form,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Accept: 'application/json',
          },
        }
      )

      toast.success(response.data.message || 'Branch & Manager created successfully!')
      setFormData({
        branch_name: '',
        branch_address: '',
        branch_pan: '',
        branch_aadhaar: '',
        branch_active: true,
        authorized_person: '',
        manager_name: '',
        manager_email: '',
        manager_phone: '',
        manager_password: '',
        manager_address: '',
        manager_dob: '',
        manager_experience: '',
        manager_father_name: '',
        manager_pan: '',
        manager_aadhaar: '',
        manager_comment: '',
        manager_city: '',
        manager_state: '',
        manager_pincode: '',
      })
      setFile(null)
    } catch (err) {
      console.error(err)
      toast.error('Creation failed. Please check inputs.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white p-6 shadow rounded">
      <h1 className="text-2xl font-bold mb-6">Create Branch with Manager</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        {/* Branch Info */}
        <input name="branch_name" placeholder="Branch Name" value={formData.branch_name} onChange={handleChange} className="border p-2 rounded col-span-2" />
        <input name="branch_address" placeholder="Branch Address" value={formData.branch_address} onChange={handleChange} className="border p-2 rounded col-span-2" />
        <input name="authorized_person" placeholder="Authorized Person" value={formData.authorized_person} onChange={handleChange} className="border p-2 rounded" />
        <input name="branch_pan" placeholder="Branch PAN" value={formData.branch_pan} onChange={handleChange} className="border p-2 rounded" />
        <input name="branch_aadhaar" placeholder="Branch Aadhaar" value={formData.branch_aadhaar} onChange={handleChange} className="border p-2 rounded" />
        <div className="flex items-center col-span-2 gap-2">
          <input type="checkbox" name="branch_active" checked={formData.branch_active} onChange={handleChange} />
          <label htmlFor="branch_active">Active Branch?</label>
        </div>

        {/* Manager Info */}
        <input name="manager_name" placeholder="Manager Name" value={formData.manager_name} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_email" placeholder="Manager Email" value={formData.manager_email} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_phone" placeholder="Manager Phone" value={formData.manager_phone} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_password" placeholder="Manager Password" type="password" value={formData.manager_password} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_father_name" placeholder="Manager's Father Name" value={formData.manager_father_name} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_pan" placeholder="Manager PAN" value={formData.manager_pan} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_aadhaar" placeholder="Manager Aadhaar" value={formData.manager_aadhaar} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_dob" type="date" placeholder="DOB" value={formData.manager_dob} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_experience" placeholder="Experience (Years)" type="number" value={formData.manager_experience} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_address" placeholder="Manager Address" value={formData.manager_address} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_city" placeholder="City" value={formData.manager_city} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_state" placeholder="State" value={formData.manager_state} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_pincode" placeholder="Pincode" value={formData.manager_pincode} onChange={handleChange} className="border p-2 rounded" />
        <input name="manager_comment" placeholder="Comment" value={formData.manager_comment} onChange={handleChange} className="border p-2 rounded col-span-2" />

        <input type="file" accept="application/pdf" onChange={handleFileChange} className="border p-2 rounded col-span-2" />

        <button type="submit" disabled={loading} className="col-span-2 bg-blue-600 text-white py-2 rounded">
          {loading ? 'Creating...' : 'Create Branch + Manager'}
        </button>
      </form>
    </div>
  )
}
