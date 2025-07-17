'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Shield,
  Building2,
  DollarSign,
  Target,
  TrendingUp,
  MessageSquare,
  Check,
  Loader2,
  UserCheck,
  Home,
  Building,
  Briefcase
} from 'lucide-react'

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
  const [loadingPan, setLoadingPan] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    setIsSubmitting(true)
    try {
      await axios.post('http://127.0.0.1:8000/api/v1/leads/', formData)
      toast.success('Lead created successfully')
    } catch (err) {
      console.error(err)
      toast.error('Error creating lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyPan = async () => {
    if (!formData.pan) {
      toast.error('Please enter a PAN number first')
      return
    }
    setLoadingPan(true)
    try {
      const res = await axios.post(
        'http://127.0.0.1:8000/api/v1/micro-pan-verification',
        new URLSearchParams({ pannumber: formData.pan }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )

      if (res.data.success && res.data.data?.result) {
        const result = res.data.data.result
        setFormData(prev => ({
          ...prev,
          full_name: result.user_full_name || prev.full_name,
          father_name: result.user_father_name || prev.father_name,
          dob: result.user_dob ? formatDob(result.user_dob) : prev.dob,
          address: result.user_address?.full || prev.address,
          city: result.user_address?.city || prev.city,
          state: result.user_address?.state || prev.state,
        }))
        toast.success('PAN verified and details autofilled!')
      } else {
        toast.error('PAN verification failed')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error verifying PAN')
    } finally {
      setLoadingPan(false)
    }
  }

  const formatDob = (dobString) => {
    if (!dobString) return '';
    // PAN API already gives DD-MM-YYYY, so just return as-is
    return dobString;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 ">
      <div className="max-w-7xl ">
        {/* Header */}
        <div className="text-start mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Lead</h1>
          <p className="text-gray-600">Fill in the details below to add a new lead to your system</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Basic Details Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <User className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white">Basic Details</h2>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <input
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter full name"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Father Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <UserCheck className="w-4 h-4" />
                Father Name
              </label>
              <input
                name="father_name"
                value={formData.father_name}
                onChange={handleChange}
                placeholder="Enter father name"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Phone className="w-4 h-4" />
                Mobile Number
              </label>
              <input
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="Enter mobile number"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                type="email"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4" />
                State
              </label>
              <input
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter state"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* District */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building className="w-4 h-4" />
                District
              </label>
              <input
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="Enter district"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building2 className="w-4 h-4" />
                City
              </label>
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Alternate Mobile */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Phone className="w-4 h-4" />
                Alternate Mobile
              </label>
              <input
                name="alternate_mobile"
                value={formData.alternate_mobile}
                onChange={handleChange}
                placeholder="Enter alternate mobile"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </label>
              <input
                name="dob"
                type="text"
                value={formData.dob}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
                    setFormData((prev) => ({ ...prev, dob: value }));
                  }
                }}
                placeholder="DD-MM-YYYY"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Aadhaar */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Shield className="w-4 h-4" />
                Aadhaar Number
              </label>
              <input
                name="aadhaar"
                value={formData.aadhaar}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d{0,12}$/.test(value)) { // allow only digits, max 12
                    setFormData((prev) => ({ ...prev, aadhaar: value }));
                  }
                }}
                placeholder="Enter Aadhaar number"
                className="w-full p-3 border border-gray-200 rounded-lg"
              />
            </div>

            {/* PAN with Verify Button */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CreditCard className="w-4 h-4" />
                PAN Number
              </label>
              <div className="flex gap-3">
                <input
                  name="pan"
                  value={formData.pan}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase(); // convert to uppercase
                    if (/^[A-Z0-9]*$/.test(value)) { // only letters & numbers
                      setFormData((prev) => ({ ...prev, pan: value }));
                    }
                  }}
                  placeholder="Enter PAN number"
                  className="flex-1 p-3 border border-gray-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleVerifyPan}
                  disabled={loadingPan}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                >
                  {loadingPan ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Verify PAN
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* GST Number */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building2 className="w-4 h-4" />
                GST Number
              </label>
              <input
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="Enter GST number"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Occupation */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Briefcase className="w-4 h-4" />
                Occupation
              </label>
              <input
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                placeholder="Enter occupation"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Address */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Home className="w-4 h-4" />
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter complete address"
                rows="3"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>
          </div>

          {/* Investment Details Section */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 mt-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white">Investment Details</h2>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Segment */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Target className="w-4 h-4" />
                Segment
              </label>
              <input
                name="segment"
                value={formData.segment}
                onChange={handleChange}
                placeholder="Enter segment"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Investment */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <DollarSign className="w-4 h-4" />
                Investment Amount
              </label>
              <input
                name="investment"
                value={formData.investment}
                onChange={handleChange}
                placeholder="Enter investment amount"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Experience */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <TrendingUp className="w-4 h-4" />
                Experience
              </label>
              <input
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="Enter experience"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Profile */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4" />
                Profile
              </label>
              <input
                name="profile"
                value={formData.profile}
                onChange={handleChange}
                placeholder="Enter profile"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Lead Response */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MessageSquare className="w-4 h-4" />
                Lead Response
              </label>
              <select
                name="lead_response_id"
                value={formData.lead_response_id}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="">Select Response</option>
                {leadResponses.map((res) => (
                  <option key={res.id} value={res.id}>{res.name}</option>
                ))}
              </select>
            </div>

            {/* Lead Source */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building2 className="w-4 h-4" />
                Lead Source
              </label>
              <select
                name="lead_source_id"
                value={formData.lead_source_id}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="">Select Source</option>
                {leadSources.map((src) => (
                  <option key={src.id} value={src.id}>{src.name}</option>
                ))}
              </select>
            </div>

            {/* Lead Status */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Check className="w-4 h-4" />
                Lead Status
              </label>
              <input
                name="lead_status"
                value={formData.lead_status}
                onChange={handleChange}
                placeholder="Enter lead status"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Callback Date */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4" />
                Callback Date
              </label>
              <input
                name="call_back_date"
                type="text"
                value={formData.call_back_date}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
                    setFormData((prev) => ({ ...prev, call_back_date: value }));
                  }
                }}
                placeholder="DD-MM-YYYY"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Comment */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MessageSquare className="w-4 h-4" />
                Comments/Description
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                placeholder="Enter comments or description"
                rows="4"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-gray-50 px-6 py-6 border-t border-gray-100">
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Lead...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}