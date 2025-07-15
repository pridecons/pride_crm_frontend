'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function LeadForm() {
  const [formData, setFormData] = useState({
    full_name: '',
    father_name: '',
    email: '',
    mobile: '',
    alternate_mobile: '',
    aadhaar: '',
    pan: '',
    gstin: '',
    state: '',
    city: '',
    district: '',
    address: '',
    dob: '',
    occupation: '',
    segment: [],
    experience: '',
    investment: '',
    lead_response_id: '',
    lead_source_id: '',
    comment: '',
    call_back_date: '',
    lead_status: '',
    profile: '',
  })

  const [leadSources, setLeadSources] = useState([])
  const [leadResponses, setLeadResponses] = useState([])

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/v1/lead-config/sources/?skip=0&limit=100')
      .then(res => setLeadSources(res.data || []))
    axios.get('http://127.0.0.1:8000/api/v1/lead-config/responses/?skip=0&limit=100')
      .then(res => setLeadResponses(res.data || []))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://127.0.0.1:8000/api/v1/leads/', formData)
      toast.success('Lead created successfully')
    } catch (err) {
      console.error(err)
      toast.error('Error creating lead')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-6 bg-white rounded shadow">
      {/* Basic Details */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-2 rounded-t font-bold">
        Basic Details
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-t-0 rounded-b">
        <input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Full Name" className="p-2 border rounded" />
        <input name="father_name" value={formData.father_name} onChange={handleChange} placeholder="Father Name" className="p-2 border rounded" />
        <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile" className="p-2 border rounded" />
        <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded" />
        <input name="state" value={formData.state} onChange={handleChange} placeholder="State" className="p-2 border rounded" />
        <input name="district" value={formData.district} onChange={handleChange} placeholder="District" className="p-2 border rounded" />
        <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="p-2 border rounded" />
        <input name="alternate_mobile" value={formData.alternate_mobile} onChange={handleChange} placeholder="Alternate Mobile" className="p-2 border rounded" />
        <input name="dob" type="date" value={formData.dob} onChange={handleChange} className="p-2 border rounded" />
        <input name="aadhaar" value={formData.aadhaar} onChange={handleChange} placeholder="Aadhaar Number" className="p-2 border rounded" />
        <input name="pan" value={formData.pan} onChange={handleChange} placeholder="PAN Number" className="p-2 border rounded" />
        <input name="gstin" value={formData.gstin} onChange={handleChange} placeholder="GST Number" className="p-2 border rounded" />
        <input name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Occupation" className="p-2 border rounded" />
        <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="p-2 border rounded col-span-2" />
      </div>

      {/* Investment Details */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-2 mt-8 rounded-t font-bold">
        Investment Details
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-t-0 rounded-b">
        <input name="segment" value={formData.segment} onChange={handleChange} placeholder="Segment" className="p-2 border rounded" />
        <input name="investment" value={formData.investment} onChange={handleChange} placeholder="Investment" className="p-2 border rounded" />
        <input name="experience" value={formData.experience} onChange={handleChange} placeholder="Experience" className="p-2 border rounded" />
        <input name="profile" value={formData.profile} onChange={handleChange} placeholder="Profile" className="p-2 border rounded" />
        <select name="lead_response_id" value={formData.lead_response_id} onChange={handleChange} className="p-2 border rounded">
          <option value="">Select Response</option>
          {leadResponses.map((res) => (
            <option key={res.id} value={res.id}>{res.name}</option>
          ))}
        </select>
        <select name="lead_source_id" value={formData.lead_source_id} onChange={handleChange} className="p-2 border rounded">
          <option value="">Select Source</option>
          {leadSources.map((src) => (
            <option key={src.id} value={src.id}>{src.name}</option>
          ))}
        </select>
        <input name="lead_status" value={formData.lead_status} onChange={handleChange} placeholder="Lead Status" className="p-2 border rounded" />
        <input name="call_back_date" type="date" value={formData.call_back_date} onChange={handleChange} className="p-2 border rounded" />
        <textarea name="comment" value={formData.comment} onChange={handleChange} placeholder="Description" className="p-2 border rounded col-span-2" />
      </div>

      <div className="text-center mt-6">
        <button type="submit" className="bg-green-600 text-white px-8 py-2 rounded hover:bg-green-700">
          Save
        </button>
      </div>
    </form>
  )
}
