'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Target, 
  ArrowLeft, 
  Save, 
  X, 
  AlertCircle,
  CheckCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building,
  Users,
  DollarSign,
  User,
  FileText,
  Briefcase,
  TrendingUp,
  Clock
} from 'lucide-react'
import { toast } from 'react-toastify'

import ProtectedRoute from '@/components/common/ProtectedRoute'
import LoadingSpinner, { ButtonLoader } from '@/components/common/LoadingSpinner'
import leadService from '@/services/leadService'
import userService from '@/services/userService'
import branchService from '@/services/branchService'
import { useAuth } from '@/context/AuthContext'

export default function AddLeadPage() {
  return (
    <ProtectedRoute 
      allowedRoles={['SUPERADMIN', 'BRANCH_MANAGER', 'SALES_MANAGER', 'TL', 'BA', 'SBA']}
      requiredPermissions={['add_lead']}
    >
      <AddLeadForm />
    </ProtectedRoute>
  )
}

function AddLeadForm() {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  // Form data state
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    phone_number: '',
    email: '',
    lead_source_id: '',
    
    // Contact Details
    address: '',
    city: '',
    state: '',
    pincode: '',
    
    // Professional Information
    occupation: '',
    company_name: '',
    designation: '',
    annual_income: '',
    
    // Investment Details
    service_interested: '',
    investment_amount: '',
    investment_duration: '',
    risk_tolerance: '',
    
    // Lead Management
    priority: 'medium',
    status: 'new',
    assigned_to: '',
    branch_id: '',
    
    // Additional Information
    comments: '',
    next_follow_up_date: '',
    preferred_contact_time: '',
    source_details: ''
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [currentStep, setCurrentStep] = useState(1)

  // Dropdown data
  const [leadSources, setLeadSources] = useState([])
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])

  // Form steps
  const steps = [
    { id: 1, name: 'Basic Info', icon: User },
    { id: 2, name: 'Contact & Address', icon: MapPin },
    { id: 3, name: 'Professional', icon: Briefcase },
    { id: 4, name: 'Investment', icon: DollarSign },
    { id: 5, name: 'Assignment', icon: Users }
  ]

  // Investment services
  const investmentServices = [
    'Mutual Funds',
    'Stock Investment',
    'SIP Planning',
    'Portfolio Management',
    'Insurance Planning',
    'Tax Planning',
    'Retirement Planning',
    'Real Estate Investment',
    'Fixed Deposits',
    'Bonds & Debentures',
    'Gold Investment',
    'Other'
  ]

  // Risk tolerance levels
  const riskToleranceLevels = [
    { value: 'low', label: 'Conservative (Low Risk)' },
    { value: 'medium', label: 'Moderate (Medium Risk)' },
    { value: 'high', label: 'Aggressive (High Risk)' }
  ]

  // Priority levels
  const priorityLevels = [
    { value: 'high', label: 'High Priority', color: 'red' },
    { value: 'medium', label: 'Medium Priority', color: 'yellow' },
    { value: 'low', label: 'Low Priority', color: 'green' }
  ]

  // Lead statuses
  const leadStatuses = [
    { value: 'new', label: 'New Lead' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'interested', label: 'Interested' },
    { value: 'follow_up', label: 'Follow Up Required' }
  ]

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setPageLoading(true)
      const [sourcesRes, branchesRes, usersRes] = await Promise.all([
        leadService.getLeadSources(true),
        branchService.getBranches({ active_only: true }),
        userService.getUsersByRole('', true) // Get all active users
      ])

      setLeadSources(sourcesRes.data || sourcesRes)
      setBranches(branchesRes.data || branchesRes)
      setUsers(usersRes.data || usersRes)

      // Set default values based on current user
      if (currentUser) {
        setFormData(prev => ({
          ...prev,
          branch_id: currentUser.branch_id || '',
          assigned_to: ['BA', 'SBA'].includes(currentUser.role) ? currentUser.employee_code : ''
        }))
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast.error('Failed to load form data')
    } finally {
      setPageLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  // Validation functions
  const validateBasicInfo = () => {
    const stepErrors = {}

    if (!formData.name.trim()) {
      stepErrors.name = 'Customer name is required'
    } else if (formData.name.length < 2) {
      stepErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.phone_number.trim()) {
      stepErrors.phone_number = 'Phone number is required'
    } else if (!/^\d{10}$/.test(formData.phone_number)) {
      stepErrors.phone_number = 'Phone number must be 10 digits'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      stepErrors.email = 'Please enter a valid email address'
    }

    if (!formData.lead_source_id) {
      stepErrors.lead_source_id = 'Lead source is required'
    }

    return stepErrors
  }

  const validateContactInfo = () => {
    const stepErrors = {}

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      stepErrors.pincode = 'Pincode must be 6 digits'
    }

    return stepErrors
  }

  const validateProfessionalInfo = () => {
    const stepErrors = {}

    if (formData.annual_income && isNaN(formData.annual_income)) {
      stepErrors.annual_income = 'Please enter a valid annual income'
    }

    return stepErrors
  }

  const validateInvestmentInfo = () => {
    const stepErrors = {}

    if (formData.investment_amount && isNaN(formData.investment_amount)) {
      stepErrors.investment_amount = 'Please enter a valid investment amount'
    }

    return stepErrors
  }

  const validateAssignmentInfo = () => {
    const stepErrors = {}

    if (!formData.branch_id) {
      stepErrors.branch_id = 'Branch selection is required'
    }

    if (formData.next_follow_up_date) {
      const followUpDate = new Date(formData.next_follow_up_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (followUpDate < today) {
        stepErrors.next_follow_up_date = 'Follow-up date cannot be in the past'
      }
    }

    return stepErrors
  }

  const validateCurrentStep = () => {
    let stepErrors = {}

    switch (currentStep) {
      case 1:
        stepErrors = validateBasicInfo()
        break
      case 2:
        stepErrors = validateContactInfo()
        break
      case 3:
        stepErrors = validateProfessionalInfo()
        break
      case 4:
        stepErrors = validateInvestmentInfo()
        break
      case 5:
        stepErrors = validateAssignmentInfo()
        break
      default:
        break
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate all steps
    const basicErrors = validateBasicInfo()
    const contactErrors = validateContactInfo()
    const professionalErrors = validateProfessionalInfo()
    const investmentErrors = validateInvestmentInfo()
    const assignmentErrors = validateAssignmentInfo()
    
    const allErrors = { 
      ...basicErrors, 
      ...contactErrors, 
      ...professionalErrors, 
      ...investmentErrors, 
      ...assignmentErrors 
    }
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      // Go to first step with errors
      if (Object.keys(basicErrors).length > 0) setCurrentStep(1)
      else if (Object.keys(contactErrors).length > 0) setCurrentStep(2)
      else if (Object.keys(professionalErrors).length > 0) setCurrentStep(3)
      else if (Object.keys(investmentErrors).length > 0) setCurrentStep(4)
      else if (Object.keys(assignmentErrors).length > 0) setCurrentStep(5)
      return
    }

    try {
      setLoading(true)

      // Prepare data for API
      const leadData = {
        ...formData,
        annual_income: formData.annual_income ? parseFloat(formData.annual_income) : null,
        investment_amount: formData.investment_amount || null,
        lead_source_id: parseInt(formData.lead_source_id),
        branch_id: formData.branch_id || null,
        assigned_to: formData.assigned_to || null
      }

      await leadService.createLead(leadData)
      toast.success('Lead created successfully!')
      router.push('/dashboard/leads/manage')
    } catch (error) {
      console.error('Error creating lead:', error)
      
      // Handle specific API errors
      if (error.response?.status === 422) {
        const apiErrors = {}
        error.response.data.detail?.forEach(err => {
          const field = err.loc[err.loc.length - 1]
          apiErrors[field] = err.msg
        })
        setErrors(apiErrors)
      } else if (error.response?.status === 409) {
        toast.error('Lead with this phone number already exists')
      } else {
        toast.error('Failed to create lead. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Filter users for assignment dropdown
  const getAssignableUsers = () => {
    return users.filter(user => {
      // Show only sales team members
      if (!['SALES_MANAGER', 'TL', 'BA', 'SBA'].includes(user.role)) return false
      
      // Branch managers can assign to users in their branch
      if (currentUser.role === 'BRANCH_MANAGER') {
        return user.branch_id === currentUser.branch_id
      }
      
      // Sales managers can assign to their team
      if (currentUser.role === 'SALES_MANAGER') {
        return user.sales_manager_id === currentUser.employee_code || 
               user.employee_code === currentUser.employee_code
      }
      
      // Team leads can assign to their team members
      if (currentUser.role === 'TL') {
        return user.tl_id === currentUser.employee_code || 
               user.employee_code === currentUser.employee_code
      }
      
      // For SUPERADMIN, show all sales team members
      if (currentUser.role === 'SUPERADMIN') return true
      
      // BA/SBA can only assign to themselves
      return user.employee_code === currentUser.employee_code
    })
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading form..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Target className="mr-3 h-6 w-6 text-blue-600" />
                Add New Lead
              </h1>
              <p className="text-gray-600">Create a new sales lead with comprehensive details</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-300'
                }`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <div className={`ml-2 mr-6 text-sm font-medium whitespace-nowrap ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mr-6 flex-shrink-0 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="mr-2 h-5 w-5 text-blue-600" />
                      Basic Information
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Essential lead details and contact information</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter customer full name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.phone_number ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Enter 10-digit phone number"
                          maxLength="10"
                        />
                      </div>
                      {errors.phone_number && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.phone_number}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.email ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Enter email address"
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Lead Source */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lead Source *
                      </label>
                      <select
                        name="lead_source_id"
                        value={formData.lead_source_id}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.lead_source_id ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Lead Source</option>
                        {leadSources.map(source => (
                          <option key={source.id} value={source.id}>{source.name}</option>
                        ))}
                      </select>
                      {errors.lead_source_id && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.lead_source_id}
                        </p>
                      )}
                    </div>

                    {/* Source Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Source Details
                      </label>
                      <input
                        type="text"
                        name="source_details"
                        value={formData.source_details}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Additional source information"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contact & Address */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <MapPin className="mr-2 h-5 w-5 text-blue-600" />
                      Contact & Address Information
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Address and contact preferences</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          rows="2"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter full address"
                        />
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter city"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter state"
                      />
                    </div>

                    {/* Pincode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.pincode ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter 6-digit pincode"
                        maxLength="6"
                      />
                      {errors.pincode && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.pincode}
                        </p>
                      )}
                    </div>

                    {/* Preferred Contact Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Contact Time
                      </label>
                      <select
                        name="preferred_contact_time"
                        value={formData.preferred_contact_time}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Preferred Time</option>
                        <option value="morning">Morning (9 AM - 12 PM)</option>
                        <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                        <option value="evening">Evening (5 PM - 8 PM)</option>
                        <option value="anytime">Anytime</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Professional Information */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Briefcase className="mr-2 h-5 w-5 text-blue-600" />
                      Professional Information
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Employment and income details</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Occupation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Occupation
                      </label>
                      <input
                        type="text"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter occupation"
                      />
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          name="company_name"
                          value={formData.company_name}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter company name"
                        />
                      </div>
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter job designation"
                      />
                    </div>

                    {/* Annual Income */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Annual Income (₹)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          name="annual_income"
                          value={formData.annual_income}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.annual_income ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Enter annual income"
                          min="0"
                        />
                      </div>
                      {errors.annual_income && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.annual_income}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Investment Information */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <DollarSign className="mr-2 h-5 w-5 text-blue-600" />
                      Investment Information
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Investment preferences and financial goals</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Service Interested */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Interested In
                      </label>
                      <select
                        name="service_interested"
                        value={formData.service_interested}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Service</option>
                        {investmentServices.map(service => (
                          <option key={service} value={service}>{service}</option>
                        ))}
                      </select>
                    </div>

                    {/* Investment Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Investment Amount (₹)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          name="investment_amount"
                          value={formData.investment_amount}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.investment_amount ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Enter investment amount"
                        />
                      </div>
                      {errors.investment_amount && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.investment_amount}
                        </p>
                      )}
                    </div>

                    {/* Investment Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Investment Duration
                      </label>
                      <select
                        name="investment_duration"
                        value={formData.investment_duration}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Duration</option>
                        <option value="short_term">Short Term (Less than 1 year)</option>
                        <option value="medium_term">Medium Term (1-3 years)</option>
                        <option value="long_term">Long Term (3-5 years)</option>
                        <option value="very_long_term">Very Long Term (5+ years)</option>
                      </select>
                    </div>

                    {/* Risk Tolerance */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Risk Tolerance
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {riskToleranceLevels.map(level => (
                          <label key={level.value} className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="risk_tolerance"
                              value={level.value}
                              checked={formData.risk_tolerance === level.value}
                              onChange={handleInputChange}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-medium text-sm">{level.label}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Assignment & Management */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Users className="mr-2 h-5 w-5 text-blue-600" />
                      Assignment & Management
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Lead assignment and follow-up settings</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Branch */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branch *
                      </label>
                      <select
                        name="branch_id"
                        value={formData.branch_id}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.branch_id ? 'border-red-300' : 'border-gray-300'
                        }`}
                        disabled={currentUser?.role === 'BRANCH_MANAGER'}
                      >
                        <option value="">Select Branch</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                        ))}
                      </select>
                      {errors.branch_id && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.branch_id}
                        </p>
                      )}
                    </div>

                    {/* Assigned To */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assign To
                      </label>
                      <select
                        name="assigned_to"
                        value={formData.assigned_to}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Assign Later</option>
                        {getAssignableUsers().map(user => (
                          <option key={user.employee_code} value={user.employee_code}>
                            {user.name} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority Level
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {priorityLevels.map(priority => (
                          <label key={priority.value} className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer ${
                            formData.priority === priority.value
                              ? `bg-${priority.color}-50 border-${priority.color}-300`
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}>
                            <input
                              type="radio"
                              name="priority"
                              value={priority.value}
                              checked={formData.priority === priority.value}
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <span className={`text-sm font-medium ${
                              formData.priority === priority.value
                                ? `text-${priority.color}-700`
                                : 'text-gray-700'
                            }`}>
                              {priority.label.split(' ')[0]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {leadStatuses.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Next Follow-up Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Next Follow-up Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          name="next_follow_up_date"
                          value={formData.next_follow_up_date}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.next_follow_up_date ? 'border-red-300' : 'border-gray-300'
                          }`}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      {errors.next_follow_up_date && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.next_follow_up_date}
                        </p>
                      )}
                    </div>

                    {/* Comments */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comments / Notes
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <textarea
                          name="comments"
                          value={formData.comments}
                          onChange={handleInputChange}
                          rows="4"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Add any additional notes, requirements, or observations about this lead..."
                        />
                      </div>
                    </div>

                    {/* Summary Box */}
                    <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Lead Summary
                      </h4>
                      <div className="text-sm text-blue-800 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <p><strong>Customer:</strong> {formData.name || 'Not specified'}</p>
                        <p><strong>Phone:</strong> {formData.phone_number || 'Not specified'}</p>
                        <p><strong>Service:</strong> {formData.service_interested || 'Not specified'}</p>
                        <p><strong>Investment:</strong> {formData.investment_amount ? `₹${formData.investment_amount}` : 'Not specified'}</p>
                        <p><strong>Priority:</strong> {priorityLevels.find(p => p.value === formData.priority)?.label || 'Medium'}</p>
                        <p><strong>Branch:</strong> {branches.find(b => b.id === formData.branch_id)?.branch_name || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Previous
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>

                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                  >
                    Next
                    <ArrowLeft className="ml-2 h-4 w-4 transform rotate-180" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <ButtonLoader size="sm" color="white" />
                        <span className="ml-2">Creating Lead...</span>
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Lead
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Tips for Creating Quality Leads</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure phone number and name are accurate - these are required fields</li>
                  <li>Select the appropriate lead source to track marketing effectiveness</li>
                  <li>Set realistic investment amounts and time frames based on customer discussions</li>
                  <li>Assign leads to appropriate team members based on expertise and workload</li>
                  <li>Add detailed comments to help the assigned person understand customer needs</li>
                  <li>Set follow-up dates to ensure timely customer contact</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}