'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'

export default function BranchDashboardPage() {
  const { id } = useParams()
  const [branchData, setBranchData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBranchDetails = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/api/v1/branches/${id}/details`)
        setBranchData(res.data)
      } catch (error) {
        console.error('Failed to load branch details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchBranchDetails()
  }, [id])

  if (loading) return <p className="p-6">Loading branch dashboard...</p>
  if (!branchData) return <p className="p-6 text-red-600">Branch not found.</p>

  const { branch, manager, users } = branchData

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Branch: {branch.name}</h1>

      <div className="bg-white shadow p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">Branch Details</h2>
        <ul className="space-y-1 text-sm">
          <li><strong>Address:</strong> {branch.address}</li>
          <li><strong>Authorized Person:</strong> {branch.authorized_person}</li>
          <li><strong>PAN:</strong> {branch.pan}</li>
          <li><strong>Aadhaar:</strong> {branch.aadhaar}</li>
          <li><strong>Agreement:</strong> 
            <a href={`http://127.0.0.1:8000${branch.agreement_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">
              View PDF
            </a>
          </li>
          <li><strong>Active:</strong> {branch.active ? 'Yes' : 'No'}</li>
          <li><strong>Created At:</strong> {new Date(branch.created_at).toLocaleString()}</li>
        </ul>
      </div>

      <div className="bg-white shadow p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">Branch Manager</h2>
        {manager ? (
          <ul className="text-sm">
            <li><strong>Name:</strong> {manager.name}</li>
            <li><strong>Email:</strong> {manager.email}</li>
            <li><strong>Phone:</strong> {manager.phone_number}</li>
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No manager assigned.</p>
        )}
      </div>

      <div className="bg-white shadow p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Users in this Branch</h2>
        {users.length === 0 ? (
          <p className="text-sm text-gray-600">No users assigned.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Code</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Role</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.employee_code} className="text-center">
                  <td className="border p-2">{user.employee_code}</td>
                  <td className="border p-2">{user.name}</td>
                  <td className="border p-2">{user.role}</td>
                  <td className="border p-2">{user.email}</td>
                  <td className="border p-2">{user.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
