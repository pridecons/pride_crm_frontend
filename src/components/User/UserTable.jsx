"use client";

import PropTypes from "prop-types";
import { User, Phone, Mail, Edit, Trash2, Eye } from "lucide-react";

export default function UserTable({ users = [], branchMap = {}, onEdit, onDelete, onDetails }) {
    const getRoleColorClass = (role) => {
        const roleColors = {
            SUPERADMIN: "text-blue-800",
            "BRANCH MANAGER": "text-red-700",
            "SALES MANAGER": "text-green-800",
            HR: "text-pink-800",
            TL: "text-yellow-800",
            SBA: "text-indigo-800",
            BA: "text-gray-800",
        };
             
        return roleColors[role] || "bg-gray-100 text-gray-700 border border-gray-200";
    };
    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200">
            <div className="overflow-x-auto">
                <table className="table-fixed w-full text-sm text-gray-700">
                    {/* Sticky Header */}
                    <thead className="bg-gray-100 border-b sticky top-0 z-10">
                        <tr>
                            <th className="w-12 px-5 py-4 text-left font-semibold">#</th>
                            <th className="w-56 px-5 py-4 text-left font-semibold">Name</th>
                            <th className="w-40 px-5 py-4 text-left font-semibold">Role</th>
                            <th className="w-40 px-5 py-4 text-left font-semibold">Branch</th>
                            <th className="w-44 px-5 py-4 text-left font-semibold">Phone</th>
                            <th className="w-64 px-5 py-4 text-left font-semibold">Email</th>
                            <th className="w-28 px-5 py-4 text-left font-semibold">Status</th>
                            <th className="w-36 px-5 py-4 text-center font-semibold">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {users.length > 0 ? (
                            users.map((u, index) => (
                                <tr
                                    key={u.employee_code}
                                    className="hover:bg-gray-50 transition duration-200 ease-in-out"
                                >
                                    <td className="px-5 py-4">{index + 1}</td>

                                    {/* Name */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-blue-100 flex items-center justify-center rounded-full">
                                                <User className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <span className="font-medium text-gray-800 truncate">{u.name}</span>
                                        </div>
                                    </td>

                                    {/* Role */}
                                    <td className="px-5 py-4">
                                        <span
                                            className={`py-0.5 rounded-full text-xs font-semibold ${getRoleColorClass(u.role)}`}
                                        >
                                            {u.role}
                                        </span>
                                    </td>

                                    {/* Branch */}
                                    <td className="px-5 py-4 truncate">{branchMap[u.branch_id] || "—"}</td>

                                    {/* Phone */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            {u.phone_number}
                                        </div>
                                    </td>

                                    {/* Email */}
                                    <td className="px-5 py-4 truncate max-w-[240px]">
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{u.email}</span>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-5 py-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${u.is_active
                                                ? "bg-green-100 text-green-700 border border-green-200"
                                                : "bg-red-100 text-red-700 border border-red-200"
                                                }`}
                                        >
                                            {u.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex justify-center gap-3">
                                            {onDetails && (
                                                <button
                                                    onClick={() => onDetails(u)}
                                                    className="p-2 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(u)}
                                                    className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                                    title="Edit User"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(u.employee_code)}
                                                    className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="px-5 py-8 text-center text-gray-500">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {users.length > 0 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-sm text-gray-600 text-center">
                    Showing {users.length} user{users.length > 1 ? "s" : ""}
                </div>
            )}
        </div>
    );
}

UserTable.propTypes = {
    users: PropTypes.array.isRequired,
    branchMap: PropTypes.object,
    onEdit: PropTypes.func,
    onDelete: PropTypes.func,
    onDetails: PropTypes.func,
};
