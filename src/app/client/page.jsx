"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";

export default function ClientsPage() {
    const [role, setRole] = useState(null);
    const [branchId, setBranchId] = useState(null);
    const [branches, setBranches] = useState([]);
    const [clients, setClients] = useState([]);
    const [myClients, setMyClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("card"); // NEW: card | table

    const userInfo = JSON.parse(Cookies.get("user_info") || "{}");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = Cookies.get("access_token");
                let url = "/analytics/leads/admin/dashboard?days=30";

                if ((role === "BRANCH MANAGER" || role === "SUPERADMIN") && branchId) {
                    url += `&branch_id=${branchId}`;
                }

                const res = await axiosInstance.get(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log("Source analytics:", res.data.source_analytics);
            } catch (err) {
                console.error("Failed to load dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        if (role) fetchData();
    }, [role, branchId]);

    useEffect(() => {
        setRole(userInfo.role);
        setBranchId(userInfo.branch_id);

        if (userInfo.role === "SUPERADMIN") {
            fetchBranches();
            fetchClients();
        } else if (userInfo.role === "BRANCH MANAGER") {
            fetchClients(userInfo.branch_id);
        } else {
            fetchMyClients();
        }
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await axiosInstance.get("/branches/?skip=0&limit=100&active_only=false");
            setBranches(res.data || []);
        } catch (err) {
            console.error("Failed to fetch branches:", err);
        }
    };

    const fetchClients = async (branch = null) => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(
                `/clients/?page=1&limit=100${branch ? `&branch_id=${branch}` : ""}`
            );
            setClients(res.data.clients || []);
        } catch (err) {
            console.error("Error fetching clients:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyClients = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/clients/my-clients?limit=100");
            setMyClients(res.data || []);
        } catch (err) {
            console.error("Error fetching my clients:", err);
        } finally {
            setLoading(false);
        }
    };

    const renderClientCard = (client) => (
        <div
            key={client.lead_id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
        >
            <div className="space-y-3">
                <div className="border-b border-gray-100 pb-3">
                    <h3 className="font-semibold text-lg text-gray-900">{client.full_name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex">
                        <span className="text-gray-500 w-24">Email:</span>
                        <span className="text-gray-700 truncate">{client.email}</span>
                    </div>
                    <div className="flex">
                        <span className="text-gray-500 w-24">Mobile:</span>
                        <span className="text-gray-700">{client.mobile}</span>
                    </div>
                    <div className="flex">
                        <span className="text-gray-500 w-24">City:</span>
                        <span className="text-gray-700">{client.city}</span>
                    </div>
                    <div className="flex">
                        <span className="text-gray-500 w-24">Branch:</span>
                        <span className="text-gray-700">{client.branch_name}</span>
                    </div>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500">Total Paid</p>
                            <p className="text-lg font-semibold text-green-600">₹{client.total_amount_paid}</p>
                        </div>
                        {client?.latest_payment?.mode && (
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Payment Mode</p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {client.latest_payment.mode}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {(role === "SUPERADMIN" || role === "BRANCH MANAGER") && (
                        <div className=" mb-4">
                            {/* <div className="inline-flex rounded-md shadow-sm" role="group"> */}
                            <button
                                type="button"
                                className={`px-4 py-3 text-sm font-medium border ${view === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} border-gray-300 rounded-l-lg hover:bg-gray-100`}
                                onClick={() => setView("card")}
                            >
                                Card View
                            </button>
                            <button
                                type="button"
                                className={`px-4 py-3 text-sm font-medium border ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} border-gray-300 rounded-r-lg hover:bg-gray-100`}
                                onClick={() => setView("table")}
                            >
                                Table View
                            </button>
                            {/* </div> */}
                        </div>
                    )}
                <div className="flex justify-between items-center">
                    {/* SUPERADMIN Branch Selector */}
                    {role === "SUPERADMIN" && (
                        <div className="flex flex-col space-y-2 w-full md:w-auto mb-6">
                            <label className="text-sm font-semibold text-gray-700 mb-1">
                                Select Branch
                            </label>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => {
                                        if (branchId !== null) {
                                            setBranchId(null);
                                            fetchClients(null);
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-700 text-white border-blue-700 hover:brightness-110 ${!branchId ? 'shadow-md ring-2 ring-blue-300' : ''}`}
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
                                    ];
                                    const colorClass = colors[index % colors.length];
                                    const isActive = branchId == branch.id;

                                    return (
                                        <button
                                            key={branch.id}
                                            onClick={() => {
                                                if (branchId !== branch.id) {
                                                    setBranchId(branch.id);
                                                    fetchClients(branch.id);
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold border text-white transition-all duration-200 bg-gradient-to-r ${colorClass} hover:brightness-110 ${isActive ? 'shadow-md ring-2 ring-offset-1 ring-white' : ''}`}
                                        >
                                            {branch.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {/* View Toggle Buttons */}
                  
                    {(role === "SUPERADMIN" || role === "BRANCH MANAGER") && (
                        <div className="flex justify-end mb-4">
                           <button>View Comments</button>
                           <button>View Story</button>
                           <button>View invoice</button>
                        </div>
                    )}

                </div>


                {/* Loading State */}
                {loading ? (
                    <LoadingState message="Loading Clients" />
                ) : role === "SUPERADMIN" || role === "BRANCH MANAGER" ? (
                    view === "card" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {clients.map((client) => renderClientCard(client))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {clients.map((client) => (
                                        <tr key={client.lead_id}>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.full_name}</td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">{client.email}</td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">{client.mobile}</td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">{client.city}</td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">{client.branch_name}</td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-green-600">₹{client.total_amount_paid}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    // My Clients Table (default for other roles)
                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupation</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Payment</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {myClients.map((client, index) => (
                                    <tr key={client.id}>
                                        <td className="px-5 py-4 text-sm font-medium text-gray-900">{client.full_name}</td>
                                        <td className="px-5 py-4 text-sm text-gray-700">{client.email}</td>
                                        <td className="px-5 py-4 text-sm text-gray-700">{client.mobile}</td>
                                        <td className="px-5 py-4 text-sm text-gray-700">{client.city}</td>
                                        <td className="px-5 py-4 text-sm text-gray-700">{client.occupation}</td>
                                        <td className="px-5 py-4 text-sm font-medium text-green-600">₹{client.investment}</td>
                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            <div className="flex flex-wrap gap-1">
                                                {client.services?.map((service, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                                                    >
                                                        {service}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {new Date(client.last_payment).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Empty State */}
                {!loading &&
                    ((role === "SUPERADMIN" || role === "BRANCH MANAGER") ? clients.length === 0 : myClients.length === 0) && (
                        <div className="text-center py-12">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {branchId ? "Try selecting a different branch." : "Get started by adding your first client."}
                            </p>
                        </div>
                    )}
            </div>
        </div>
    );
}
