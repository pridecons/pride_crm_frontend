'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  ArrowLeft, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building,
  Users,
  Shield
} from 'lucide-react'
import { toast } from 'react-toastify'

import ProtectedRoute from '@/components/common/ProtectedRoute'
import LoadingSpinner, { ButtonLoader } from '@/components/common/LoadingSpinner'
import userService from '@/services/userService'
import branchService from '@/services/branchService'
import { useAuth } from '@/context/AuthContext'

export default function AddUserPage() {
  return (
    <ProtectedRoute 
      allowedRoles={['SUPERADMIN', 'HR', 'BRANCH_MANAGER']}
      requiredPermissions={['add_user']}
    >
      <AddUserForm />
    </ProtectedRoute>
  )
}

function AddUserForm() {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  // Form data state
  const [formData, setFormData] = useState({
    // Personal Information
    name: '',
    father_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    date_of_joining: '',
    
    // Professional Information
    role: '',
    experience: '',
    branch_id: '',
    manager_id: '',
    sales_manager_id: '',
    tl_id: '',
    
    // Address Information
    address: '',
    city: '',
    state: '',
    pincode: '',
    
    // Identity Information
    pan: '',
    aadhaar: '',
    
    // Account Information
    password: '',
    confirmPassword: '',
    is_active: true,
    comment: ''
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Dropdown data
  const [roles, setRoles] = useState([])
  const [branches, setBranches] = useState([])
  const [managers, setManagers] = useState([])
  const [salesManagers, setSalesManagers] = useState([])
  const [teamLeads, setTeamLeads] = useState([])

  // Form steps
  const steps = [
    { id: 1, name: 'Personal Info', icon: User },
    { id: 2, name: 'Professional', icon: Building },
    { id: 3, name: 'Account & Security', icon: Shield }
  ]

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setPageLoading(true)
      const [rolesRes, branchesRes] = await Promise.all([
        userService.getUserRoles(),
        branchService.getBranches({ active_only: true })
      ])

      setRoles(rolesRes.roles || rolesRes)
      setBranches(branchesRes.data || branchesRes)

      // Set default branch for non-admin users
      if (currentUser?.role === 'BRANCH_MANAGER' && currentUser.branch_id) {
        setFormData(prev => ({ ...prev, branch_id: currentUser.branch_id }))
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast.error('Failed to load form data')
    } finally {
      setPageLoading(false)
    }
  }, [currentUser])

  // Fetch managers based on role and branch
  const fetchManagers = useCallback(async (role, branchId = '') => {
    try {
      const response = await userService.getManagers(role, branchId)
      return response.data || response
    } catch (error) {
      console.error(`Error fetching ${role} managers:`, error)
      return []
    }
  }, [])

  // Update managers when role or branch changes
  useEffect(() => {
    const updateManagers = async () => {
      if (!formData.role || !formData.branch_id) return

      try {
        // Get managers based on role hierarchy
        if (['BA', 'SBA'].includes(formData.role)) {
          const [salesManagersRes, teamLeadsRes] = await Promise.all([
            fetchManagers('SALES_MANAGER', formData.branch_id),
            fetchManagers('TL', formData.branch_id)
          ])
          setSalesManagers(salesManagersRes)
          setTeamLeads(teamLeadsRes)
        } else if (formData.role === 'TL') {
          const salesManagersRes = await fetchManagers('SALES_MANAGER', formData.branch_id)
          setSalesManagers(salesManagersRes)
          setTeamLeads([])
        } else {
          setSalesManagers([])
          setTeamLeads([])
        }

        // Get general managers for manager_id field
        const managersRes = await fetchManagers('', formData.branch_id)
        setManagers(managersRes)
      } catch (error) {
        console.error('Error updating managers:', error)
      }
    }

    updateManagers()
  }, [formData.role, formData.branch_id, fetchManagers])

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
  const validatePersonalInfo = () => {
    const stepErrors = {}

    if (!formData.name.trim()) {
      stepErrors.name = 'Full name is required'
    } else if (formData.name.length < 2) {
      stepErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      stepErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      stepErrors.email = 'Please enter a valid email address'
    }

    if (!formData.phone_number.trim()) {
      stepErrors.phone_number = 'Phone number is required'
    } else if (!/^\d{10}$/.test(formData.phone_number)) {
      stepErrors.phone_number = 'Phone number must be 10 digits'
    }

    if (!formData.date_of_birth) {
      stepErrors.date_of_birth = 'Date of birth is required'
    }

    if (!formData.date_of_joining) {
      stepErrors.date_of_joining = 'Date of joining is required'
    }

    if (!formData.pan.trim()) {
      stepErrors.pan = 'PAN is required'
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.toUpperCase())) {
      stepErrors.pan = 'Please enter a valid PAN number'
    }

    if (!formData.aadhaar.trim()) {
      stepErrors.aadhaar = 'Aadhaar is required'
    } else if (!/^\d{12}$/.test(formData.aadhaar)) {
      stepErrors.aadhaar = 'Aadhaar must be 12 digits'
    }

    return stepErrors
  }

  const validateProfessionalInfo = () => {
    const stepErrors = {}

    if (!formData.role) {
      stepErrors.role = 'Role is required'
    }

    if (!formData.branch_id) {
      stepErrors.branch_id = 'Branch is required'
    }

    if (!formData.experience) {
      stepErrors.experience = 'Experience is required'
    } else if (isNaN(formData.experience) || formData.experience < 0) {
      stepErrors.experience = 'Please enter valid experience in years'
    }

    // Role-specific validations
    if (['BA', 'SBA'].includes(formData.role)) {
      if (!formData.sales_manager_id) {
        stepErrors.sales_manager_id = 'Sales Manager is required for this role'
      }
      if (!formData.tl_id) {
        stepErrors.tl_id = 'Team Lead is required for this role'
      }
    }

    if (formData.role === 'TL' && !formData.sales_manager_id) {
      stepErrors.sales_manager_id = 'Sales Manager is required for Team Lead role'
    }

    return stepErrors
  }

  const validateAccountInfo = () => {
    const stepErrors = {}

    if (!formData.password) {
      stepErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      stepErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      stepErrors.password = 'Password must contain uppercase, lowercase, and number'
    }

    if (!formData.confirmPassword) {
      stepErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      stepErrors.confirmPassword = 'Passwords do not match'
    }

    return stepErrors
  }

  const validateCurrentStep = () => {
    let stepErrors = {}

    switch (currentStep) {
      case 1:
        stepErrors = validatePersonalInfo()
        break
      case 2:
        stepErrors = validateProfessionalInfo()
        break
      case 3:
        stepErrors = validateAccountInfo()
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
    const personalErrors = validatePersonalInfo()
    const professionalErrors = validateProfessionalInfo()
    const accountErrors = validateAccountInfo()
    
    const allErrors = { ...personalErrors, ...professionalErrors, ...accountErrors }
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      // Go to first step with errors
      if (Object.keys(personalErrors).length > 0) setCurrentStep(1)
      else if (Object.keys(professionalErrors).length > 0) setCurrentStep(2)
      else if (Object.keys(accountErrors).length > 0) setCurrentStep(3)
      return
    }

    try {
      setLoading(true)

      // Prepare data for API
      const userData = {
        ...formData,
        pan: formData.pan.toUpperCase(),
        experience: parseFloat(formData.experience) || 0,
        branch_id: formData.branch_id || undefined,
        manager_id: formData.manager_id || undefined,
        sales_manager_id: formData.sales_manager_id || undefined,
        tl_id: formData.tl_id || undefined
      }

      // Remove confirmPassword before sending
      delete userData.confirmPassword

      await userService.createUser(userData)
      toast.success('User created successfully!')
      router.push('/dashboard/users')
    } catch (error) {
      console.error('Error creating user:', error)
      
      // Handle specific API errors
      if (error.response?.status === 422) {
        const apiErrors = {}
        error.response.data.detail?.forEach(err => {
          const field = err.loc[err.loc.length - 1]
          apiErrors[field] = err.msg
        })
        setErrors(apiErrors)
      } else if (error.response?.status === 409) {
        toast.error('User with this email or phone number already exists')
      } else {
        toast.error('Failed to create user. Please try again.')
      }
    } finally {
      setLoading(false)
    }
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
                <User className="mr-3 h-6 w-6 text-blue-600" />
                Add New User
              </h1>
              <p className="text-gray-600">Create a new user account with role and permissions</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-300'
                }`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <div className={`ml-2 mr-8 text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mr-8 ${
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
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="mr-2 h-5 w-5 text-blue-600" />
                      Personal Information
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Basic personal details and identity information</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter full name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Father's Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        name="father_name"
                        value={formData.father_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter father's name"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
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

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.date_of_birth ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.date_of_birth && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.date_of_birth}
                        </p>
                      )}
                    </div>

                    {/* Date of Joining */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Joining *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          name="date_of_joining"
                          value={formData.date_of_joining}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.date_of_joining ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.date_of_joining && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.date_of_joining}
                        </p>
                      )}
                    </div>

                    {/* PAN */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PAN Number *
                      </label>
                      <input
                        type="text"
                        name="pan"
                        value={formData.pan}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                          errors.pan ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="ABCDE1234F"
                        maxLength="10"
                      />
                      {errors.pan && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.pan}
                        </p>
                      )}
                    </div>

                    {/* Aadhaar */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aadhaar Number *
                      </label>
                      <input
                        type="text"
                        name="aadhaar"
                        value={formData.aadhaar}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.aadhaar ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter 12-digit Aadhaar number"
                        maxLength="12"
                      />
                      {errors.aadhaar && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.aadhaar}
                        </p>
                      )}
                    </div>

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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter 6-digit pincode"
                        maxLength="6"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Professional Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Building className="mr-2 h-5 w-5 text-blue-600" />
                      Professional Information
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Role, branch, and reporting structure</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Role */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role *
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.role ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Role</option>
                        {roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      {errors.role && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.role}
                        </p>
                      )}
                    </div>

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

                    {/* Experience */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Experience (Years) *
                      </label>
                      <input
                        type="number"
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.experience ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter years of experience"
                        min="0"
                        step="0.5"
                      />
                      {errors.experience && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.experience}
                        </p>
                      )}
                    </div>

                    {/* Manager */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manager
                      </label>
                      <select
                        name="manager_id"
                        value={formData.manager_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Manager</option>
                        {managers.map(manager => (
                          <option key={manager.employee_code} value={manager.employee_code}>
                            {manager.name} ({manager.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sales Manager - Show only for TL, BA, SBA */}
                    {['TL', 'BA', 'SBA'].includes(formData.role) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sales Manager {['BA', 'SBA', 'TL'].includes(formData.role) ? '*' : ''}
                        </label>
                        <select
                          name="sales_manager_id"
                          value={formData.sales_manager_id}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.sales_manager_id ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Sales Manager</option>
                          {salesManagers.map(manager => (
                            <option key={manager.employee_code} value={manager.employee_code}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                        {errors.sales_manager_id && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.sales_manager_id}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Team Lead - Show only for BA, SBA */}
                    {['BA', 'SBA'].includes(formData.role) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Team Lead *
                        </label>
                        <select
                          name="tl_id"
                          value={formData.tl_id}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.tl_id ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Team Lead</option>
                          {teamLeads.map(tl => (
                            <option key={tl.employee_code} value={tl.employee_code}>
                              {tl.name}
                            </option>
                          ))}
                        </select>
                        {errors.tl_id && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.tl_id}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Comments */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comments
                      </label>
                      <textarea
                        name="comment"
                        value={formData.comment}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Additional comments or notes about the user"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Account & Security */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Shield className="mr-2 h-5 w-5 text-blue-600" />
                      Account & Security
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Set up login credentials and account settings</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.password ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Enter secure password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.password}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        Password must be at least 8 characters with uppercase, lowercase, and number
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Confirm password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>

                    {/* Account Status */}
                    <div className="md:col-span-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Account is active (user can login immediately)
                        </label>
                      </div>
                    </div>

                    {/* Summary Box */}
                    <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Account Summary
                      </h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p><strong>Name:</strong> {formData.name || 'Not specified'}</p>
                        <p><strong>Email:</strong> {formData.email || 'Not specified'}</p>
                        <p><strong>Role:</strong> {formData.role || 'Not specified'}</p>
                        <p><strong>Branch:</strong> {
                          branches.find(b => b.id === formData.branch_id)?.branch_name || 'Not specified'
                        }</p>
                        <p><strong>Status:</strong> {formData.is_active ? 'Active' : 'Inactive'}</p>
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
                        <span className="ml-2">Creating User...</span>
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create User
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}