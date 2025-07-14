'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const PERMISSION_LIST = [
  'add_user', 'edit_user', 'delete_user',
  'add_lead', 'edit_lead', 'delete_lead',
  'view_users', 'view_lead', 'view_branch',
  'view_accounts', 'view_research', 'view_client',
  'view_payment', 'view_invoice', 'view_kyc',
  'approval', 'internal_mailing', 'chatting',
  'targets', 'reports', 'fetch_lead'
]

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserPermissions, setSelectedUserPermissions] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAllPermissions()
  }, [])

  const fetchAllPermissions = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/v1/permissions/?skip=0&limit=100')
      setPermissions(res.data)
    } catch (err) {
      toast.error('Failed to load permissions list')
    }
  }

  const loadUserPermissions = async (userId) => {
    try {
      setSelectedUser(userId)
      const res = await axios.get(`http://127.0.0.1:8000/api/v1/permissions/user/${userId}`)
      setSelectedUserPermissions(res.data)
    } catch (err) {
      toast.error(`Could not load user permissions for ${userId}`)
    }
  }

  const togglePermission = async (perm) => {
    try {
      const res = await axios.patch(`http://127.0.0.1:8000/api/v1/permissions/user/${selectedUser}/toggle/${perm}`)
      toast.success(res.data.message)
      loadUserPermissions(selectedUser)
    } catch (err) {
      toast.error(`Failed to toggle ${perm}`)
    }
  }

  const resetToDefault = async () => {
    try {
      const res = await axios.post(`http://127.0.0.1:8000/api/v1/permissions/user/${selectedUser}/reset-defaults`)
      toast.success(res.data.message)
      loadUserPermissions(selectedUser)
    } catch (err) {
      toast.error('Failed to reset permissions')
    }
  }

  const handleUpdate = async () => {
    try {
      await axios.put(`http://127.0.0.1:8000/api/v1/permissions/user/${selectedUser}`, selectedUserPermissions)
      toast.success('Permissions updated successfully')
      fetchAllPermissions()
    } catch (err) {
      toast.error('Update failed')
    }
  }

  const handleCheckboxChange = (perm) => {
    setSelectedUserPermissions(prev => ({
      ...prev,
      [perm]: !prev[perm]
    }))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Permission Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">All Users with Permissions</h2>
          <ul className="bg-white rounded shadow p-4 max-h-[500px] overflow-auto">
            {permissions.map((user) => (
              <li
                key={user.user_id}
                className={`py-2 px-4 border-b cursor-pointer ${selectedUser === user.user_id ? 'bg-blue-50' : ''}`}
                onClick={() => loadUserPermissions(user.user_id)}
              >
                <strong>{user.user_id}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {selectedUserPermissions && (
            <div className="bg-white p-6 rounded shadow">
              <h2 className="text-lg font-bold mb-4">Edit Permissions: {selectedUser}</h2>

              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-auto mb-4">
                {PERMISSION_LIST.map((perm) => (
                  <label key={perm} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedUserPermissions[perm] || false}
                      onChange={() => handleCheckboxChange(perm)}
                    />
                    <span>{perm}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={handleUpdate} className="bg-blue-600 text-white py-2 px-4 rounded">
                  Update Permissions
                </button>
                <button onClick={resetToDefault} className="bg-orange-500 text-white py-2 px-4 rounded">
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
