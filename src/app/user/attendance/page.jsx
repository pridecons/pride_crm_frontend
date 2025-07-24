'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Users,
  CheckCircle,
  XCircle,
  Sun,
  Plane
} from 'lucide-react'

export default function AttendancePage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://147.93.30.144:8000/api/v1'


  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [attendance, setAttendance] = useState({})
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
console.log('data', employees)
  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [employees, searchTerm, selectedRole, selectedBranch])

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/users/?skip=0&limit=100&active_only=true`)
       (res.data.data || [])
    } catch (error) {
      console.error(error)
      toast.error('Error fetching employees')
    }
  }

  const applyFilters = () => {
    let data = employees
    if (searchTerm) {
      data = data.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }
    if (selectedRole) {
      data = data.filter(emp => emp.role === selectedRole)
    }
    if (selectedBranch) {
      data = data.filter(emp => String(emp.branch_id) === selectedBranch)
    }
    setFilteredEmployees(data)
    setCurrentPage(1)
  }

  const handleAttendanceChange = (empCode, value) => {
    setAttendance(prev => ({ ...prev, [empCode]: value }))
  }

  const handleBulkMark = (status) => {
    const updated = {}
    filteredEmployees.forEach(emp => {
      updated[emp.employee_code] = status
    })
    setAttendance(prev => ({ ...prev, ...updated }))
  }

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast.error('Please select a date')
      return
    }

    const unmarked = filteredEmployees.filter(emp => !attendance[emp.employee_code])
    if (unmarked.length > 0) {
      toast.error(`Mark attendance for all employees (${unmarked.length} left)`)
      return
    }

    setLoading(true)
    try {
      const payload = {
        date: selectedDate,
        records: filteredEmployees.map(emp => ({
          employee_code: emp.employee_code,
          status: attendance[emp.employee_code]
        }))
      }
      await axios.post(`${API_BASE}/api/v1/attendance/`, payload)
      toast.success('Attendance saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save attendance')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage)

  const roles = [...new Set(employees.map(emp => emp.role))]
  const branches = [...new Set(employees.map(emp => emp.branch_id).filter(Boolean))]

  const totalMarked = Object.keys(attendance).filter(key => attendance[key]).length
  const presentCount = Object.values(attendance).filter(status => status === 'Present').length
  const absentCount = Object.values(attendance).filter(status => status === 'Absent').length
  const halfDayCount = Object.values(attendance).filter(status => status === 'Half Day').length
  const leaveCount = Object.values(attendance).filter(status => status === 'Leave').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard title="Total Employees" value={filteredEmployees.length} color="blue" Icon={Users} />
          <StatCard title="Present" value={presentCount} color="green" Icon={CheckCircle} />
          <StatCard title="Absent" value={absentCount} color="red" Icon={XCircle} />
          <StatCard title="Half Day" value={halfDayCount} color="yellow" Icon={Sun} />
          <StatCard title="On Leave" value={leaveCount} color="purple" Icon={Plane} />
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

          {/* Date Picker & Bulk Mark */}
          <div className="bg-blue-500 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-lg">Select Date:</label>
              <input
                type="date"
                className="bg-white text-gray-700 px-4 py-2 rounded-lg shadow focus:ring-2 focus:ring-blue-300"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleBulkMark('Present')} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition">All Present</button>
              <button onClick={() => handleBulkMark('Absent')} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition">All Absent</button>
              <button onClick={() => handleBulkMark('Leave')} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition">All Leave</button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 bg-gradient-to-b from-gray-50 to-white border-b">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Search by name..."
                className="flex-1 px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select className="md:w-1/4 px-4 py-3 border rounded-xl" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                <option value="">All Roles</option>
                {roles.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
              <select className="md:w-1/4 px-4 py-3 border rounded-xl" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b} value={b}>Branch {b}</option>)}
              </select>
            </div>
          </div>

          {/* Progress Bar */}
          {filteredEmployees.length > 0 && (
            <div className="px-6 py-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{totalMarked}/{filteredEmployees.length} marked</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 transition-all duration-300"
                  style={{ width: `${(totalMarked / filteredEmployees.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                <tr>
                  {['#', 'Employee Code', 'Name', 'Role', 'Branch', 'Attendance'].map(h => (
                    <th key={h} className="px-6 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentEmployees.length > 0 ? currentEmployees.map((emp, idx) => (
                  <tr key={emp.employee_code} className="hover:bg-indigo-50 transition">
                    <td className="px-6 py-4">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4">{emp.employee_code}</td>
                    <td className="px-6 py-4">{emp.name}</td>
                    <td className="px-6 py-4">{emp.role}</td>
                    <td className="px-6 py-4">{emp.branch_id || '-'}</td>
                    <td className="px-6 py-4">
                      <select
                        className="border rounded-lg px-2 py-1 w-full"
                        value={attendance[emp.employee_code] || ''}
                        onChange={(e) => handleAttendanceChange(emp.employee_code, e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-gray-500">No employees found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex justify-center space-x-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1 border rounded">Prev</button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded ${currentPage === i + 1 ? 'bg-blue-600 text-white' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1 border rounded">Next</button>
            </div>
          )}

          {/* Submit Button */}
          <div className="p-6 bg-gray-50 text-center">
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedDate}
              className="px-10 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 📦 Stat Card Component with Lucide icon
const StatCard = ({ title, value, Icon, color }) => (
  <div className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between border hover:shadow-xl transition duration-300 ease-in-out">
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className={`text-3xl font-extrabold text-${color}-600`}>{value}</p>
    </div>
    <div className={`w-12 h-12 rounded-full bg-${color}-100 text-${color}-600 flex items-center justify-center`}>
      <Icon className="w-6 h-6" />
    </div>
  </div>          

)