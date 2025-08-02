"use client";
import React, { useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";

const DEFAULT_LIMIT = 100;

export default function PaymentHistoryPage() {
    // Filters
    const [service, setService] = useState("");
    const [plan, setPlan] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone_number, setPhoneNumber] = useState("");
    const [status, setStatus] = useState("");
    const [mode, setMode] = useState("");
    const [user_id, setUserId] = useState("");
    const [branch_id, setBranchId] = useState("");
    const [lead_id, setLeadId] = useState("");
    const [order_id, setOrderId] = useState("");
    const [date_from, setDateFrom] = useState("");
    const [date_to, setDateTo] = useState("");
    const [limit, setLimit] = useState(DEFAULT_LIMIT);
    const [offset, setOffset] = useState(0);

    // Data and states
    const [loading, setLoading] = useState(false);
    const [payments, setPayments] = useState([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState("");
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        // Fetch branches only once on mount
        async function fetchBranches() {
            try {
                const { data } = await axiosInstance.get("/branches/");
                // Adjust if your API returns data in a different structure
                setBranches(data.branches || data || []);
            } catch (err) {
                setBranches([]);
            }
        }
        fetchBranches();
    }, []);


    // Fetch payments
    const fetchPayments = async () => {
        setLoading(true);
        setError("");
        try {
            const params = {
                service,
                plan,
                name,
                email,
                phone_number,
                status,
                mode,
                user_id,
                branch_id,
                lead_id: lead_id ? Number(lead_id) : undefined,
                order_id,
                date_from,
                date_to,
                limit,
                offset,
            };
            // Remove empty filters
            Object.keys(params).forEach(
                (k) =>
                    (params[k] === "" || params[k] == null) &&
                    delete params[k]
            );

            const { data } = await axiosInstance.get(
                "/payment/all/employee/history",
                { params }
            );

            setPayments(data.payments || []);
            setTotal(data.total || 0);
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                err.message ||
                "Failed to fetch payment history."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
        // eslint-disable-next-line
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setOffset(0);
        fetchPayments();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">All Employee Payment History</h2>

            {/* Filters */}
            <form
                onSubmit={handleSearch}
                className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4"
            >
                <input
                    className="input"
                    type="text"
                    placeholder="Service"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="Plan"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="Phone"
                    value={phone_number}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="Mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="User ID"
                    value={user_id}
                    onChange={(e) => setUserId(e.target.value)}
                />
                <select
                    className="input"
                    value={branch_id}
                    onChange={(e) => setBranchId(e.target.value)}
                >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name || b.branch_name || `Branch ${b.id}`}
                        </option>
                    ))}
                </select>
                <input
                    className="input"
                    type="number"
                    placeholder="Lead ID"
                    value={lead_id}
                    onChange={(e) => setLeadId(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="Order ID"
                    value={order_id}
                    onChange={(e) => setOrderId(e.target.value)}
                />
                <input
                    className="input"
                    type="date"
                    placeholder="Date From"
                    value={date_from}
                    onChange={(e) => setDateFrom(e.target.value)}
                />
                <input
                    className="input"
                    type="date"
                    placeholder="Date To"
                    value={date_to}
                    onChange={(e) => setDateTo(e.target.value)}
                />
                <input
                    className="input"
                    type="number"
                    placeholder="Limit"
                    min={1}
                    max={500}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                />
                <input
                    className="input"
                    type="number"
                    placeholder="Offset"
                    min={0}
                    value={offset}
                    onChange={(e) => setOffset(Number(e.target.value))}
                />

                <button
                    type="submit"
                    className="col-span-full md:col-span-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Search
                </button>
            </form>

            {/* Results */}
            {loading && <div>Loading...</div>}
            {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 rounded px-4 py-2 mb-4">
                    {error}
                </div>
            )}

            {!loading && !error && payments.length === 0 && (
                <div className="text-gray-500 text-center py-10">No records found.</div>
            )}

            {!loading && !error && payments.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg shadow text-sm">
                        <thead>
                            <tr>
                                <th className="py-2 px-3 border-b font-semibold">#</th>
                                <th className="py-2 px-3 border-b font-semibold">Order ID</th>
                                <th className="py-2 px-3 border-b font-semibold">Name</th>
                                <th className="py-2 px-3 border-b font-semibold">Email</th>
                                <th className="py-2 px-3 border-b font-semibold">Phone</th>
                                <th className="py-2 px-3 border-b font-semibold">Service</th>
                                <th className="py-2 px-3 border-b font-semibold">Plan(s)</th>
                                <th className="py-2 px-3 border-b font-semibold">Amount</th>
                                <th className="py-2 px-3 border-b font-semibold">Status</th>
                                <th className="py-2 px-3 border-b font-semibold">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p, idx) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="py-2 px-3">{offset + idx + 1}</td>
                                    <td className="py-2 px-3">{p.order_id}</td>
                                    <td className="py-2 px-3">{p.name}</td>
                                    <td className="py-2 px-3">{p.email}</td>
                                    <td className="py-2 px-3">{p.phone_number}</td>
                                    <td className="py-2 px-3">{p.Service}</td>
                                    <td className="py-2 px-3">
                                        {Array.isArray(p.plan)
                                            ? p.plan.map((pl) => (
                                                <div key={pl.id} className="mb-1">
                                                    <span className="font-semibold">{pl.name}</span>
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        {pl.description}
                                                    </span>
                                                </div>
                                            ))
                                            : "-"}
                                    </td>
                                    <td className="py-2 px-3 font-semibold">
                                        ₹{p.paid_amount}
                                    </td>
                                    <td className="py-2 px-3">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${p.status === "PAID"
                                                    ? "bg-green-100 text-green-700"
                                                    : p.status === "ACTIVE"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : p.status === "PENDING"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3">
                                        {new Date(p.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Pagination */}
                    <div className="flex justify-between items-center py-4">
                        <span className="text-gray-600">
                            Showing {offset + 1}-{offset + payments.length} of {total}
                        </span>
                        <div>
                            <button
                                onClick={() => {
                                    if (offset > 0) {
                                        setOffset(Math.max(0, offset - limit));
                                    }
                                }}
                                disabled={offset === 0}
                                className="mr-2 px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-60"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => {
                                    if (offset + limit < total) {
                                        setOffset(offset + limit);
                                    }
                                }}
                                disabled={offset + limit >= total}
                                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-60"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
        .input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: #f9fafb;
          color: #222;
          outline: none;
          transition: border 0.2s;
        }
        .input:focus {
          border-color: #2563eb;
          background: #fff;
        }
      `}</style>
        </div>
    );
}
