'use client'

import { useEffect, useRef, useState } from 'react'
import { axiosInstance } from '@/api/Axios'
import LoadingState from '@/components/LoadingState'
import toast from 'react-hot-toast'
import { usePermissions } from '@/context/PermissionsContext'
import { PhoneCall, BadgePercent, Pencil, Trash2, Tag } from 'lucide-react'
import { ErrorHandling } from '@/helper/ErrorHandling'

export default function ServicesPage() {
  const { hasPermission } = usePermissions()

  /* ---------- hydration-safe flags ---------- */
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])
  const canCreate = isClient && hasPermission('service_create')
  const canEdit = isClient && hasPermission('service_edit')
  const canDelete = isClient && hasPermission('service_delete')

  /* ---------- state ---------- */
  const [services, setServices] = useState([])
  const [billingCycles] = useState(['CALL']) // fixed to CALL
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    discount_percent: 0,
    billing_cycle: 'CALL',
    CALL: 0,
    service_type: [],
    plan_type: '',
  })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [serviceTypeOptions, setServiceTypeOptions] = useState([])
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const allCheckboxRef = useRef(null)
  const [planTypeOptions, setPlanTypeOptions] = useState([])
  const [showPlanDropdown, setShowPlanDropdown] = useState(false)
  const [activePlanType, setActivePlanType] = useState('')
  const SERVICE_API = '/services'

  const fetchPlanTypeOptions = async () => {
    try {
      const res = await axiosInstance.get('/services/plan-types')
      const types = res.data || []
      setPlanTypeOptions(types)
      if (!activePlanType) setActivePlanType('All')
    } catch (error) {
      ErrorHandling({ error, defaultError: 'Failed to fetch plan types' })
    }
  }

  useEffect(() => {
    fetchServiceTypeOptions()
    fetchPlanTypeOptions()
    fetchServices()
  }, [])

  // filter services by active tab
  const filteredServices = services.filter((s) => {
    const matchesType = activePlanType === 'All' || s.plan_type === activePlanType
    const matchesBilling = s.billing_cycle === 'CALL'
    return matchesType && matchesBilling
  })

  const availablePlanTypes = planTypeOptions.filter((type) =>
    services.some((s) => s.plan_type === type && s.billing_cycle === 'CALL')
  )

  useEffect(() => {
    if (!activePlanType && availablePlanTypes.length > 0) {
      setActivePlanType('All')
    }
  }, [availablePlanTypes, activePlanType])

  /* ---------- helpers ---------- */
  const displayINR = (n) =>
    isClient
      ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n ?? 0))
      : String(Number(n ?? 0))

  /* ---------- effects ---------- */
  useEffect(() => {
    fetchServiceTypeOptions()
    fetchServices()
  }, [])

  useEffect(() => {
    if (!allCheckboxRef.current) return
    allCheckboxRef.current.indeterminate =
      formData.service_type.length > 0 && formData.service_type.length < serviceTypeOptions.length
  }, [formData.service_type, serviceTypeOptions])

  useEffect(() => {
    if (!showTypeDropdown) return
    const handleClick = (e) => {
      if (!e.target.closest('.relative.md\\:col-span-2')) {
        setShowTypeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showTypeDropdown])

  /* ---------- data ---------- */
  const fetchServiceTypeOptions = async () => {
    try {
      const res = await axiosInstance.get('/profile-role/recommendation-type')
      setServiceTypeOptions(res.data || [])
    } catch (error) {
      ErrorHandling({ error, defaultError: 'Failed to fetch service types' })
    }
  }

  const fetchServices = async () => {
    try {
      const res = await axiosInstance.get(SERVICE_API)
      setServices(res.data || [])
    } catch (err) {
      ErrorHandling({ error: err, defaultError: 'Failed to fetch services' })
    }
  }

  /* ---------- handlers ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'service_type') {
      setFormData((prev) => ({
        ...prev,
        service_type: value.split(',').map((s) => s.trim()).filter(Boolean),
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'CALL' ? (value === '' ? '' : parseInt(value)) : value,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { name, description, price, billing_cycle, discount_percent } = formData

    if (!name || !description || !price || !billing_cycle) {
      ErrorHandling({ defaultError: 'Please fill all required fields' })
      return
    }
    if (discount_percent > 100) {
      ErrorHandling({ defaultError: 'Discount cannot be more than 100%' })
      return
    }

    try {
      setLoading(true)
      const payload = { ...formData, billing_cycle: 'CALL' }
      if (editId) {
        const res = await axiosInstance.patch(`${SERVICE_API}/${editId}`, payload)
        toast.success(`Service "${res.data.name}" updated!`)
      } else {
        const res = await axiosInstance.post(SERVICE_API, payload)
        toast.success(`Service "${res.data.name}" created!`)
      }
      resetForm()
      fetchServices()
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        ErrorHandling({ error: err, defaultError: 'This service already exists' })
      } else {
        ErrorHandling({ error: err, defaultError: 'Failed to save service' })
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      discount_percent: '',
      billing_cycle: 'CALL',
      CALL: 0,
      service_type: [],
      plan_type: '',
    })
    setEditId(null)
    setIsModalOpen(false)
  }

  const handleEdit = (srv) => {
    setFormData({
      name: srv.name,
      description: srv.description,
      price: parseFloat(srv.price),
      discount_percent: parseFloat(srv.discount_percent),
      billing_cycle: 'CALL',
      CALL: srv.CALL || 0,
      service_type: Array.isArray(srv.service_type)
        ? srv.service_type
        : srv.service_type
        ? [srv.service_type]
        : [],
      plan_type: srv.plan_type || '',
    })
    setEditId(srv.id)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    try {
      await axiosInstance.delete(`${SERVICE_API}/${id}`)
      toast.success('Service deleted')
      fetchServices()
    } catch (err) {
      ErrorHandling({ error: err, defaultError: 'Failed to delete service' })
    }
  }

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-[var(--theme-background)] py-8">
      <div className="mx-2 px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h1 className="text-4xl font-bold text-[var(--theme-text)] mb-2">
              Plans Management
            </h1>
            <p className="text-lg text-[var(--theme-text-muted)]">
              Manage and organize your plan offerings
            </p>
          </div>

          {hasPermission('plans_create') && (
            <button
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-contrast)] px-4 py-3 rounded-xl shadow-sm transition-colors font-semibold"
            >
              + Create Plan
            </button>
          )}
        </div>

        {/* Plan Type Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActivePlanType('All')}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
              activePlanType === 'All'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)]'
                : 'bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)] hover:bg-[var(--theme-primary-softer)]'
            }`}
          >
            All Plans
          </button>

          {availablePlanTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActivePlanType(type)}
              className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                activePlanType === type
                  ? 'bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)]'
                  : 'bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)] hover:bg-[var(--theme-primary-softer)]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState message="Loading services..." />
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl font-medium text-[var(--theme-text-muted)]">
              No {activePlanType} plans available
            </p>
            <p className="mt-2 text-[var(--theme-text-muted)]">
              Create your first {activePlanType} plan to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredServices.map((srv) => {
              const hasDiscount =
                Number(srv.discount_percent) > 0 && srv.discounted_price != null
              const finalPrice =
                srv.discounted_price != null ? srv.discounted_price : srv.price
              const youSave = hasDiscount
                ? (Number(srv.price) - Number(srv.discounted_price)).toFixed(2)
                : null
              const types = Array.isArray(srv.service_type)
                ? srv.service_type
                : srv.service_type
                ? [srv.service_type]
                : []
              const visibleTypes = types.slice(0, 3)
              const extraCount = Math.max(0, types.length - visibleTypes.length)

              return (
                <div
                  key={srv.id}
                  className="group relative p-[1px] rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:shadow-md transition-all duration-300"
                >
                  <div className="relative h-full bg-[var(--theme-card-bg)] rounded-2xl overflow-hidden">
                    {/* Discount ribbon */}
                    {hasDiscount && (
                      <div className="absolute -right-10 top-4 z-10 rotate-45 bg-[var(--theme-success)] text-white text-xs font-semibold tracking-wide px-10 py-1 shadow-md">
                        <span className="inline-flex items-center gap-1">
                          <BadgePercent size={14} />
                          Save {Number(srv.discount_percent)}%
                        </span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="relative p-4 bg-[var(--theme-surface)] border-b border-[var(--theme-border)]">
                      <h3 className="text-[12px] font-semibold leading-snug text-[var(--theme-text-muted)]">
                        {srv.plan_type}
                      </h3>
                      <h3 className="text-lg font-semibold leading-snug text-[var(--theme-text)] pr-10">
                        {srv.name}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--theme-primary-softer)] text-[var(--theme-text)]">
                          CALL
                        </span>

                        {srv.CALL > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--theme-primary-soft)] text-[var(--theme-text)]">
                            <PhoneCall size={14} />
                            {srv.CALL} Calls
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 relative">
                      <div className="absolute right-2 top-2 flex items-center gap-1">
                        {hasPermission('edit_plan') && (
                          <>
                            <button
                              onClick={() => handleEdit(srv)}
                              className="p-1 rounded-full hover:bg-[var(--theme-primary-softer)] text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] focus:outline-none"
                              aria-label="Edit"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>

                            <button
                              onClick={() => handleDelete(srv.id)}
                              className="p-1 rounded-full hover:bg-[var(--theme-danger-soft)] text-[var(--theme-danger)] hover:opacity-90 focus:outline-none"
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[var(--theme-text-muted)] mb-4 pr-12 line-clamp-3">
                        {srv.description}
                      </p>

                      {/* Price block */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-[var(--theme-text)]">
                            ₹{displayINR(finalPrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-[var(--theme-text-muted)] line-through">
                              ₹{displayINR(srv.price)}
                            </span>
                          )}
                        </div>
                        {hasDiscount && (
                          <p className="text-sm font-medium mt-1 text-[var(--theme-success)]">
                            You save ₹{displayINR(youSave)}
                          </p>
                        )}
                      </div>

                      {/* Types chips */}
                      {types.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {visibleTypes.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]"
                            >
                              <Tag size={12} />
                              {t}
                            </span>
                          ))}
                          {extraCount > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]">
                              +{extraCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-[var(--theme-backdrop)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--theme-card-bg)] border border-[var(--theme-border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-[var(--theme-surface)] border-b border-[var(--theme-border)] p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-[var(--theme-text)]">
                    {editId ? 'Edit Plan' : 'Create Plan'}
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-[var(--theme-text-muted)] text-lg hover:text-[var(--theme-text)]"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 text-[var(--theme-text)]">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Service Name */}
                  <div>
                    <label className="block mb-2 font-medium text-[var(--theme-text)]">
                      Service Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Service Name"
                      value={formData.name}
                      onChange={handleChange}
                      className="p-4 rounded-xl w-full border border-[var(--theme-border)] bg-[var(--theme-input-background)] text-[var(--theme-text)]"
                      required
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block mb-2 font-medium text-[var(--theme-text)]">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      name="price"
                      placeholder="Price (₹)"
                      value={formData.price}
                      onChange={handleChange}
                      className="p-4 rounded-xl w-full border border-[var(--theme-border)] bg-[var(--theme-input-background)] text-[var(--theme-text)]"
                      required
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block mb-2 font-medium text-[var(--theme-text)]">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      name="discount_percent"
                      placeholder="Discount (%)"
                      value={formData.discount_percent}
                      onChange={handleChange}
                      className="p-4 rounded-xl w-full border border-[var(--theme-border)] bg-[var(--theme-input-background)] text-[var(--theme-text)]"
                    />
                  </div>

                  {/* Billing Cycle (locked to CALL) */}
                  <div>
                    <label className="block mb-2 font-medium text-[var(--theme-text)]">
                      Billing Cycle
                    </label>
                    <select
                      name="billing_cycle"
                      value="CALL"
                      onChange={handleChange}
                      className="p-4 rounded-xl w-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] appearance-none"
                    >
                      {billingCycles.map((bc) => (
                        <option key={bc} value={bc}>
                          {bc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CALL Limit */}
                  <div>
                    <label className="block mb-2 font-medium text-[var(--theme-text)]">
                      CALL Limit
                    </label>
                    <input
                      type="number"
                      name="CALL"
                      placeholder="CALL Limit"
                      value={formData.CALL}
                      onChange={handleChange}
                      className="p-4 rounded-xl w-full border border-[var(--theme-border)] bg-[var(--theme-input-background)] text-[var(--theme-text)]"
                      required
                    />
                  </div>

                  {/* Plan Type */}
                  <div className="relative md:col-span-2">
                    <label className="block mb-2 font-medium text-[var(--theme-text)]">
                      Plan Type <span className="text-[var(--theme-danger)]">*</span>
                    </label>
                    <button
                      type="button"
                      className="w-full text-left bg-[var(--theme-surface)] border border-[var(--theme-border)] p-4 rounded-xl focus:outline-none flex justify-between items-center text-[var(--theme-text)]"
                      onClick={() => setShowPlanDropdown((v) => !v)}
                    >
                      <span>{formData.plan_type ? formData.plan_type : 'Select Plan Type'}</span>
                      <svg
                        className={`w-4 h-4 ml-2 transition-transform ${
                          showPlanDropdown ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showPlanDropdown && (
                      <div className="absolute z-20 bg-[var(--theme-card-bg)] border border-[var(--theme-border)] rounded-xl mt-1 w-full max-h-64 overflow-y-auto shadow-lg">
                        {planTypeOptions.map((type) => (
                          <label
                            key={type}
                            className="flex items-center px-4 py-2 hover:bg-[var(--theme-primary-softer)] cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="plan_type"
                              checked={formData.plan_type === type}
                              onChange={() => setFormData((prev) => ({ ...prev, plan_type: type }))}
                              className="mr-2 accent-[var(--theme-primary)]"
                            />
                            <span className="text-[var(--theme-text)]">{type}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Service Type */}
                  <div className="relative md:col-span-2">
                    <label className="block mb-2 font-medium text-[var(--theme-text)]">
                      Service Type <span className="text-[var(--theme-danger)]">*</span>
                    </label>
                    <button
                      type="button"
                      className="w-full text-left bg-[var(--theme-surface)] border border-[var(--theme-border)] p-4 rounded-xl focus:outline-none flex justify-between items-center text-[var(--theme-text)]"
                      onClick={() => setShowTypeDropdown((v) => !v)}
                    >
                      <span>
                        {formData.service_type.length === 0
                          ? 'Select Service Type(s)'
                          : formData.service_type.length === serviceTypeOptions.length
                          ? 'All'
                          : formData.service_type.join(', ')}
                      </span>
                      <svg
                        className={`w-4 h-4 ml-2 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showTypeDropdown && (
                      <div className="absolute z-20 bg-[var(--theme-card-bg)] border border-[var(--theme-border)] rounded-xl mt-1 w-full max-h-64 overflow-y-auto shadow-lg">
                        <label className="flex items-center px-4 py-2 hover:bg-[var(--theme-primary-softer)] cursor-pointer border-b border-[var(--theme-border)]">
                          <input
                            ref={allCheckboxRef}
                            type="checkbox"
                            checked={formData.service_type.length === serviceTypeOptions.length}
                            onChange={() => {
                              if (formData.service_type.length === serviceTypeOptions.length) {
                                setFormData((prev) => ({ ...prev, service_type: [] }))
                              } else {
                                setFormData((prev) => ({ ...prev, service_type: [...serviceTypeOptions] }))
                              }
                            }}
                            className="mr-2 accent-[var(--theme-primary)]"
                          />
                          <span className="font-semibold text-[var(--theme-text)]">All</span>
                        </label>

                        {serviceTypeOptions.map((type) => (
                          <label
                            key={type}
                            className="flex items-center px-4 py-2 hover:bg-[var(--theme-primary-softer)] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.service_type.includes(type)}
                              onChange={() => {
                                setFormData((prev) => {
                                  const selected = prev.service_type.includes(type)
                                    ? prev.service_type.filter((t) => t !== type)
                                    : [...prev.service_type, type]
                                  return { ...prev, service_type: selected }
                                })
                              }}
                              className="mr-2 accent-[var(--theme-primary)]"
                            />
                            <span className="text-[var(--theme-text)]">{type}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block mb-2 font-medium text-[var(--theme-text)]">
                      Description
                    </label>
                    <textarea
                      name="description"
                      placeholder="Description"
                      value={formData.description}
                      onChange={handleChange}
                      className="p-4 rounded-xl w-full border border-[var(--theme-border)] bg-[var(--theme-input-background)] text-[var(--theme-text)]"
                      rows="3"
                      required
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-contrast)] px-6 py-3 rounded-xl"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : editId ? 'Update Plan' : 'Create Plan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
