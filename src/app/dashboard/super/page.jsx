// 'use client'

// import { useEffect, useMemo, useState } from 'react'
// import { jwtDecode } from 'jwt-decode'
// import Cookies from 'js-cookie'
// import { useRouter } from 'next/navigation'
// import {
//   Chart as ChartJS,
//   LineElement,
//   BarElement,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   Tooltip,
//   Legend,
// } from 'chart.js'
// import { Bar, Line } from 'react-chartjs-2'
// import LoadingState from '@/components/LoadingState'
// import { axiosInstance } from '@/api/Axios'
// import { IndianRupee } from 'lucide-react'

// ChartJS.register(
//   LineElement,
//   BarElement,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   Tooltip,
//   Legend
// )

// export default function SuperDashboard() {
//   const [role, setRole] = useState(null)               // uses role_name from JWT (e.g., SUPERADMIN)
//   const [branchId, setBranchId] = useState(null)
//   const [branches, setBranches] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState(null)
//   const [data, setData] = useState(null)
//   // helpers
// const isManager = role === 'SUPERADMIN' || role === 'BRANCH_MANAGER';
// const isNonManager = !isManager;

// // non-managers can switch "self" / "other"
// const [myView, setMyView] = useState('self');

//   const router = useRouter()

//   const getBranchNameById = (id) => {
//     const branch = branches.find((b) => String(b.id) === String(id))
//     return branch ? branch.name : null
//   }

//   // Top 2 performers per branch (by revenue, then converted, then calls)
//   const topTwoByBranch = useMemo(() => {
//     if (!Array.isArray(data?.top_performers)) return []

//     let arr = data.top_performers

//     // If SUPERADMIN selected a branch, show only that branch
//     if (role === 'SUPERADMIN' && branchId) {
//       const selectedBranchName = getBranchNameById(branchId)
//       arr = arr.filter((e) => e.branch_name === selectedBranchName)
//     }

//     const byBranch = new Map()
//     for (const e of arr) {
//       const key = e.branch_name || 'Unknown'
//       if (!byBranch.has(key)) byBranch.set(key, [])
//       byBranch.get(key).push(e)
//     }

//     const picked = []
//     for (const [, list] of byBranch) {
//       list.sort((a, b) => {
//         const rev = (b.total_revenue || 0) - (a.total_revenue || 0)
//         if (rev !== 0) return rev
//         const conv = (b.converted_leads || 0) - (a.converted_leads || 0)
//         if (conv !== 0) return conv
//         return (b.called_leads || 0) - (a.called_leads || 0)
//       })
//       picked.push(...list.slice(0, 2))
//     }

//     picked.sort(
//       (a, b) =>
//         (a.branch_name || '').localeCompare(b.branch_name || '') ||
//         (b.total_revenue || 0) - (a.total_revenue || 0)
//     )

//     return picked
//   }, [data?.top_performers, role, branchId, branches])

//   // Bootstrap: read token, set role_name and branch, fetch branches (for SUPERADMIN)
// useEffect(() => {
//   const token = Cookies.get('access_token');
//   if (!token) {
//     router.push('/login');
//     return;
//   }

//   const decoded = jwtDecode(token);
//   const userRoleName = decoded?.role_name || decoded?.role || '';
//   setRole(userRoleName);

//   // default view by role
//   setMyView(userRoleName === 'SUPERADMIN' || userRoleName === 'BRANCH_MANAGER' ? 'all' : 'self');

//   // branch scoping
//   const initialBranchId = decoded?.branch_id ?? null;
//   if (userRoleName === 'BRANCH_MANAGER') {
//     setBranchId(initialBranchId);       // lock manager to own branch
//   } else if (userRoleName !== 'SUPERADMIN') {
//     setBranchId(null);                  // non-managers must not set branch
//   }

//   // SUPERADMIN can fetch branch list to switch
//   if (userRoleName === 'SUPERADMIN') {
//     axiosInstance
//       .get('/branches/', { headers: { Authorization: `Bearer ${token}` } })
//       .then((res) => setBranches(Array.isArray(res.data) ? res.data : []))
//       .catch((err) => console.error('Error fetching branches', err));
//   }
// }, [router]);

//   // Load dashboard data
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setLoading(true)
//         setError(null)

//         const token = Cookies.get('access_token')
//         let url = '/analytics/leads/admin/dashboard?days=30'

//         // SUPERADMIN: all or by chosen branch
// if (role === 'SUPERADMIN') {
//   url += '&view=all';
//   if (branchId) url += `&branch_id=${branchId}`;
// }

// // BRANCH_MANAGER: always own branch, all
// else if (role === 'BRANCH_MANAGER') {
//   url += '&view=all';
//   if (branchId) url += `&branch_id=${branchId}`;
// }

// // Other roles: only self/other, no branch filter
// else {
//   url += `&view=${myView}`;
// }
//         const res = await axiosInstance.get(url, {
//           headers: { Authorization: `Bearer ${token}` },
//         })
//         setData(res.data)
//       } catch (err) {
//         setError('Failed to load dashboard')
//         console.error(err)
//       } finally {
//         setLoading(false)
//       }
//     }

//     if (role) fetchData()
//   }, [role, branchId, myView])

//   if (loading) {
//     return <LoadingState />
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
//         <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
//           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
//             <svg
//               className="w-8 h-8 text-red-600"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//               />
//             </svg>
//           </div>
//           <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Error</h3>
//           <p className="text-red-600">{error}</p>
//         </div>
//       </div>
//     )
//   }

//   const {
//     overall_stats = {},
//     payment_stats = {},
//     employee_performance = [],
//     branch_performance = [],
//   } = data || {}

//   const StatCard = ({ title, value, icon, color = 'blue', trend }) => (
//     <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
//       <div className="flex items-center justify-between">
//         <div>
//           <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
//           <p className="text-2xl font-bold text-gray-900">{value}</p>
//           {typeof trend === 'number' && (
//             <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
//               {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
//             </p>
//           )}
//         </div>
//         <div className={`p-3 rounded-lg bg-${color}-50`}>{icon}</div>
//       </div>
//     </div>
//   )

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
//       <div className="max-w-7xl mx-auto p-6 space-y-8">
//         {/* Header */}
//         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
//               <p className="text-gray-600 mt-1">Monitor your business performance and insights</p>
//             </div>
//             {/* Non-managers: scope toggle */}
// {isNonManager && (
//   <div className="flex gap-2">
//     {['self', 'other'].map((v, i) => (
//       <button
//         key={v}
//         type="button"
//         onClick={() => setMyView(v)}
//         className={`px-4 py-2 text-sm font-medium border
//           ${myView === v
//             ? 'bg-blue-600 text-white border-blue-600 shadow-md'
//             : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'}
//           ${i === 0 ? 'rounded-l-lg' : 'rounded-r-lg'}`}
//       >
//         {v === 'self' ? 'My Data' : 'Other (Team)'}
//       </button>
//     ))}
//   </div>
// )}

//             {role === 'SUPERADMIN' && (
//               <div className="flex flex-col space-y-2 w-full md:w-auto">
//                 <label className="text-sm font-semibold text-gray-700 mb-1">Selected Branch</label>
//                 <div className="flex flex-wrap gap-3">
//                   <>
//                     <button
//                       onClick={() => setBranchId(null)}
//                       aria-pressed={!branchId}
//                       className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
//                         !branchId
//                           ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
//                           : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
//                       }`}
//                     >
//                       All Branches
//                     </button>

//                     {branches.map((branch) => {
//                       const isActive = String(branchId) === String(branch.id)
//                       return (
//                         <button
//                           key={branch.id}
//                           onClick={() => setBranchId(branch.id)}
//                           aria-pressed={isActive}
//                           className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
//                             isActive
//                               ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
//                               : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
//                           }`}
//                         >
//                           {branch.name}
//                         </button>
//                       )
//                     })}
//                   </>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Overall Stats */}
//         <div>
//           <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Metrics</h2>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//             {Object.entries(overall_stats)
//               // hide conversion_rate as a separate stat card
//               .filter(([key]) => key !== 'conversion_rate')
//               // optional: rename "new_leads_*" to "upload_leads_*"
//               .map(([key, value]) => {
//                 const remappedKey = key.startsWith('new_leads')
//                   ? key.replace(/^new_leads/, 'upload_leads')
//                   : key

//                 const title = remappedKey
//                   .replace(/_/g, ' ')
//                   .replace(/\b\w/g, (l) => l.toUpperCase())

//                 return (
//                   <StatCard
//                     key={key}
//                     title={title}
//                     value={value}
//                     icon={
//                       <svg
//                         className="w-6 h-6 text-blue-600"
//                         fill="none"
//                         stroke="currentColor"
//                         viewBox="0 0 24 24"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
//                         />
//                       </svg>
//                     }
//                     color="blue"
//                   />
//                 )
//               })}
//           </div>
//         </div>

//         {/* Payment Stats */}
//         <div>
//           <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Overview</h2>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//             {Object.entries(payment_stats)
//               .filter(
//                 ([key]) =>
//                   ![
//                     'average_payment_amount',
//                     'successful_payments',
//                     'failed_payments',
//                     'revenue_this_month',
//                   ].includes(key)
//               )
//               .map(([key, value]) => {
//                 let titleText = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
//                 if (key === 'total_payments') titleText = 'Daily Payments'
//                 return (
//                   <StatCard
//                     key={key}
//                     title={titleText}
//                     value={Number(value).toFixed(2)}
//                     icon={<IndianRupee className="w-6 h-6 text-green-600" />}
//                     color="green"
//                   />
//                 )
//               })}
//           </div>

//           {/* Monthly Sales (Bar) */}
//           {Array.isArray(data?.daily_trends) &&
//             data.daily_trends.length > 0 &&
//             (() => {
//               const parseISO = (s) => new Date(s)
//               const toKey = (d) =>
//                 `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
//               const toLabel = (d) =>
//                 d.toLocaleString('en-GB', { month: 'short' }).replace('.', '') +
//                 String(d.getFullYear()).slice(-2)

//               let minDate = new Date(data.daily_trends[0].date)
//               let maxDate = new Date(data.daily_trends[0].date)
//               for (const row of data.daily_trends) {
//                 const d = parseISO(row.date)
//                 if (d < minDate) minDate = d
//                 if (d > maxDate) maxDate = d
//               }

//               const monthlyRevenue = new Map()
//               for (const row of data.daily_trends) {
//                 const d = parseISO(row.date)
//                 const key = toKey(d)
//                 monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + Number(row.revenue || 0))
//               }

//               const labels = []
//               const values = []
//               const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
//               const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)

//               while (cursor <= end) {
//                 const key = toKey(cursor)
//                 labels.push(toLabel(cursor))
//                 values.push(monthlyRevenue.get(key) || 0)
//                 cursor.setMonth(cursor.getMonth() + 1)
//               }

//               return (
//                 <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
//                   <div className="flex items-center justify-between mb-4">
//                     <h3 className="text-lg font-semibold text-gray-900">Monthly Sales</h3>
//                     <span className="text-xs text-gray-500">Bar Chart</span>
//                   </div>

//                   <div className="h-80">
//                     <Bar
//                       data={{
//                         labels,
//                         datasets: [
//                           {
//                             label: 'Sales (₹)',
//                             data: values,
//                             backgroundColor: 'rgba(56, 189, 248, 0.6)',
//                             borderWidth: 0,
//                             yAxisID: 'y',
//                           },
//                         ],
//                       }}
//                       options={{
//                         responsive: true,
//                         maintainAspectRatio: false,
//                         interaction: { mode: 'index', intersect: false },
//                         plugins: {
//                           legend: { display: false },
//                           tooltip: {
//                             callbacks: {
//                               label: (ctx) =>
//                                 `Sales: ₹${Number(ctx.parsed.y || 0).toLocaleString('en-IN')}`,
//                               title: (items) => (items?.[0]?.label ? items[0].label : ''),
//                             },
//                           },
//                         },
//                         scales: {
//                           x: {
//                             grid: { display: false },
//                             ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 },
//                           },
//                           y: {
//                             beginAtZero: true,
//                             title: { display: true, text: 'Amount (₹)' },
//                             grid: { color: 'rgba(0,0,0,0.05)' },
//                             ticks: {
//                               callback: (v) => '₹' + new Intl.NumberFormat('en-IN').format(v),
//                             },
//                           },
//                         },
//                       }}
//                     />
//                   </div>
//                 </div>
//               )
//             })()}
//         </div>

//         {/* Tables section */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//           {/* Lead Source Performance */}
//           {data.source_analytics && data.source_analytics.length > 0 && (
//             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
//               <div className="px-6 py-4 border-b border-gray-100">
//                 <h2 className="text-xl font-semibold text-gray-900">Lead Source Performance</h2>
//                 <p className="text-gray-600 text-sm mt-1">Performance breakdown by source</p>
//               </div>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-gray-50">
//                     <tr>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Source
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Total Leads
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Remaining Leads
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Revenue
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {data.source_analytics.map((source, index) => (
//                       <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
//                         <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
//                           {source.source_name}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-blue-700">
//                           {source.total_leads}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-orange-700">
//                           {Number(source.total_leads || 0) - Number(source.converted_leads || 0)}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-gray-900">
//                           ₹{Number(source.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}

//           {/* Response Distribution (renders only if backend sends it) */}
//           {data.response_analytics && data.response_analytics.length > 0 && (
//             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
//               <div className="px-6 py-4 border-b border-gray-100">
//                 <h2 className="text-xl font-semibold text-gray-900">Response Distribution</h2>
//                 <p className="text-gray-600 text-sm mt-1">How leads have responded</p>
//               </div>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-gray-50">
//                     <tr>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Response
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Total Leads
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Percentage
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {data.response_analytics.map((res, idx) => (
//                       <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
//                         <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
//                           {res.response_name}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-blue-700">
//                           {res.total_leads}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                           {res.percentage}%
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Performance Tables */}
//         <div className="space-y-8">
//           {/* Branch Performance */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-100">
//               <h2 className="text-xl font-semibold text-gray-900">Branch Performance</h2>
//               <p className="text-gray-600 text-sm mt-1">Compare performance across all branches</p>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Branch
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Manager
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Leads
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Converted
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Revenue
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Conversion %
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {branch_performance
//                     .filter((b) => {
//                       if (role === 'SUPERADMIN' && branchId) {
//                         return String(b.branch_id) === String(branchId)
//                       }
//                       return true
//                     })
//                     .map((b, idx) => (
//                       <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <div className="font-medium text-gray-900">{b.branch_name}</div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-gray-600">
//                           {b.manager_name}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                             {b.total_leads}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
//                             {b.converted_leads}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
//                           ₹{Number(b.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <div className="flex items-center">
//                             <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
//                               <div
//                                 className="bg-green-500 h-2 rounded-full"
//                                 style={{ width: `${Math.min(parseFloat(b.conversion_rate || 0), 100)}%` }}
//                               />
//                             </div>
//                             <span className="text-sm font-medium text-gray-900">
//                               {b.conversion_rate}%
//                             </span>
//                           </div>
//                         </td>
//                       </tr>
//                     ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* Top Performers */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-100">
//               <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
//               <p className="text-gray-600 text-sm mt-1">Highest performing team members</p>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Name
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Role
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Branch
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Leads
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Calls
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Converted
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Revenue
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Conversion %
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Call %
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {topTwoByBranch.map((e, idx) => (
//                     <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex items-center">
//                           <div className="flex-shrink-0 h-8 w-8">
//                             <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
//                               <span className="text-sm font-medium text-blue-800">
//                                 {e.employee_name?.charAt(0)?.toUpperCase?.() || '-'}
//                               </span>
//                             </div>
//                           </div>
//                           <div className="ml-3">
//                             <div className="font-medium text-gray-900">{e.employee_name}</div>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
//                           {e.role_name}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-gray-600">
//                         {e.branch_name || '-'}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                           {e.total_leads}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//                           {e.called_leads}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
//                           {e.converted_leads}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
//                         ₹{Number(e.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex items-center">
//                           <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-16">
//                             <div
//                               className="bg-green-500 h-2 rounded-full"
//                               style={{
//                                 width: `${Math.min(parseFloat(e.conversion_rate || 0), 100)}%`,
//                               }}
//                             />
//                           </div>
//                           <span className="text-sm font-medium text-gray-900">
//                             {e.conversion_rate}%
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex items-center">
//                           <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-16">
//                             <div
//                               className="bg-blue-500 h-2 rounded-full"
//                               style={{
//                                 width: `${Math.min(parseFloat(e.call_rate || 0), 100)}%`,
//                               }}
//                             />
//                           </div>
//                           <span className="text-sm font-medium text-gray-900">{e.call_rate}%</span>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* All Employee Performance */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-100">
//               <h2 className="text-xl font-semibold text-gray-900">All Employee Performance</h2>
//               <p className="text-gray-600 text-sm mt-1">Comprehensive team performance overview</p>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Name
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Role
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Branch
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Leads
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Calls
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Converted
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Revenue
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {employee_performance
//                     .filter((e) => {
//                       if (role === 'SUPERADMIN' && branchId) {
//                         const selectedBranchName = getBranchNameById(branchId)
//                         return e.branch_name === selectedBranchName
//                       }
//                       return true
//                     })
//                     .map((e, idx) => (
//                       <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <div className="flex items-center">
//                             <div className="flex-shrink-0 h-8 w-8">
//                               <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
//                                 <span className="text-sm font-medium text-gray-600">
//                                   {e.employee_name?.charAt(0)?.toUpperCase?.() || '-'}
//                                 </span>
//                               </div>
//                             </div>
//                             <div className="ml-3">
//                               <div className="font-medium text-gray-900">{e.employee_name}</div>
//                             </div>
//                           </div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
//                             {e.role_name}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-gray-600">
//                           {e.branch_name || '-'}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                             {e.total_leads}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//                             {e.called_leads}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
//                             {e.converted_leads}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
//                           ₹{Number(e.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
//                         </td>
//                       </tr>
//                     ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>

//         {/* Daily Trends (Line) */}
//         {data.daily_trends && data.daily_trends.length > 0 && (
//           <div className="lg:col-span-2">
//             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
//               <div className="flex items-center justify-between mb-6">
//                 <h2 className="text-xl font-semibold text-gray-900">Daily Performance Trends</h2>
//                 <div className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full font-medium">
//                   Last 30 Days
//                 </div>
//               </div>
//               <div className="h-80">
//                 <Line
//                   data={{
//                     labels: data.daily_trends.map((item) => item.date),
//                     datasets: [
//                       {
//                         label: 'Leads Created',
//                         data: data.daily_trends.map((item) => item.leads_created),
//                         borderColor: '#3b82f6',
//                         backgroundColor: 'rgba(59, 130, 246, 0.1)',
//                         tension: 0.4,
//                         fill: true,
//                         pointRadius: 4,
//                         pointHoverRadius: 8,
//                         pointBackgroundColor: '#3b82f6',
//                         pointBorderColor: '#ffffff',
//                         pointBorderWidth: 2,
//                       },
//                       {
//                         label: 'Leads Called',
//                         data: data.daily_trends.map((item) => item.leads_called),
//                         borderColor: '#f59e0b',
//                         backgroundColor: 'rgba(245, 158, 11, 0.1)',
//                         tension: 0.4,
//                         fill: true,
//                         pointRadius: 4,
//                         pointHoverRadius: 8,
//                         pointBackgroundColor: '#f59e0b',
//                         pointBorderColor: '#ffffff',
//                         pointBorderWidth: 2,
//                       },
//                       {
//                         label: 'Payments Made',
//                         data: data.daily_trends.map((item) => item.payments_made),
//                         borderColor: '#10b981',
//                         backgroundColor: 'rgba(16, 185, 129, 0.1)',
//                         tension: 0.4,
//                         fill: true,
//                         pointRadius: 4,
//                         pointHoverRadius: 8,
//                         pointBackgroundColor: '#10b981',
//                         pointBorderColor: '#ffffff',
//                         pointBorderWidth: 2,
//                       },
//                       {
//                         label: 'Revenue',
//                         data: data.daily_trends.map((item) => item.revenue),
//                         borderColor: '#ef4444',
//                         backgroundColor: 'rgba(239, 68, 68, 0.1)',
//                         tension: 0.4,
//                         fill: true,
//                         pointRadius: 4,
//                         pointHoverRadius: 8,
//                         pointBackgroundColor: '#ef4444',
//                         pointBorderColor: '#ffffff',
//                         pointBorderWidth: 2,
//                         yAxisID: 'revenueAxis',
//                       },
//                     ],
//                   }}
//                   options={{
//                     responsive: true,
//                     maintainAspectRatio: false,
//                     interaction: { mode: 'index', intersect: false },
//                     plugins: {
//                       legend: {
//                         position: 'top',
//                         labels: { usePointStyle: true, padding: 20 },
//                       },
//                       tooltip: {
//                         mode: 'index',
//                         intersect: false,
//                         backgroundColor: 'rgba(0, 0, 0, 0.8)',
//                         titleColor: '#ffffff',
//                         bodyColor: '#ffffff',
//                         borderColor: 'rgba(255, 255, 255, 0.1)',
//                         borderWidth: 1,
//                       },
//                     },
//                     scales: {
//                       y: {
//                         beginAtZero: true,
//                         title: { display: true, text: 'Counts', font: { weight: 'bold' } },
//                         ticks: { precision: 0 },
//                         grid: { color: 'rgba(0, 0, 0, 0.05)' },
//                       },
//                       revenueAxis: {
//                         position: 'right',
//                         beginAtZero: true,
//                         title: { display: true, text: 'Revenue (₹)', font: { weight: 'bold' } },
//                         grid: { drawOnChartArea: false },
//                         ticks: { precision: 0 },
//                       },
//                       x: { grid: { color: 'rgba(0, 0, 0, 0.05)' } },
//                     },
//                   }}
//                 />
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Footer */}
//         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
//           <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
//             <div className="flex items-center space-x-4">
//               <span>Last updated: {new Date().toLocaleString()}</span>
//               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
//                 Live Data
//               </span>
//             </div>
//             <div className="mt-2 sm:mt-0">
//               <span>Showing data for last 30 days</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

'use client';

import { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { axiosInstance } from '@/api/Axios';
import {
  Building2,
  Store,
  CalendarDays,
  Calendar,
  Eye,
  User,
  Users,
  Search,
  CheckCircle2,
  Info,
  BarChart3,
  MessageSquare,
  Briefcase,
  RotateCcw,
  SlidersHorizontal,
  AlertTriangle,
  LineChart,
  ClipboardList,
  Zap,
  Flame,
  Sparkles,
  IndianRupee,
  ArrowUpRight,
  CalendarCheck,
} from 'lucide-react';

/* -----------------------------
   Helpers
----------------------------- */
function safeJSON(str) { try { return JSON.parse(str); } catch { return null; } }
const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number(n || 0));
const num = (n) => Number(n || 0).toLocaleString('en-IN');

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

// Greeting logic (same behavior as the reference page)
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Hello';
}

/* -----------------------------
   Component
----------------------------- */
export default function Dashboard() {
  // user/auth
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = Cookies.get('user_info');
    if (raw) setUser(safeJSON(raw) || null);
  }, []);

  const roleName = (user?.role_name || '').toUpperCase();
  const isSuperAdmin = roleName === 'SUPERADMIN';
  const isBranchManager = roleName === 'BRANCH_MANAGER';
  const isEmployee = !isSuperAdmin && !isBranchManager;

  const userBranchId =
    user?.branch_id ??
    user?.user?.branch_id ??
    '';

  const myCode =
    user?.sub || user?.employee_code || user?.user?.employee_code || '';

  const displayName =
    user?.name ||
    user?.user?.name ||
    user?.username ||
    user?.user?.username ||
    'User';

  /* -----------------------------
     Filters
  ----------------------------- */
  const [days, setDays] = useState(30);
  const [view, setView] = useState('all'); // will be forced to 'team' for employees below
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // API-backed dropdowns
  const [sourceId, setSourceId] = useState('');
  const [responseId, setResponseId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // Users autocomplete (sends employee_code)
  const [employeeCode, setEmployeeCode] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const debUserSearch = useDebouncedValue(userSearch, 200);

  // Branch tabs: SA can change; others are locked
  const [branches, setBranches] = useState([]); // [{id, name}]
  const [branchTabId, setBranchTabId] = useState(''); // '' means All for SA

  // Load options + branches
  const [sources, setSources] = useState([]);
  const [responses, setResponses] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Raw users (from API)
  const [usersList, setUsers] = useState([]);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setOptLoading(true);
        setOptError('');

        const [
          srcRes,
          respRes,
          profRes,
          deptRes,
          usersRes,
          branchesRes,
        ] = await Promise.all([
          axiosInstance.get('/lead-config/sources', { params: { skip: 0, limit: 100 } }),
          axiosInstance.get('/lead-config/responses', { params: { skip: 0, limit: 100 } }),
          axiosInstance.get('/profile-role', { params: { skip: 0, limit: 50, order_by: 'hierarchy_level' } }),
          axiosInstance.get('/departments', { params: { skip: 0, limit: 50, order_by: 'name' } }),
          axiosInstance.get('/users', { params: { skip: 0, limit: 100, active_only: false } }),
          axiosInstance.get('/branches', { params: { skip: 0, limit: 100, active_only: false } }),
        ]);

        setSources((srcRes.data || []).map(s => ({ id: s.id, name: s.name })));
        setResponses((respRes.data || []).map(r => ({ id: r.id, name: r.name })));
        setProfiles((profRes.data || []).map(p => ({ id: p.id, name: p.name, lvl: p.hierarchy_level })));
        setDepartments((deptRes.data || []).map(d => ({ id: d.id, name: d.name })));

        // Keep fields needed for scoping
        const ulist = (usersRes.data?.data || []).map(u => ({
          employee_code: u.employee_code,
          name: u.name,
          email: u.email,
          phone: u.phone_number,
          role_name: u.profile_role?.name ?? String(u.role_id ?? ''),
          branch_id: u.branch_id,
          senior_code: u.senior_profile_id || null,
        }));
        setUsers(ulist);

        setBranches((branchesRes.data || []).map(b => ({ id: b.id, name: b.name })));
      } catch (e) {
        setOptError(e?.response?.data?.detail || e?.message || 'Failed to load filter options');
      } finally {
        setOptLoading(false);
      }
    })();
  }, [user]);

  // Force employees not to use 'all'
  useEffect(() => {
    if (isEmployee && view === 'all') setView('team');
  }, [isEmployee, view]);

  // Effective branch for queries:
  // - SA: branchTabId ('' = all)
  // - Others: locked to user's branch
  const effectiveBranchId = isSuperAdmin ? branchTabId : (userBranchId || '');

  /* ---------------------------------------------------
     Users scope: SA = all, BM = branch, Others = team
  --------------------------------------------------- */
  const allowedUsers = useMemo(() => {
    if (!usersList?.length) return [];

    if (isSuperAdmin) {
      return usersList;
    }

    if (isBranchManager) {
      return usersList.filter(u => String(u.branch_id) === String(userBranchId));
    }

    // Others: only their team (direct + indirect reports) + themselves
    const bySenior = usersList.reduce((m, u) => {
      if (!m[u.senior_code || '']) m[u.senior_code || ''] = [];
      m[u.senior_code || ''].push(u);
      return m;
    }, /** @type {Record<string, any[]>} */({}));

    const teamSet = new Set([myCode]); // include self
    const queue = [myCode];
    while (queue.length) {
      const lead = queue.shift();
      for (const child of (bySenior[lead] || [])) {
        if (!teamSet.has(child.employee_code)) {
          teamSet.add(child.employee_code);
          queue.push(child.employee_code);
        }
      }
    }
    return usersList.filter(u => teamSet.has(u.employee_code));
  }, [usersList, isSuperAdmin, isBranchManager, userBranchId, myCode]);

  // If selected employee goes out of scope, clear it
  useEffect(() => {
    if (employeeCode && !allowedUsers.some(u => u.employee_code === employeeCode)) {
      setEmployeeCode('');
      setUserSearch('');
    }
  }, [employeeCode, allowedUsers]);

  /* -----------------------------
     Dashboard data
  ----------------------------- */
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [data, setData] = useState(null);
  const [employeesTable, setEmployeesTable] = useState([]);

  const queryParams = useMemo(() => {
    const p = { days, view };
    if (fromDate) p.from_date = fromDate;
    if (toDate) p.to_date = toDate;
    if (effectiveBranchId) p.branch_id = Number(effectiveBranchId);
    if (employeeCode) p.employee_id = employeeCode;
    if (sourceId) p.source_id = Number(sourceId);
    if (responseId) p.response_id = Number(responseId);
    if (profileId) p.profile_id = Number(profileId);
    if (departmentId) p.department_id = Number(departmentId);
    return p;
  }, [days, view, fromDate, toDate, effectiveBranchId, employeeCode, sourceId, responseId, profileId, departmentId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setErrMsg('');
      const res = await axiosInstance.get('/analytics/leads/dashboard', { params: queryParams });
      setData(res.data || {});
    } catch (e) {
      setErrMsg(e?.response?.data?.detail || e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTable = async () => {
    try {
      setLoading(true);
      setErrMsg('');
      const res = await axiosInstance.get('/analytics/leads/users', { params: queryParams });
      setEmployeesTable(res.data || []);
    } catch (e) {
      setErrMsg(e?.response?.data?.detail || e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchDashboard();
    fetchUserTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryParams]);

  /* -----------------------------
     Users autocomplete (scoped)
  ----------------------------- */
  const filteredUsers = useMemo(() => {
    const q = debUserSearch.trim().toLowerCase();
    const list = allowedUsers || [];
    if (!q) return list.slice(0, 25);
    return list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.employee_code || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    ).slice(0, 25);
  }, [allowedUsers, debUserSearch]);

  /* -----------------------------
     UI
  ----------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">

        {/* Greeting header (only for Branch Manager & Employees) */}
        {!isSuperAdmin && (
          <div className="w-fit">
            <h1 className="text-3xl font-bold text-gray-900">
              {getGreeting()}, {displayName}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's your performance overview for the last {days} days
            </p>
          </div>
        )}

        {/* Branch Tabs (SA only) */}
        {isSuperAdmin && (
          <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              <Tab
                active={branchTabId === ''}
                onClick={() => setBranchTabId('')}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>All Branches</span>
                </div>
              </Tab>

              {(branches || []).map(b => (
                <Tab
                  key={b.id}
                  active={String(branchTabId) === String(b.id)}
                  onClick={() => setBranchTabId(b.id)}
                >
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>{b.name}</span>
                  </div>
                </Tab>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h3 className="text-lg font-semibold text-gray-800">Filter Options</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <Field label={<LabelWithIcon icon={<CalendarDays className="h-4 w-4" />} text="Time Period" />}>
              <select className="border-0 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {[7, 15, 30, 60, 90, 180, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}
              </select>
            </Field>

            <Field label={<LabelWithIcon icon={<Calendar className="h-4 w-4" />} text="From Date" />}>
              <input type="date" className="border-0 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Field>

            <Field label={<LabelWithIcon icon={<Calendar className="h-4 w-4" />} text="To Date" />}>
              <input type="date" className="border-0 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Field>

            {/* View Type: render for Branch Manager & Employees; hide for SuperAdmin */}
            {!isSuperAdmin && (
              <Field label={<LabelWithIcon icon={<Eye className="h-4 w-4" />} text="View Type" />}>
                <select
                  className="border-0 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                >
                  <option value="self">Self</option>
                  <option value="team">Team</option>
                  <option value="all" disabled={isEmployee}>All</option>
                </select>
              </Field>
            )}

            {/* Users Autocomplete (scoped) */}
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                <LabelWithIcon icon={<User className="h-4 w-4" />} text="User (Employee)" />
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  className="border-0 bg-white/80 backdrop-blur-sm rounded-xl pl-9 pr-4 py-3 w-full shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name / code / email / phone"
                />
                {userSearch && (
                  <div className="absolute z-30 bg-white/95 backdrop-blur-sm border border-white/50 rounded-xl mt-2 w-full max-h-64 overflow-auto shadow-xl">
                    {filteredUsers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">No users found</div>
                    ) : filteredUsers.map(u => (
                      <button
                        key={u.employee_code}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-blue-50/80 text-sm transition-colors border-b border-gray-100/50 last:border-b-0"
                        onClick={() => {
                          setEmployeeCode(u.employee_code);
                          setUserSearch(`${u.name} (${u.employee_code})`);
                        }}
                      >
                        <div className="font-medium text-gray-800">
                          {u.name} <span className="text-blue-600">({u.employee_code})</span>
                        </div>
                        <div className="text-xs text-gray-500">{u.role_name} • {u.email} • {u.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {employeeCode ? (
                <div className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Selected: {employeeCode}</span>
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  <span>No user selected</span>
                </div>
              )}
            </div>

            {/* Source */}
            <Field label={<LabelWithIcon icon={<BarChart3 className="h-4 w-4" />} text="Lead Source" />}>
              <select className="border-0 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">All Sources</option>
                {(sources || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>

            {/* Response */}
            <Field label={<LabelWithIcon icon={<MessageSquare className="h-4 w-4" />} text="Lead Response" />}>
              <select className="border-0 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={responseId} onChange={(e) => setResponseId(e.target.value)}>
                <option value="">All Responses</option>
                {(responses || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>

            {/* Profile (Role) – admin/BM only */}
            {(isSuperAdmin || isBranchManager) && (
              <Field label={<LabelWithIcon icon={<Briefcase className="h-4 w-4" />} text="Role (Profile)" />}>
                <select className="border-0 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                  <option value="">All Roles</option>
                  {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}

            {/* Department – admin/BM only */}
            {(isSuperAdmin || isBranchManager) && (
              <Field label={<LabelWithIcon icon={<Building2 className="h-4 w-4" />} text="Department" />}>
                <select className="border-0 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">All Departments</option>
                  {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            )}
          </div>

          {optLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600 mt-3">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Loading filter options…
            </div>
          )}
          {optError && <div className="text-sm text-red-600 mt-3 bg-red-50 px-3 py-2 rounded-lg">{optError}</div>}

          <div className="mt-6 flex gap-3">
            <button
              onClick={fetchDashboard}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Apply Filters</span>
            </button>
            <button
              onClick={() => {
                setSourceId('');
                setResponseId('');
                setProfileId('');
                setDepartmentId('');
                setEmployeeCode('');
                setUserSearch('');
                setFromDate('');
                setToDate('');
                setDays(30);
                setView(isEmployee ? 'team' : 'all');
                if (isSuperAdmin) setBranchTabId('');
              }}
              className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Errors */}
        {errMsg ? (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">{errMsg}</span>
            </div>
          </div>
        ) : null}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse shadow-lg" />
            ))}
          </div>
        )}

        {/* Cards */}
        {!!data && (
          <>
            <SectionHeader title="Payments Overview" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Total Paid" value={inr(data?.cards?.payments?.total_paid)} sub="PAID in window" icon={<IndianRupee className="h-5 w-5" />} color="green" />
              <Card title="Total Raised" value={inr(data?.cards?.payments?.total_raised)} sub="All rows" icon={<ArrowUpRight className="h-5 w-5" />} color="blue" />
              <Card title="Weekly Paid" value={inr(data?.cards?.payments?.weekly_paid)} icon={<CalendarCheck className="h-5 w-5" />} color="purple" />
              <Card title="Monthly Paid" value={inr(data?.cards?.payments?.monthly_paid)} icon={<CalendarDays className="h-5 w-5" />} color="indigo" />
            </div>

            <SectionHeader title="Leads Analytics" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Total Leads" value={num(data?.cards?.leads?.total_uploaded)} icon={<BarChart3 className="h-5 w-5" />} color="blue" />
              <Card title="This Week" value={num(data?.cards?.leads?.this_week)} icon={<Zap className="h-5 w-5" />} color="green" />
              <Card title="This Month" value={num(data?.cards?.leads?.this_month)} icon={<Flame className="h-5 w-5" />} color="orange" />
              <Card title="Clients / FT" value={`${num(data?.cards?.leads?.total_clients)} / ${num(data?.cards?.leads?.total_ft)}`} icon={<Users className="h-5 w-5" />} color="purple" />
              <Card title="Old Leads" value={num(data?.cards?.leads?.old_leads)} icon={<ClipboardList className="h-5 w-5" />} color="gray" />
              <Card title="Fresh Leads" value={num(data?.cards?.leads?.fresh_leads)} icon={<Sparkles className="h-5 w-5" />} color="emerald" />
            </div>
          </>
        )}

        {/* Top performers */}
        {!!data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {isSuperAdmin ? (
              <TableWrap title="Top Branches (Revenue)" icon={<Building2 className="h-5 w-5" />}>
                <div className="h-72 overflow-y-auto pr-1">
                  <SimpleTable
                    cols={['Branch', 'Revenue', 'Paid Count', 'Conversion %']}
                    rows={(data?.top?.branches || []).map((b) => [
                      b.branch_name,
                      inr(b.revenue),
                      num(b.paid_count),
                      `${b.conversion_rate}%`,
                    ])}
                  />
                </div>
              </TableWrap>
            ) : <div className="hidden lg:block" />}

            <TableWrap title={`Top Employees (${isEmployee ? 'Team (Top 5)' : 'Top 10'})`} icon={<Users className="h-5 w-5" />}>
              <div className="h-72 overflow-y-auto pr-1">
                <SimpleTable
                  cols={['Employee', 'Role', 'Leads', 'Converted', 'Revenue', 'Conv %']}
                  rows={(data?.top?.employees || []).map((e) => [
                    `${e.employee_name} (${e.employee_code})`,
                    e.role_name || e.role_id,
                    num(e.total_leads),
                    num(e.converted_leads),
                    inr(e.total_revenue),
                    `${e.conversion_rate}%`,
                  ])}
                />
              </div>
            </TableWrap>
          </div>
        )}

        {/* Profiles (admin & BM only) */}
        {!!data && (isSuperAdmin || isBranchManager) && (
          <div className="grid grid-cols-1 gap-6">
            <TableWrap title="Profile-wise Analysis" icon={<Briefcase className="h-5 w-5" />}>
              <SimpleTable
                cols={['Profile', 'Leads', 'Paid Revenue']}
                rows={(data?.breakdowns?.profile_wise || []).map((p) => {
                  const prof = profiles.find(x => x.id === p.profile_id);
                  return [
                    prof?.name || (p.profile_id ?? '—'),
                    num(p.total_leads),
                    inr(p.paid_revenue),
                  ];
                })}
              />
            </TableWrap>
          </div>
        )}

        {/* Users table */}
        {!!employeesTable && (
          <TableWrap
            title={`Users Performance (${isEmployee ? 'Your Team' : 'All (scoped)'})`}
            icon={<LineChart className="h-5 w-5" />}
          >
            {/* Inline filters for Users Performance */}
            <div className="mb-4 space-y-3">
              {/* 2) Inline row: From / To / Days + Apply / Clear */}
              <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
                {/* From Date */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    className="h-10 w-full border border-gray-200 bg-white rounded-lg px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>

                {/* To Date */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    className="h-10 w-full border border-gray-200 bg-white rounded-lg px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>

                {/* Days */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Days</label>
                  <select
                    className="h-10 w-full border border-gray-200 bg-white rounded-lg px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                      <option key={d} value={d}>Last {d} days</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="md:col-span-2 flex md:justify-end gap-2">
                  <button
                    onClick={fetchUserTable}
                    className="h-10 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow hover:shadow-md"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                      setDays(30);
                      fetchUserTable(); // <-- re-fetch with cleared dates
                    }}
                    className="h-10 px-4 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>


            {/* Table */}
            <SimpleTable
              cols={['Employee', 'Role', 'Leads', 'Converted', 'Revenue']}
              rows={(employeesTable || []).map((u) => [
                `${u.employee_name} (${u.employee_code})`,
                u.role_name || u.role_id,
                num(u.total_leads),
                num(u.converted_leads),
                inr(u.total_revenue),
              ])}
            />
          </TableWrap>
        )}

      </div>
    </div>
  );
}

/* -----------------------------
   Enhanced UI Components
----------------------------- */
function LabelWithIcon({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span>{text}</span>
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
    </div>
  );
}

const colorVariants = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-200',
  green: 'from-emerald-500 to-green-600 shadow-emerald-200',
  purple: 'from-purple-500 to-purple-600 shadow-purple-200',
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
  orange: 'from-orange-500 to-orange-600 shadow-orange-200',
  gray: 'from-gray-500 to-gray-600 shadow-gray-200',
  emerald: 'from-emerald-400 to-teal-500 shadow-emerald-200',
};

function Card({ title, value, sub, icon, color = 'blue' }) {
  const gradientClass = colorVariants[color] || colorVariants.blue;

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-1">
        <div className="text-sm font-medium text-gray-600">{title}</div>
        <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-1">{value ?? '—'}</div>
      {sub ? <div className="text-xs text-gray-500 font-medium">{sub}</div> : null}
    </div>
  );
}

function TableWrap({ title, children, icon }) {
  return (
    <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        {icon && <span className="text-xl">{icon}</span>}
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SimpleTable({ cols = [], rows = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
            {cols.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold text-gray-700 text-left border-b-2 border-gray-200 first:rounded-tl-xl last:rounded-tr-xl">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-gray-400 text-center" colSpan={cols.length}>
                <div className="flex flex-col items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>No data available</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                {r.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-gray-700">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105',
        active
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-blue-600'
          : 'bg-white/80 text-gray-700 border border-white/50 hover:bg-white shadow-md hover:shadow-lg'
      ].join(' ')}
    >
      {children}
    </button>
  );
}




