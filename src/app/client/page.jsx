"use client";

import { useEffect, useState } from "react";

import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";

export default function ClientsPage() {
    const [role, setRole] = useState(null);
    const [branchId, setBranchId] = useState(null);

    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);

    const [clients, setClients] = useState([]);
    const [myClients, setMyClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ Move userInfo here so it's accessible everywhere
    const userInfo = JSON.parse(Cookies.get("user_info") || "{}");

    useEffect(() => {
        setRole(userInfo.role);
        setBranchId(userInfo.branch_id);

        if (userInfo.role === "SUPERADMIN") {
            fetchBranches();
            fetchClients(); // all clients
        } else if (userInfo.role === "BRANCH MANAGER") {
            fetchClients(userInfo.branch_id); // filtered by branch
        } else {
            fetchMyClients();
        }
    }, []);

    useEffect(() => {
        const userInfo = JSON.parse(Cookies.get("user_info") || "{}");
        setRole(userInfo.role);
        setBranchId(userInfo.branch_id);

        if (userInfo.role === "SUPERADMIN") {
            fetchBranches();
            fetchClients(); // initially all
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
            console.log("User Info:", userInfo);
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

    const handleBranchChange = (e) => {
        const selected = e.target.value;
        setSelectedBranch(selected);
        fetchClients(selected);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {role === "SUPERADMIN" && (
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Filter by Branch:
                        </label>
                        <select
                            value={selectedBranch || ""}
                            onChange={handleBranchChange}
                            className="block w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                            <option value="">All Branches</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <LoadingState message="Loading Clients" />
                ) : role === "SUPERADMIN" || role === "BRANCH MANAGER" ? (
                    /* Cards View for Admins/Managers */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clients.map((client) => (
                            <div
                                key={client.lead_id}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
                            >
                                <div className="space-y-3">
                                    <div className="border-b border-gray-100 pb-3">
                                        <h3 className="font-semibold text-lg text-gray-900">{client.full_name}</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center text-sm">
                                            <span className="text-gray-500 w-24">Email:</span>
                                            <span className="text-gray-700 truncate">{client.email}</span>
                                        </div>

                                        <div className="flex items-center text-sm">
                                            <span className="text-gray-500 w-24">Mobile:</span>
                                            <span className="text-gray-700">{client.mobile}</span>
                                        </div>

                                        <div className="flex items-center text-sm">
                                            <span className="text-gray-500 w-24">City:</span>
                                            <span className="text-gray-700">{client.city}</span>
                                        </div>

                                        <div className="flex items-center text-sm">
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
                        ))}
                    </div>
                ) : (
                    /* Table View for Regular Users */
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mobile
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            City
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Occupation
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Investment
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Services
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Payment
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {myClients.map((client, index) => (
                                        <tr
                                            key={client.id}
                                            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                        >
                                            <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {client.full_name}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {client.email}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {client.mobile}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {client.city}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {client.occupation}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                ₹{client.investment}
                                            </td>
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
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
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
                    </div>
                )}

                {/* Empty State */}
                {!loading && ((role === "SUPERADMIN" || role === "BRANCH MANAGER") ? clients.length === 0 : myClients.length === 0) && (
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
                            {selectedBranch ? "Try selecting a different branch." : "Get started by adding your first client."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}