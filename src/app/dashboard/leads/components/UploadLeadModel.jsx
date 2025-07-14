'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function UploadLeadsModal({ open, onClose }) {
  const [formData, setFormData] = useState({
    name_column: '',
    mobile_column: '',
    email_column: '',
    city_column: '',
    address_column: '',
    segment_column: '',
    occupation_column: '',
    investment_column: '',
    lead_source_id: '',
    employee_code: '',
  })
  const [csvFile, setCsvFile] = useState(null)
  const [leadSources, setLeadSources] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const fetchDropdowns = async () => {
      try {
        const [sources, users] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/v1/lead-config/sources/?skip=0&limit=100'),
          axios.get('http://127.0.0.1:8000/api/v1/users/?skip=0&limit=100&active_only=false'),
        ])
        setLeadSources(sources.data)
        setEmployees(users.data)
      } catch (err) {
        toast.error('Error fetching sources or users')
      }
    }
    fetchDropdowns()
  }, [open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!csvFile) {
      toast.error('CSV file is required')
      return
    }

    const data = new FormData()
    Object.entries(formData).forEach(([key, val]) => data.append(key, val))
    data.append('csv_file', csvFile)

    try {
      setLoading(true)
      const res = await axios.post('http://127.0.0.1:8000/api/v1/bulk-leads/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success(`Uploaded ${res.data.successful_uploads} leads successfully.`)
      onClose()
    } catch (err) {
      toast.error('Upload failed')
    } finally {
      setLoading(false)
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
              <Dialog.Panel className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-3xl">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title className="text-lg font-medium text-gray-900">Upload Leads</Dialog.Title>
                    <button type="button" className="text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['name', 'mobile', 'email', 'city', 'address', 'segment', 'occupation', 'investment'].map(field => (
                        <input
                          key={field}
                          name={`${field}_column`}
                          placeholder={`${field.charAt(0).toUpperCase() + field.slice(1)} Column`}
                          value={formData[`${field}_column`]}
                          onChange={handleChange}
                          className="p-2 border rounded"
                          required
                        />
                      ))}
                      <select name="lead_source_id" value={formData.lead_source_id} onChange={handleChange} className="p-2 border rounded" required>
                        <option value="">Select Lead Source</option>
                        {leadSources.map((src) => (
                          <option key={src.id} value={src.id}>{src.name}</option>
                        ))}
                      </select>
                      <select name="employee_code" value={formData.employee_code} onChange={handleChange} className="p-2 border rounded" required>
                        <option value="">Assign to Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.employee_code} value={emp.employee_code}>
                            {emp.name} ({emp.employee_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input type="file" accept=".csv" onChange={handleFileChange} className="border p-2 w-full rounded" required />
                      {csvFile && <p className="text-sm mt-1 text-blue-600">Selected: {csvFile.name}</p>}
                    </div>

                    <div className="text-right">
                      <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        {loading ? 'Uploading...' : 'Upload Leads'}
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
