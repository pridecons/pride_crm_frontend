'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import LoadingState from '@/components/LoadingState'

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  Tooltip,
  Legend
)

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Get user name from JWT token
    const token = Cookies.get('access_token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        setUserName(decoded.name || decoded.username || 'Employee')
      } catch (err) {
        console.error('Failed to decode token', err)
      }
    }

    const fetchData = async () => {
      if (!token) return

      try {
        const res = await axios.get(
          'https://crm.24x7techelp.com/api/v1/analytics/leads/employee/dashboard?days=30',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setData(res.data)
      } catch (err) {
        console.error(err)
        setError('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <LoadingState/>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  const {
    employee_stats = {},
    payment_stats = {},
    daily_activity = [],
    source_breakdown = [],
    response_breakdown = [],
    recent_activities = [],
    targets_vs_achievement = {},
  } = data

  const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString()}`

  const StatCard = ({ title, value, icon, color = "indigo", change }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-xs mt-1 flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? (
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50 ml-4`}>
          {icon}
        </div>
      </div>
    </div>
  )

  const ProgressBar = ({ label, current, target, color = "indigo" }) => {
    const percentage = Math.min((current / (target || 1)) * 100, 100)
    const isComplete = percentage >= 100

    return (
      <div className="bg-white rounded-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">{label}</h3>
          <div className="text-right">
            <span className="text-sm font-medium text-gray-900">
              {typeof current === 'number' && label.includes('Revenue') ? formatCurrency(current) : current}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              / {typeof target === 'number' && label.includes('Revenue') ? formatCurrency(target) : target}
            </span>
          </div>
        </div>
        <div className="relative">
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : `bg-${color}-500`
                }`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : `text-${color}-600`}`}>
              {percentage.toFixed(1)}% Complete
            </span>
            {isComplete && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 13.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Target Achieved
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const lineChartData = {
    labels: daily_activity.map((d) => d.date),
    datasets: [
      {
        label: 'Leads Created',
        data: daily_activity.map((d) => d.leads_created),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: 'Payments Made',
        data: daily_activity.map((d) => d.payments_made),
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
        data: daily_activity.map((d) => d.revenue),
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
    ],
  }

  const sourceBarData = {
    labels: source_breakdown.map((s) => s.source_name),
    datasets: [
      {
        label: 'Leads',
        data: source_breakdown.map((s) => s.total_leads),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }

  const responsePieData = {
    labels: response_breakdown.map((r) => r.response_name),
    datasets: [
      {
        label: 'Responses',
        data: response_breakdown.map((r) => r.total_leads),
        backgroundColor: [
          '#6366f1',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#06b6d4',
          '#84cc16',
          '#f97316'
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {userName}
              </h1>
              <p className="text-gray-600 mt-1">Here's your performance overview for the last 30 days</p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-900">{new Date().toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-indigo-600">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Stats */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Performance Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(employee_stats).map(([key, value]) => (
              <StatCard
                key={key}
                title={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                value={value}
                icon={
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                color="indigo"
              />
            ))}
          </div>
        </div>

        {/* Payment Stats */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Financial Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(payment_stats).map(([key, value]) => (
              <StatCard
                key={key}
                title={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                value={value}
                icon={
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
                color="green"
              />
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Activity Line Chart */}
          {daily_activity.length > 0 && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Daily Activity Trends</h2>
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full font-medium">
                    Last 30 Days
                  </div>
                </div>
                <div className="h-80">
                  <Line
                    data={lineChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            usePointStyle: true,
                            padding: 20,
                          },
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
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                          },
                        },
                        x: {
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Source Breakdown */}
          {source_breakdown.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Sources</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-indigo-700">Source Name</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-indigo-700">Total Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {source_breakdown.map((source, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700">{source.source_name}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{source.total_leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* Response Breakdown */}
          {response_breakdown.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Response Distribution</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-green-700">Response</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-green-700">Total Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {response_breakdown.map((response, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700">{response.response_name}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{response.total_leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activities */}
        {recent_activities.length > 0 && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
                <p className="text-gray-600 text-sm mt-1">Your latest interactions and updates</p>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {recent_activities.map((activity, idx) => (
                  <div key={idx} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="font-semibold text-indigo-600">{activity.activity}</span>
                          </p>
                          <p className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-gray-600">
                            Customer: <span className="font-medium">{activity.lead_name}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Lead ID: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{activity.lead_id}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Dashboard refreshed: {new Date().toLocaleString()}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Real-time Data
              </span>
            </div>
            <div className="mt-2 sm:mt-0 flex items-center space-x-2">
              <span>Performance period: Last 30 days</span>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}