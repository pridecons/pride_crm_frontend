'use client'

import { useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import LoadingState from '@/components/LoadingState'
import { axiosInstance } from '@/api/Axios'
import { IndianRupee } from 'lucide-react'

ChartJS.register(
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
)

export default function SuperDashboard() {
  const [role, setRole] = useState(null)               // uses role_name from JWT (e.g., SUPERADMIN)
  const [branchId, setBranchId] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const router = useRouter()

  const getBranchNameById = (id) => {
    const branch = branches.find((b) => String(b.id) === String(id))
    return branch ? branch.name : null
  }

  // Top 2 performers per branch (by revenue, then converted, then calls)
  const topTwoByBranch = useMemo(() => {
    if (!Array.isArray(data?.top_performers)) return []

    let arr = data.top_performers

    // If SUPERADMIN selected a branch, show only that branch
    if (role === 'SUPERADMIN' && branchId) {
      const selectedBranchName = getBranchNameById(branchId)
      arr = arr.filter((e) => e.branch_name === selectedBranchName)
    }

    const byBranch = new Map()
    for (const e of arr) {
      const key = e.branch_name || 'Unknown'
      if (!byBranch.has(key)) byBranch.set(key, [])
      byBranch.get(key).push(e)
    }

    const picked = []
    for (const [, list] of byBranch) {
      list.sort((a, b) => {
        const rev = (b.total_revenue || 0) - (a.total_revenue || 0)
        if (rev !== 0) return rev
        const conv = (b.converted_leads || 0) - (a.converted_leads || 0)
        if (conv !== 0) return conv
        return (b.called_leads || 0) - (a.called_leads || 0)
      })
      picked.push(...list.slice(0, 2))
    }

    picked.sort(
      (a, b) =>
        (a.branch_name || '').localeCompare(b.branch_name || '') ||
        (b.total_revenue || 0) - (a.total_revenue || 0)
    )

    return picked
  }, [data?.top_performers, role, branchId, branches])

  // Bootstrap: read token, set role_name and branch, fetch branches (for SUPERADMIN)
  useEffect(() => {
    const token = Cookies.get('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    const decoded = jwtDecode(token)
    // IMPORTANT: use role_name from JWT
    const userRoleName = decoded?.role_name || decoded?.role || ''
    setRole(userRoleName)

    // Branch for branch-scoped roles
    const initialBranchId = decoded?.branch_id ?? null
    if (userRoleName === 'BRANCH_MANAGER') {
      setBranchId(initialBranchId)
    }

    // Fetch branches for SUPERADMIN to enable switching
    if (userRoleName === 'SUPERADMIN') {
      axiosInstance
        .get('/branches/', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setBranches(Array.isArray(res.data) ? res.data : []))
        .catch((err) => {
          console.error('Error fetching branches', err)
        })
    }
  }, [router])

  // Load dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = Cookies.get('access_token')
        let url = '/analytics/leads/admin/dashboard?days=30'

        // SUPERADMIN can optionally pass branch_id; BRANCH_MANAGER will pass its own branch_id
        if ((role === 'BRANCH_MANAGER' || role === 'SUPERADMIN') && branchId) {
          url += `&branch_id=${branchId}`
        }

        const res = await axiosInstance.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setData(res.data)
      } catch (err) {
        setError('Failed to load dashboard')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (role) fetchData()
  }, [role, branchId])

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  const {
    overall_stats = {},
    payment_stats = {},
    employee_performance = [],
    branch_performance = [],
  } = data || {}

  const StatCard = ({ title, value, icon, color = 'blue', trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {typeof trend === 'number' && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>{icon}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor your business performance and insights</p>
            </div>

            {role === 'SUPERADMIN' && (
              <div className="flex flex-col space-y-2 w-full md:w-auto">
                <label className="text-sm font-semibold text-gray-700 mb-1">Selected Branch</label>
                <div className="flex flex-wrap gap-3">
                  <>
                    <button
                      onClick={() => setBranchId(null)}
                      aria-pressed={!branchId}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                        !branchId
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      All Branches
                    </button>

                    {branches.map((branch) => {
                      const isActive = String(branchId) === String(branch.id)
                      return (
                        <button
                          key={branch.id}
                          onClick={() => setBranchId(branch.id)}
                          aria-pressed={isActive}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {branch.name}
                        </button>
                      )
                    })}
                  </>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overall Stats */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(overall_stats)
              // hide conversion_rate as a separate stat card
              .filter(([key]) => key !== 'conversion_rate')
              // optional: rename "new_leads_*" to "upload_leads_*"
              .map(([key, value]) => {
                const remappedKey = key.startsWith('new_leads')
                  ? key.replace(/^new_leads/, 'upload_leads')
                  : key

                const title = remappedKey
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase())

                return (
                  <StatCard
                    key={key}
                    title={title}
                    value={value}
                    icon={
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    }
                    color="blue"
                  />
                )
              })}
          </div>
        </div>

        {/* Payment Stats */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(payment_stats)
              .filter(
                ([key]) =>
                  ![
                    'average_payment_amount',
                    'successful_payments',
                    'failed_payments',
                    'revenue_this_month',
                  ].includes(key)
              )
              .map(([key, value]) => {
                let titleText = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                if (key === 'total_payments') titleText = 'Daily Payments'
                return (
                  <StatCard
                    key={key}
                    title={titleText}
                    value={Number(value).toFixed(2)}
                    icon={<IndianRupee className="w-6 h-6 text-green-600" />}
                    color="green"
                  />
                )
              })}
          </div>

          {/* Monthly Sales (Bar) */}
          {Array.isArray(data?.daily_trends) &&
            data.daily_trends.length > 0 &&
            (() => {
              const parseISO = (s) => new Date(s)
              const toKey = (d) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
              const toLabel = (d) =>
                d.toLocaleString('en-GB', { month: 'short' }).replace('.', '') +
                String(d.getFullYear()).slice(-2)

              let minDate = new Date(data.daily_trends[0].date)
              let maxDate = new Date(data.daily_trends[0].date)
              for (const row of data.daily_trends) {
                const d = parseISO(row.date)
                if (d < minDate) minDate = d
                if (d > maxDate) maxDate = d
              }

              const monthlyRevenue = new Map()
              for (const row of data.daily_trends) {
                const d = parseISO(row.date)
                const key = toKey(d)
                monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + Number(row.revenue || 0))
              }

              const labels = []
              const values = []
              const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
              const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)

              while (cursor <= end) {
                const key = toKey(cursor)
                labels.push(toLabel(cursor))
                values.push(monthlyRevenue.get(key) || 0)
                cursor.setMonth(cursor.getMonth() + 1)
              }

              return (
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Monthly Sales</h3>
                    <span className="text-xs text-gray-500">Bar Chart</span>
                  </div>

                  <div className="h-80">
                    <Bar
                      data={{
                        labels,
                        datasets: [
                          {
                            label: 'Sales (₹)',
                            data: values,
                            backgroundColor: 'rgba(56, 189, 248, 0.6)',
                            borderWidth: 0,
                            yAxisID: 'y',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) =>
                                `Sales: ₹${Number(ctx.parsed.y || 0).toLocaleString('en-IN')}`,
                              title: (items) => (items?.[0]?.label ? items[0].label : ''),
                            },
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 },
                          },
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Amount (₹)' },
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: {
                              callback: (v) => '₹' + new Intl.NumberFormat('en-IN').format(v),
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )
            })()}
        </div>

        {/* Tables section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lead Source Performance */}
          {data.source_analytics && data.source_analytics.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Lead Source Performance</h2>
                <p className="text-gray-600 text-sm mt-1">Performance breakdown by source</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Leads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remaining Leads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.source_analytics.map((source, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {source.source_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-blue-700">
                          {source.total_leads}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-orange-700">
                          {Number(source.total_leads || 0) - Number(source.converted_leads || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          ₹{Number(source.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Response Distribution (renders only if backend sends it) */}
          {data.response_analytics && data.response_analytics.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Response Distribution</h2>
                <p className="text-gray-600 text-sm mt-1">How leads have responded</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Leads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.response_analytics.map((res, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {res.response_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-blue-700">
                          {res.total_leads}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {res.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Performance Tables */}
        <div className="space-y-8">
          {/* Branch Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Branch Performance</h2>
              <p className="text-gray-600 text-sm mt-1">Compare performance across all branches</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Converted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {branch_performance
                    .filter((b) => {
                      if (role === 'SUPERADMIN' && branchId) {
                        return String(b.branch_id) === String(branchId)
                      }
                      return true
                    })
                    .map((b, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{b.branch_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {b.manager_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {b.total_leads}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {b.converted_leads}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          ₹{Number(b.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${Math.min(parseFloat(b.conversion_rate || 0), 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {b.conversion_rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
              <p className="text-gray-600 text-sm mt-1">Highest performing team members</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calls
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Converted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topTwoByBranch.map((e, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-800">
                                {e.employee_name?.charAt(0)?.toUpperCase?.() || '-'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">{e.employee_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {e.role_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {e.branch_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {e.total_leads}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {e.called_leads}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {e.converted_leads}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        ₹{Number(e.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-16">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(parseFloat(e.conversion_rate || 0), 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {e.conversion_rate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-16">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(parseFloat(e.call_rate || 0), 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{e.call_rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Employee Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">All Employee Performance</h2>
              <p className="text-gray-600 text-sm mt-1">Comprehensive team performance overview</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calls
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Converted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employee_performance
                    .filter((e) => {
                      if (role === 'SUPERADMIN' && branchId) {
                        const selectedBranchName = getBranchNameById(branchId)
                        return e.branch_name === selectedBranchName
                      }
                      return true
                    })
                    .map((e, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {e.employee_name?.charAt(0)?.toUpperCase?.() || '-'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">{e.employee_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {e.role_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {e.branch_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {e.total_leads}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {e.called_leads}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {e.converted_leads}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          ₹{Number(e.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Daily Trends (Line) */}
        {data.daily_trends && data.daily_trends.length > 0 && (
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Daily Performance Trends</h2>
                <div className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full font-medium">
                  Last 30 Days
                </div>
              </div>
              <div className="h-80">
                <Line
                  data={{
                    labels: data.daily_trends.map((item) => item.date),
                    datasets: [
                      {
                        label: 'Leads Created',
                        data: data.daily_trends.map((item) => item.leads_created),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                      },
                      {
                        label: 'Leads Called',
                        data: data.daily_trends.map((item) => item.leads_called),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#f59e0b',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                      },
                      {
                        label: 'Payments Made',
                        data: data.daily_trends.map((item) => item.payments_made),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                      },
                      {
                        label: 'Revenue',
                        data: data.daily_trends.map((item) => item.revenue),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#ef4444',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        yAxisID: 'revenueAxis',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 20 },
                      },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Counts', font: { weight: 'bold' } },
                        ticks: { precision: 0 },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                      },
                      revenueAxis: {
                        position: 'right',
                        beginAtZero: true,
                        title: { display: true, text: 'Revenue (₹)', font: { weight: 'bold' } },
                        grid: { drawOnChartArea: false },
                        ticks: { precision: 0 },
                      },
                      x: { grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Last updated: {new Date().toLocaleString()}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Live Data
              </span>
            </div>
            <div className="mt-2 sm:mt-0">
              <span>Showing data for last 30 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
