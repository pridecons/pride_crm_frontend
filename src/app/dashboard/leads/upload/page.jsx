'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Upload, FileText, Users, Building, MapPin, Briefcase, DollarSign, Mail, Phone, User } from 'lucide-react'

export default function LeadUploadPage() {
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
  const [loading, setLoading] = useState(false)
  const [leadSources, setLeadSources] = useState([])
  const [employees, setEmployees] = useState([])

  // Fetch lead sources and employee list
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [sourceRes, employeeRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/v1/lead-config/sources/?skip=0&limit=100'),
          axios.get('http://127.0.0.1:8000/api/v1/users/?skip=0&limit=100&active_only=false'),
        ])
        setLeadSources(sourceRes.data)
        setEmployees(employeeRes.data)
      } catch (err) {
        console.error('Failed to fetch dropdown data', err)
        toast.error('Failed to load lead sources or employees')
      }
    }

    fetchDropdowns()
  }, [])

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
      toast.error('Please upload a CSV file.')
      return
    }

    try {
      setLoading(true)
      const data = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value)
      })
      data.append('csv_file', csvFile)

      const res = await axios.post('http://127.0.0.1:8000/api/v1/bulk-leads/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
      })

      toast.success(
        `Uploaded ${res.data.successful_uploads} leads successfully. ${res.data.failed_uploads} failed.`
      )
    } catch (err) {
      console.error(err)
      toast.error('Lead upload failed.')
    } finally {
      setLoading(false)
    }
  }

  const fieldConfig = [
    { name: 'name_column', label: 'Name Column', icon: User, placeholder: 'Enter column name for lead names' },
    { name: 'mobile_column', label: 'Mobile Column', icon: Phone, placeholder: 'Enter column name for mobile numbers' },
    { name: 'email_column', label: 'Email Column', icon: Mail, placeholder: 'Enter column name for email addresses' },
    { name: 'city_column', label: 'City Column', icon: MapPin, placeholder: 'Enter column name for city' },
    { name: 'address_column', label: 'Address Column', icon: Building, placeholder: 'Enter column name for addresses' },
    { name: 'segment_column', label: 'Segment Column', icon: Users, placeholder: 'Enter column name for segments' },
    { name: 'occupation_column', label: 'Occupation Column', icon: Briefcase, placeholder: 'Enter column name for occupation' },
    { name: 'investment_column', label: 'Investment Column', icon: DollarSign, placeholder: 'Enter column name for investment' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Upload size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lead Upload</h1>
              <p className="text-gray-600">Upload multiple leads from CSV file</p>
            </div>
          </div>
          
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText size={20} className="text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">CSV Format Requirements</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Please ensure your CSV file contains the appropriate column headers that match the field names you specify below.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Column Mapping</h2>
            <p className="text-sm text-gray-600 mt-1">Map your CSV columns to the corresponding lead fields</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Column Mapping Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fieldConfig.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <field.icon size={16} className="text-gray-500" />
                    <span>{field.label}</span>
                  </label>
                  <input
                    type="text"
                    name={field.name}
                    placeholder={field.placeholder}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              ))}
            </div>

            {/* Dropdowns Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment & Source</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Source Dropdown */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Building size={16} className="text-gray-500" />
                    <span>Lead Source</span>
                  </label>
                  <select
                    name="lead_source_id"
                    value={formData.lead_source_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  >
                    <option value="">Select Lead Source</option>
                    {leadSources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee Code Dropdown */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Users size={16} className="text-gray-500" />
                    <span>Assign to Employee</span>
                  </label>
                  <select
                    name="employee_code"
                    value={formData.employee_code}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_code} value={emp.employee_code}>
                        {emp.name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload CSV File</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <FileText size={16} className="text-gray-500" />
                  <span>CSV File</span>
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload size={24} className="text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">CSV files only</p>
                      {csvFile && (
                        <p className="text-sm text-blue-600 mt-2 font-medium">
                          Selected: {csvFile.name}
                        </p>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Upload CSV</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}