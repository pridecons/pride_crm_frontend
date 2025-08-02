"use client";

import { useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";
import { ArrowDownToLine } from "lucide-react";

const incrementModalCount = () => {
    const current = parseInt(document.body.dataset.modalOpenCount || "0", 10);
    const next = current + 1;
    document.body.dataset.modalOpenCount = String(next);
    if (next === 1) {
        // prevent layout shift when scrollbar disappears
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = `${scrollBarWidth}px`;
        document.body.style.overflow = "hidden";
    }
};

const decrementModalCount = () => {
    const current = parseInt(document.body.dataset.modalOpenCount || "1", 10);
    const next = Math.max(current - 1, 0);
    document.body.dataset.modalOpenCount = String(next);
    if (next === 0) {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
    }
};

export default function BulkUploadModal({ isOpen, onClose, branches }) {
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        incrementModalCount();
        return () => {
            decrementModalCount();
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            setUploading(true);
            const { data } = await axiosInstance.post("/bulk-leads/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUploadResult(data);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload CSV");
        } finally {
            setUploading(false);
        }
    };

    // Helper function to generate CSV from errors array
    const downloadErrorsAsCSV = () => {
        if (!uploadResult?.errors?.length) return;

        // Prepare headers
        const headers = [
            "Row",
            "Existing Lead ID",
            "Name",
            "Mobile",
            "Email",
            "City",
            "Address",
            "Segment",
            "Occupation",
            "Investment",
            "Errors"
        ];

        // Map errors to CSV rows
        const csvRows = [
            headers,
            ...uploadResult.errors.map((err) => [
                err.row,
                err.existing_lead_id || "",
                ...(err.data || []),
                Array.isArray(err.errors) ? err.errors.join("; ") : (err.errors || "")
            ])
        ];

        // Convert to CSV string
        const csvContent = csvRows
            .map((row) =>
                row
                    .map((val) =>
                        val == null
                            ? ""
                            : typeof val === "string" && val.includes(",")
                                ? `"${val.replace(/"/g, '""')}"`
                                : val
                    )
                    .join(",")
            )
            .join("\r\n");

        // Download as file
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "duplicate_or_error_rows.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Bulk Lead Upload</h2>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
                    {/* Form Section */}
                    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* File Upload Area */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="text-blue-600">📁</span> Select CSV File
                                </h3>
                                <div className="relative">
                                    <input
                                        type="file"
                                        name="csv_file"
                                        accept=".csv"
                                        required
                                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>
                            </div>

                            {/* Column Mapping */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="text-blue-600">🔗</span> Column Mapping
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">Map your CSV columns to lead fields (enter column numbers)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { name: "name_column", label: "Name Column", icon: "👤" },
                                        { name: "mobile_column", label: "Mobile Column", icon: "📱" },
                                        { name: "email_column", label: "Email Column", icon: "✉️" },
                                        { name: "address_column", label: "Address Column", icon: "📍" },
                                        { name: "city_column", label: "City Column", icon: "🏙️" },
                                        { name: "segment_column", label: "Segment Column", icon: "🎯" },
                                        { name: "occupation_column", label: "Occupation Column", icon: "💼" },
                                        { name: "investment_column", label: "Investment Column", icon: "💰" },
                                    ].map(({ name, label, icon }) => (
                                        <div key={name} className="group">
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                <span className="text-lg">{icon}</span>
                                                {label}
                                            </label>
                                            <input
                                                type="number"
                                                name={name}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 group-hover:border-gray-400"
                                                placeholder="Column number"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Configuration */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="text-blue-600">⚙️</span> Configuration
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <span className="text-lg">🏢</span>
                                            Select Branch
                                        </label>
                                        <select
                                            name="branch_id"
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 group-hover:border-gray-400"
                                        >
                                            <option value="">Choose a branch...</option>
                                            {branches.map((branch) => (
                                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="group">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <span className="text-lg">🔖</span>
                                            Lead Source ID
                                        </label>
                                        <input
                                            type="text"
                                            name="lead_source_id"
                                            defaultValue="1"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 group-hover:border-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <span>Upload CSV</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Results Section */}
                    <div className="w-full lg:w-96 bg-white border-l border-gray-200 p-8 overflow-y-auto">
                        <div className="sticky top-0 bg-white pb-4">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="text-blue-600">📊</span> Upload Summary
                            </h3>
                        </div>

                        {uploadResult ? (
                            <div className="space-y-4">
                                {/* Success Stats */}
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-green-800 font-semibold">Success Rate</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            {uploadResult.total_rows
                                                ? Math.round((uploadResult.successful_uploads / uploadResult.total_rows) * 100)
                                                : 0}
                                            %
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Total Rows</span>
                                            <span className="font-semibold text-gray-800">{uploadResult.total_rows ?? 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Successfully Uploaded</span>
                                            <span className="font-semibold text-green-600">{uploadResult.successful_uploads ?? 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Duplicates Skipped</span>
                                            <span className="font-semibold text-yellow-600">{uploadResult.duplicates_skipped ?? 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Errors</span>
                                            <span className="font-semibold text-red-600">{uploadResult?.errors?.length ?? 0}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Error Details */}
                                {uploadResult?.errors?.length > 0 && (
                                    <div className="bg-red-50 rounded-xl p-5 border border-red-200">
                                        <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Error Details
                                        </h4>
                                        <div className="max-h-64 overflow-y-auto bg-white rounded-lg p-3 border border-red-200">
                                            <ul className="space-y-2">
                                                {uploadResult?.errors?.map((err, idx) => (
                                                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                                        <span className="text-red-500 font-semibold shrink-0">Row {err.row}:</span>
                                                        <span className="text-gray-600">
                                                            {Array.isArray(err.errors) ? err.errors.join(", ") : "Unknown error"}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-xl p-8 text-center">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 font-medium">No upload results yet</p>
                                <p className="text-sm text-gray-400 mt-2">Submit a CSV file to see the upload summary here</p>
                            </div>
                        )}

                        {/* Download Button */}
                        {uploadResult?.errors?.length > 0 && (
                            <button
                                onClick={downloadErrorsAsCSV}
                                className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                                type="button"
                            >
                                <ArrowDownToLine className="w-5 h-5" />
                                Download Duplicate/Error Rows
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
