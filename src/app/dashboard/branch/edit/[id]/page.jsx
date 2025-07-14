'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'

export default function EditBranchPage() {
  const router = useRouter()
  const { id } = useParams()

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    authorized_person: '',
    pan: '',
    aadhaar: '',
    active: true,
    agreement_pdf: null,
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/branches/?skip=0&limit=100`)
        const branch = res.data.find((b) => b.id === parseInt(id))
        if (branch) {
          setFormData({
            name: branch.name,
            address: branch.address,
            authorized_person: branch.authorized_person,
            pan: branch.pan,
            aadhaar: branch.aadhaar,
            active: branch.active,
            agreement_pdf: null,
          })
        }
      } catch (error) {
        console.error('Failed to fetch branch:', error)
      }
    }

    fetchBranch()
  }, [id])

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked })
    } else if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = new FormData()
    for (const key in formData) {
      if (formData[key] !== null) {
        payload.append(key, formData[key])
      }
    }

    try {
      const res = await axios.put(`http://127.0.0.1:8000/branches/${id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      alert('Branch updated successfully!')
      router.push('/dashboard/branches')
    } catch (err) {
      console.error('Update failed:', err)
      alert('Failed to update branch')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Branch #{id}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" value={formData.name} onChange={handleChange} placeholder="Branch Name" className="w-full p-2 border rounded" />
        <input name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="w-full p-2 border rounded" />
        <input name="authorized_person" value={formData.authorized_person} onChange={handleChange} placeholder="Authorized Person" className="w-full p-2 border rounded" />
        <input name="pan" value={formData.pan} onChange={handleChange} placeholder="PAN" className="w-full p-2 border rounded" />
        <input name="aadhaar" value={formData.aadhaar} onChange={handleChange} placeholder="Aadhaar" className="w-full p-2 border rounded" />
        <div className="flex items-center gap-2">
          <label className="font-medium">Active:</label>
          <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} />
        </div>
        <div>
          <label>Upload Agreement (PDF)</label>
          <input type="file" name="agreement_pdf" accept="application/pdf" onChange={handleChange} />
        </div>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-6 rounded">
          {loading ? 'Updating...' : 'Update Branch'}
        </button>
      </form>
    </div>
  )
}
