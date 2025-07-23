'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Cookies from 'js-cookie'

export default function CreateLeadModal({ open, onClose }) {
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
    segment: '',
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

  // Get user info from cookies
  const userInfo = Cookies.get('user_info') ? JSON.parse(Cookies.get('user_info')) : {}

  useEffect(() => {
    if (!open) return
    axios.get('http://147.93.30.144:8000/api/v1/lead-config/sources/?skip=0&limit=100')
      .then(res => setLeadSources(res.data || []))
    axios.get('http://147.93.30.144:8000/api/v1/lead-config/responses/?skip=0&limit=100')
      .then(res => setLeadResponses(res.data || []))
  }, [open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Prepare payload for API
    const payload = {
      ...formData,
      branch_id: userInfo.branch_id || null,
      created_by: userInfo.employee_code || 'Admin',
      created_by_name: userInfo.name || 'Admin',
      segment: formData.segment ? formData.segment.split(',').map(s => s.trim()) : [],
      comment: formData.comment ? { note: formData.comment } : {},
    }

    try {
      await axios.post('http://147.93.30.144:8000/api/v1/leads/', payload)
      toast.success('Lead created successfully')
      onClose()
      setFormData({
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
        segment: '',
        experience: '',
        investment: '',
        lead_response_id: '',
        lead_source_id: '',
        comment: '',
        call_back_date: '',
        lead_status: '',
        profile: '',
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to create lead')
    }
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <Dialog.Panel className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title className="text-lg font-medium text-gray-900">Create New Lead</Dialog.Title>
                    <button type="button" className="text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
                  </div>

                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto p-1">
                    <input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Full Name" className="p-2 border rounded" required />
                    <input name="father_name" value={formData.father_name} onChange={handleChange} placeholder="Father Name" className="p-2 border rounded" />
                    <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile" className="p-2 border rounded" required />
                    <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded" />
                    <input name="state" value={formData.state} onChange={handleChange} placeholder="State" className="p-2 border rounded" />
                    <input name="district" value={formData.district} onChange={handleChange} placeholder="District" className="p-2 border rounded" />
                    <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="p-2 border rounded" />
                    <input name="alternate_mobile" value={formData.alternate_mobile} onChange={handleChange} placeholder="Alternate Mobile" className="p-2 border rounded" />
                    <input name="dob" type="date" value={formData.dob} onChange={handleChange} className="p-2 border rounded" />
                    <input name="aadhaar" value={formData.aadhaar} onChange={handleChange} placeholder="Aadhaar" className="p-2 border rounded" />
                    <input name="pan" value={formData.pan} onChange={handleChange} placeholder="PAN" className="p-2 border rounded" />
                    <input name="gstin" value={formData.gstin} onChange={handleChange} placeholder="GSTIN" className="p-2 border rounded" />
                    <input name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Occupation" className="p-2 border rounded" />
                    <input name="segment" value={formData.segment} onChange={handleChange} placeholder="Segment (comma separated)" className="p-2 border rounded" />
                    <input name="investment" value={formData.investment} onChange={handleChange} placeholder="Investment" className="p-2 border rounded" />
                    <input name="experience" value={formData.experience} onChange={handleChange} placeholder="Experience" className="p-2 border rounded" />
                    <input name="profile" value={formData.profile} onChange={handleChange} placeholder="Profile" className="p-2 border rounded" />
                    <select name="lead_response_id" value={formData.lead_response_id} onChange={handleChange} className="p-2 border rounded" required>
                      <option value="">Select Response</option>
                      {leadResponses.map((res) => (
                        <option key={res.id} value={res.id}>{res.name}</option>
                      ))}
                    </select>
                    <select name="lead_source_id" value={formData.lead_source_id} onChange={handleChange} className="p-2 border rounded" required>
                      <option value="">Select Source</option>
                      {leadSources.map((src) => (
                        <option key={src.id} value={src.id}>{src.name}</option>
                      ))}
                    </select>
                    <input name="lead_status" value={formData.lead_status} onChange={handleChange} placeholder="Lead Status" className="p-2 border rounded" />
                    <input name="call_back_date" type="date" value={formData.call_back_date} onChange={handleChange} className="p-2 border rounded" />
                    <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="p-2 border rounded col-span-2" />
                    <textarea name="comment" value={formData.comment} onChange={handleChange} placeholder="Description" className="p-2 border rounded col-span-2" />

                    <div className="col-span-2 flex justify-end">
                      <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                        Save Lead
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
