'use client'

import { useEffect, useState } from 'react'
import { axiosInstance } from '@/api/Axios'
import { toast } from 'react-toastify'
import axios from 'axios'
import LoadingState from '@/components/LoadingState'

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [billingCycles, setBillingCycles] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    discount_percent: 0,
    billing_cycle: '',
    CALL: 0,
    service_type: '',
  })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const SERVICE_API = '/services/'
  const BILLING_CYCLE_API = '/services/billing-cycles'


  // ✅ Fetch Services
  const fetchServices = async () => {
    try {
      const res = await axiosInstance.get(SERVICE_API)
      setServices(res.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch services')
    }
  }

  // ✅ Fetch Billing Cycles
  const fetchBillingCycles = async () => {
    try {
      const res = await axiosInstance.get(BILLING_CYCLE_API)
      setBillingCycles(res.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch billing cycles')
    }
  }

  useEffect(() => {
    fetchServices()
    fetchBillingCycles()
  }, [])

  // ✅ Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === 'billing_cycle' && value !== 'CALL') {
        return { ...prev, [name]: value, CALL: 0 }
      }
      return {
        ...prev,
        [name]: name === 'CALL' ? parseInt(value) || 0 : value,
      }
    })
  }

  // ✅ Handle Create / Update
  const handleSubmit = async (e) => {
    e.preventDefault()
    const { name, description, price, billing_cycle, discount_percent } = formData

    if (!name || !description || !price || !billing_cycle) {
      toast.error('Please fill all required fields')
      return
    }

    if (discount_percent > 100) {
      toast.error('Discount cannot be more than 100%')
      return
    }

    try {
      setLoading(true)
      if (editId) {
        const res = await axiosInstance.patch(`${SERVICE_API}/${editId}`, formData)
        toast.success(`Service "${res.data.name}" updated!`)
      } else {
        const res = await axiosInstance.post(SERVICE_API, formData)
        toast.success(`Service "${res.data.name}" created!`)
      }

      resetForm()
      fetchServices()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save service')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Reset Form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      discount_percent: '',
      billing_cycle: '',
      CALL: 0,
      service_type: '',
    })
    setEditId(null)
    setIsModalOpen(false)
  }

  // ✅ Edit Handler
  const handleEdit = (srv) => {
    setFormData({
      name: srv.name,
      description: srv.description,
      price: parseFloat(srv.price),
      discount_percent: parseFloat(srv.discount_percent),
      billing_cycle: srv.billing_cycle,
      CALL: srv.CALL || 0,
      service_type: srv.service_type || '',
    })
    setEditId(srv.id)
    setIsModalOpen(true)
  }

  // ✅ Delete Handler
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    try {
      await axiosInstance.delete(`${SERVICE_API}/${id}`)
      toast.success('Service deleted')
      fetchServices()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete service')
    }
  }

  // ✅ Badge Color for Billing Cycle
  const getBadgeColor = (cycle) => {
    switch (cycle) {
      case 'CALL':
        return 'bg-red-100 text-red-700'
      case 'MONTHLY':
        return 'bg-blue-100 text-blue-700'
      case 'YEARLY':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-6">

        {/* ✅ Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text ">
              Services Management
            </h1>
            <p className="text-gray-600 text-lg">Manage and organize your service offerings</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-3 font-semibold"
          >
            + Create Service
          </button>
        </div>
        {loading ? (
          <LoadingState message="Loading services..." />
        ) : services.length === 0 ? (

          <div className="text-center py-20">
            <p className="text-xl text-gray-500 font-medium">No services available</p>
            <p className="text-gray-400 mt-2">Create your first service to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="group relative bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                {/* ✅ Card Header */}
                <div className="relative p-6 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white">
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold line-clamp-2">{srv.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getBadgeColor(srv.billing_cycle)}`}>
                        {srv.billing_cycle}
                      </span>
                      {srv.CALL > 0 && (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-xs rounded">
                          {srv.CALL} Calls
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ✅ Card Body */}
                <div className="p-4">
                  <p className="text-gray-600 mb-4 line-clamp-3">{srv.description}</p>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold text-gray-900">
                        ₹{srv.discounted_price || srv.price}
                      </span>
                      {srv.discount_percent > 0 && (
                        <span className="text-lg text-gray-500 line-through">₹{srv.price}</span>
                      )}
                    </div>
                    {srv.discount_percent > 0 && (
                      <p className="text-sm text-green-600 font-medium">
                        You save ₹{(srv.price - srv.discounted_price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* ✅ Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => handleEdit(srv)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(srv.id)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ✅ Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{editId ? 'Edit Service' : 'Create Service'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-white text-lg">✕</button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <input type="text" name="name" placeholder="Service Name" value={formData.name} onChange={handleChange} className="p-4 border rounded-xl" required />

                  {/* Price */}
                  <input type="number" name="price" placeholder="Price (₹)" value={formData.price} onChange={handleChange} className="p-4 border rounded-xl" required />

                  {/* Discount */}
                  <input type="number" name="discount_percent" placeholder="Discount (%)" value={formData.discount_percent} onChange={handleChange} className="p-4 border rounded-xl" />

                  {/* Billing Cycle */}
                  <select name="billing_cycle" value={formData.billing_cycle} onChange={handleChange} className="p-4 border rounded-xl" required>
                    <option value="">Select Billing Cycle</option>
                    {billingCycles.map((cycle) => (
                      <option key={cycle} value={cycle}>{cycle}</option>
                    ))}
                  </select>

                  {/* CALL Limit */}
                  {formData.billing_cycle === 'CALL' && (
                    <input type="number" name="CALL" placeholder="CALL Limit" value={formData.CALL} onChange={handleChange} className="p-4 border rounded-xl" required />
                  )}

                  {/* Service Type */}
                  <input type="text" name="service_type" placeholder="Service Type" value={formData.service_type} onChange={handleChange} className="p-4 border rounded-xl" />

                  {/* Description */}
                  <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="p-4 border rounded-xl md:col-span-2" rows="3" required />

                  {/* Buttons */}
                  <div className="flex gap-4 md:col-span-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl" disabled={loading}>
                      {loading ? 'Saving...' : editId ? 'Update Service' : 'Create Service'}
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
