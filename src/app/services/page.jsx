'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const API_BASE = 'http://127.0.0.1:8000/api/v1/services'

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [billingCycles, setBillingCycles] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount_percent: '',
    billing_cycle: '',
    CALL: 0,
  })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchServices = async () => {
    try {
      const res = await axios.get(API_BASE)
      setServices(res.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch services')
    }
  }

  const fetchBillingCycles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/billing-cycles`)
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'CALL' ? parseInt(value) || 0 : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { name, description, price, discount_percent, billing_cycle, CALL } = formData

    if (!name || !description || !price || !billing_cycle) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      if (editId) {
        const res = await axios.patch(`${API_BASE}/${editId}`, formData)
        toast.success(`Service "${res.data.name}" updated!`)
      } else {
        const res = await axios.post(API_BASE, formData)
        toast.success(`Service "${res.data.name}" created!`)
      }
      setFormData({
        name: '',
        description: '',
        price: '',
        discount_percent: '',
        billing_cycle: '',
        CALL: 0,
      })
      setEditId(null)
      fetchServices()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save service')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (srv) => {
    setFormData({
      name: srv.name,
      description: srv.description,
      price: parseFloat(srv.price),
      discount_percent: parseFloat(srv.discount_percent),
      billing_cycle: srv.billing_cycle,
      CALL: srv.CALL || 0,
    })
    setEditId(srv.id)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    try {
      await axios.delete(`${API_BASE}/${id}`)
      toast.success('Service deleted')
      fetchServices()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete service')
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? 'Edit Service' : 'Create Service'}
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="p-2 border rounded col-span-2" required />
        <input type="text" name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="p-2 border rounded col-span-2" required />
        <input type="number" name="price" placeholder="Price" value={formData.price} onChange={handleChange} className="p-2 border rounded" required />
        <input type="number" name="discount_percent" placeholder="Discount (%)" value={formData.discount_percent} onChange={handleChange} className="p-2 border rounded" />
        <select name="billing_cycle" value={formData.billing_cycle} onChange={handleChange} className="p-2 border rounded col-span-2" required>
          <option value="">Select Billing Cycle</option>
          {billingCycles.map((cycle) => (
            <option key={cycle} value={cycle}>{cycle}</option>
          ))}
        </select>
        <input type="number" name="CALL" placeholder="CALL" value={formData.CALL} onChange={handleChange} className="p-2 border rounded" />
        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded col-span-2" disabled={loading}>
          {loading ? 'Saving...' : editId ? 'Update' : 'Create'}
        </button>
      </form>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Existing Services</h2>
        <ul className="space-y-3">
          {services.map((srv) => (
            <li key={srv.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <div><strong>Name:</strong> {srv.name}</div>
                <div><strong>Description:</strong> {srv.description}</div>
                <div><strong>Billing:</strong> {srv.billing_cycle}</div>
                <div><strong>Price:</strong> ₹{srv.price} (Discount: {srv.discount_percent}% → ₹{srv.discounted_price})</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleEdit(srv)} className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(srv.id)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
