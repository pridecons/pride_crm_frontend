'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'
import { toast } from 'react-toastify'

export default function ServiceModal({ onClose }) {
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
  const [editingId, setEditingId] = useState(null)

  const fetchData = async () => {
    try {
      const [servicesRes, cyclesRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/v1/services'),
        axios.get('http://127.0.0.1:8000/api/v1/services/billing-cycles'),
      ])
      setServices(servicesRes.data || [])
      setBillingCycles(cyclesRes.data || [])
    } catch {
      toast.error('Error loading service data')
    }
  }

  useEffect(() => {
    fetchData()
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
    const endpoint = editingId
      ? `http://127.0.0.1:8000/api/v1/services/${editingId}`
      : `http://127.0.0.1:8000/api/v1/services/`

    const method = editingId ? axios.patch : axios.post

    try {
      const res = await method(endpoint, formData)
      toast.success(`${editingId ? 'Updated' : 'Created'}: ${res.data.name}`)
      setFormData({ name: '', description: '', price: '', discount_percent: '', billing_cycle: '', CALL: 0 })
      setEditingId(null)
      fetchData()
    } catch {
      toast.error('Error saving service')
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
    setEditingId(srv.id)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure to delete this service?')) return
    try {
      await axios.delete(`http://127.0.0.1:8000/api/v1/services/${id}`)
      toast.success('Deleted')
      fetchData()
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
      <div className="bg-white w-full max-w-3xl rounded shadow p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-black">
          <X />
        </button>

        <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Service' : 'Add Service'}</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mb-6">
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
          <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded col-span-2">
            {editingId ? 'Update' : 'Create'}
          </button>
        </form>

        <h3 className="text-lg font-semibold mb-2">All Services</h3>
        <ul className="space-y-3 max-h-[300px] overflow-auto">
          {services.map((srv) => (
            <li key={srv.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <div><strong>Name:</strong> {srv.name}</div>
                <div><strong>Billing:</strong> {srv.billing_cycle}</div>
                <div><strong>Price:</strong> ₹{srv.price} (Discount: {srv.discount_percent}% → ₹{srv.discounted_price})</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleEdit(srv)} className="text-blue-600 text-sm">Edit</button>
                <button onClick={() => handleDelete(srv.id)} className="text-red-600 text-sm">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
