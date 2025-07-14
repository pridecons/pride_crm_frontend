'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

export default function BranchListPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBranchDetails, setSelectedBranchDetails] = useState(null)
  const router = useRouter()

  const fetchBranches = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/v1/branches/?skip=0&limit=100&active_only=false')
      setBranches(res.data || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBranchDetails = async (branchId) => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/v1/branches/${branchId}/details`)
      setSelectedBranchDetails(res.data)
    } catch (error) {
      console.error('Error fetching branch details:', error)
    }
  }

  const handleDelete = async (branchId) => {
    if (!confirm('Are you sure you want to delete this branch?')) return
    try {
      await axios.delete(`http://127.0.0.1:8000/api/v1/branches/${branchId}?force=false`)
      toast.success('Branch deleted successfully')
      fetchBranches()
    } catch (error) {
      toast.error('Failed to delete branch')
      console.error('Delete error:', error)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Branch List</h1>

      {loading ? (
        <p>Loading...</p>
      ) : branches.length === 0 ? (
        <p>No branches found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Authorized Person</th>
                <th className="px-4 py-2 border">Manager</th>
                <th className="px-4 py-2 border">Agreement</th>
                <th className="px-4 py-2 border">Created</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="text-center">
                  <td className="px-4 py-2 border">{branch.id}</td>
                  <td className="px-4 py-2 border">{branch.name}</td>
                  <td className="px-4 py-2 border">{branch.authorized_person}</td>
                  <td className="px-4 py-2 border">{branch.manager_id ?? '—'}</td>
                  <td className="px-4 py-2 border">
                    {branch.agreement_url ? (
                      <a
                        href={`http://127.0.0.1:8000${branch.agreement_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        View PDF
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    {new Date(branch.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 border space-x-2">
                    <button
                      onClick={() => fetchBranchDetails(branch.id)}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/branches/${branch.id}/edit`)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedBranchDetails && (
            <div className="mt-8 border-t pt-4">
              <h2 className="text-xl font-semibold mb-2">Branch Details</h2>
              <p><strong>Manager:</strong> {selectedBranchDetails.manager?.name ?? '—'} ({selectedBranchDetails.manager?.employee_code})</p>
              <p><strong>Email:</strong> {selectedBranchDetails.manager?.email}</p>
              <p><strong>Phone:</strong> {selectedBranchDetails.manager?.phone_number}</p>

              <h3 className="mt-4 font-medium">Users in this Branch:</h3>
              <ul className="list-disc list-inside">
                {selectedBranchDetails.users.map((user) => (
                  <li key={user.employee_code}>
                    {user.name} ({user.role}) — {user.email} [{user.is_active ? 'Active' : 'Inactive'}]
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
