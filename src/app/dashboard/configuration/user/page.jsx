'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function UsersListPage() {
  const [users, setUsers] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/v1/users/?skip=0&limit=100&active_only=false')
      setUsers(res.data || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleEditClick = (user) => {
    setEditingUser(user)
    setFormData({ ...user })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await axios.put(
        `http://127.0.0.1:8000/api/v1/users/${formData.employee_code}`,
        formData
      )
      toast.success(`User ${formData.employee_code} updated.`)
      setEditingUser(null)
      fetchUsers()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (employee_code) => {
    if (!confirm(`Are you sure you want to delete user ${employee_code}?`)) return
    try {
      await axios.delete(`http://127.0.0.1:8000/api/v1/users/${employee_code}`)
      toast.success(`User ${employee_code} deleted.`)
      fetchUsers()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete user.')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">All Users</h2>
      <div className="overflow-auto">
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">#</th>
              <th className="px-4 py-2 border">Employee Code</th>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Role</th>
              <th className="px-4 py-2 border">Phone</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Status</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => (
              <tr key={index} className="border-t">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2">{u.employee_code}</td>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{u.phone_number}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button onClick={() => handleEditClick(u)} className="bg-yellow-400 px-2 py-1 rounded text-sm">Edit</button>
                  <button onClick={() => handleDelete(u.employee_code)} className="bg-red-500 text-white px-2 py-1 rounded text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center px-4 py-6 text-gray-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Form Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <form onSubmit={handleUpdate} className="bg-white p-6 rounded shadow max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold">Edit User: {editingUser.employee_code}</h3>
            <input className="w-full border p-2" name="name" value={formData.name} onChange={handleInputChange} placeholder="Name" />
            <input className="w-full border p-2" name="phone_number" value={formData.phone_number} onChange={handleInputChange} placeholder="Phone" />
            <input className="w-full border p-2" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" />
            <input className="w-full border p-2" name="city" value={formData.city} onChange={handleInputChange} placeholder="City" />
            <input className="w-full border p-2" name="state" value={formData.state} onChange={handleInputChange} placeholder="State" />
            <div className="flex justify-between mt-4">
              <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded">
                {isSubmitting ? 'Updating...' : 'Update'}
              </button>
              <button type="button" onClick={() => setEditingUser(null)} className="text-gray-500 px-4 py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
