'use client'

import { useEffect, useState } from 'react'
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
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js'
import { Pie, Line, Bar } from 'react-chartjs-2'
import LoadingState from '@/components/LoadingState'
import { axiosInstance } from '@/api/Axios'

ChartJS.register(
    LineElement,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    ArcElement,
    Tooltip,
    Legend
)

export default function SuperDashboard() {
    const [role, setRole] = useState(null)
    const [branchId, setBranchId] = useState(null)
    const [branches, setBranches] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [data, setData] = useState(null)
    const router = useRouter()

    useEffect(() => {
        const token = Cookies.get('access_token')
        if (!token) {
            router.push('/login')
            return
        }

        const decoded = jwtDecode(token)
        const userRole = decoded.role
        setRole(userRole)

        const initialBranchId = decoded.branch_id
        if (userRole === 'BRANCH MANAGER') {
            setBranchId(initialBranchId)
        }

        // Fetch branches if superadmin
        if (userRole === 'SUPERADMIN') {
            axiosInstance
                .get('/branches/', {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => {
                    setBranches(res.data)
                })
                .catch((err) => {
                    console.error('Error fetching branches', err)
                })
        }
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                const token = Cookies.get('access_token')
                let url = '/analytics/leads/admin/dashboard?days=30'

                if (role === 'BRANCH MANAGER' && branchId) {
                    url += `&branch_id=${branchId}`
                }

                if (role === 'SUPERADMIN' && branchId) {
                    url += `&branch_id=${branchId}`
                }

                const res = await axiosInstance.get(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                setData(res.data)
                console.log('Source analytics:', res.data.source_analytics)
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
        return (
            <LoadingState />
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
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

    const { overall_stats, payment_stats, employee_performance, branch_performance } = data

    const getBranchNameById = (id) => {
        const branch = branches.find(b => b.id.toString() === id?.toString())
        return branch ? branch.name : null
    }

    const StatCard = ({ title, value, icon, color = "blue", trend }) => (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-lg bg-${color}-50`}>
                    {icon}
                </div>
            </div>
        </div>
    )
    // Custom titles for top cards
    const TITLE_MAP = {
        new_leads_today: 'Upload Leads Today',
        new_leads_this_week: 'Upload Leads This Week',
        new_leads_this_month: 'Upload Leads This Month',
    };


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
                                <label className="text-sm font-semibold text-gray-700 mb-1">
                                    Select Branch
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setBranchId(null)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-700 text-white border-blue-700 hover:brightness-110 ${!branchId ? 'shadow-md ring-2 ring-blue-300' : ''
                                            }`}
                                    >
                                        All Branches
                                    </button>
                                    {branches.map((branch, index) => {
                                        const colors = [
                                            'from-pink-500 to-pink-700 border-pink-700',
                                            'from-green-500 to-green-700 border-green-700',
                                            'from-purple-500 to-purple-700 border-purple-700',
                                            'from-yellow-500 to-yellow-600 border-yellow-600',
                                            'from-indigo-500 to-indigo-700 border-indigo-700',
                                            'from-teal-500 to-teal-700 border-teal-700',
                                            'from-rose-500 to-rose-700 border-rose-700',
                                        ]
                                        const colorClass = colors[index % colors.length]
                                        const isActive = branchId == branch.id

                                        return (
                                            <button
                                                key={branch.id}
                                                onClick={() => setBranchId(branch.id)}
                                                className={`px-4 py-2 rounded-lg text-sm font-semibold border text-white transition-all duration-200 bg-gradient-to-r ${colorClass} hover:brightness-110 ${isActive ? 'shadow-md ring-2 ring-offset-1 ring-white' : ''
                                                    }`}
                                            >
                                                {branch.name}
                                            </button>
                                        )
                                    })}
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
                            // 1) remove conversion_rate card
                            .filter(([key]) => key !== 'conversion_rate')
                            // 2) remap titles: new_leads_* → upload_leads_*
                            .map(([key, value]) => {
                                const remappedKey = key.startsWith('new_leads')
                                    ? key.replace(/^new_leads/, 'upload_leads')
                                    : key;

                                const title = remappedKey
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (l) => l.toUpperCase()); // → "Upload Leads Today", etc.

                                return (
                                    <StatCard
                                        key={key}
                                        title={title}
                                        value={value}
                                        icon={
                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        }
                                        color="blue"
                                    />
                                );
                            })}

                    </div>
                </div>

                {/* Payment Stats */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Overview</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Object.entries(payment_stats)
                            // remove unwanted keys
                            .filter(([key]) => !['average_payment_amount', 'successful_payments', 'failed_payments', 'revenue_this_month'].includes(key))
                            .map(([key, value]) => {
                                let titleText = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                if (key === 'total_payments') {
                                    titleText = 'Daily Payments';
                                }
                                return (
                                    <StatCard
                                        key={key}
                                        title={titleText}
                                        value={Number(value).toFixed(2)}
                                        icon={
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                        }
                                        color="green"
                                    />
                                );
                            })}
                    </div>
                </div>



                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Daily Trends Chart */}


                    {/* Lead Source Performance Table */}
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leads</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Leads</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.source_analytics.map((source, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{source.source_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-blue-700">{source.total_leads}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-orange-700">
                                                    {source.total_leads - source.converted_leads}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900">₹{source.total_revenue}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                    {/* Response Distribution Table */}
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leads</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.response_analytics.map((res, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{res.response_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-blue-700">{res.total_leads}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{res.percentage}%</td>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Converted</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion %</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {branch_performance
                                        .filter((b) => {
                                            if (role === 'SUPERADMIN' && branchId) {
                                                return b.branch_id.toString() === branchId.toString()
                                            }
                                            return true
                                        })
                                        .map((b, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{b.branch_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{b.manager_name}</td>
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
                                                    ₹{Number(b.total_revenue).toFixed(2)}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div
                                                                className="bg-green-500 h-2 rounded-full"
                                                                style={{ width: `${Math.min(parseFloat(b.conversion_rate), 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{b.conversion_rate}%</span>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Converted</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion %</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call %</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.top_performers
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
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                                <span className="text-sm font-medium text-blue-800">
                                                                    {e.employee_name.charAt(0).toUpperCase()}
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
                                                        {e.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{e.branch_name || '-'}</td>
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
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">₹{Number(e.total_revenue).toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-16">
                                                            <div
                                                                className="bg-green-500 h-2 rounded-full"
                                                                style={{ width: `${Math.min(parseFloat(e.conversion_rate), 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{e.conversion_rate}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-16">
                                                            <div
                                                                className="bg-blue-500 h-2 rounded-full"
                                                                style={{ width: `${Math.min(parseFloat(e.call_rate), 100)}%` }}
                                                            ></div>
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

                    {/* Employee Performance */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-900">All Employee Performance</h2>
                            <p className="text-gray-600 text-sm mt-1">Comprehensive team performance overview</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Converted</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
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
                                                                    {e.employee_name.charAt(0).toUpperCase()}
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
                                                        {e.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{e.branch_name}</td>
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
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">₹{Number(e.total_revenue.toFixed(2))}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

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
                                        labels: data.daily_trends.map(item => item.date),
                                        datasets: [
                                            {
                                                label: 'Leads Created',
                                                data: data.daily_trends.map(item => item.leads_created),
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
                                                data: data.daily_trends.map(item => item.leads_called),
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
                                                data: data.daily_trends.map(item => item.payments_made),
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
                                                data: data.daily_trends.map(item => item.revenue),
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
                                                title: {
                                                    display: true,
                                                    text: 'Counts',
                                                    font: { weight: 'bold' },
                                                },
                                                ticks: {
                                                    precision: 0,
                                                },
                                                grid: {
                                                    color: 'rgba(0, 0, 0, 0.05)',
                                                },
                                            },
                                            revenueAxis: {
                                                position: 'right',
                                                beginAtZero: true,
                                                title: {
                                                    display: true,
                                                    text: 'Revenue (₹)',
                                                    font: { weight: 'bold' },
                                                },
                                                grid: {
                                                    drawOnChartArea: false,
                                                },
                                                ticks: {
                                                    precision: 0,
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