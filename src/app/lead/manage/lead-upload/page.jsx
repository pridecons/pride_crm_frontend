"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { axiosInstance } from "@/api/Axios";
import {
  ArrowDownToLine,
  X,
  Search,
  Database,
} from "lucide-react";

export default function BulkUploadPage() {
  const router = useRouter();

  // state
  const [branches, setBranches] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // fetch branches on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get(
          "/branches/?skip=0&limit=100&active_only=false"
        );
        setBranches(data);
      } catch (err) {
        console.error("Failed to load branches:", err);
      }
    })();
  }, []);

  // submit CSV
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      setUploading(true);
      const { data } = await axiosInstance.post(
        "/bulk-leads/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setUploadResult(data);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  // download error rows as CSV
  const downloadErrorsAsCSV = () => {
    if (!uploadResult?.errors?.length) return;

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
      "Errors",
    ];
    const rows = uploadResult.errors.map((err) => [
      err.row,
      err.existing_lead_id || "",
      ...(err.data || []),
      Array.isArray(err.errors) ? err.errors.join("; ") : err.errors || "",
    ]);

    const csvContent =
      [headers, ...rows]
        .map((r) =>
          r
            .map((v) => {
              if (v == null) return "";
              const s = String(v).replace(/"/g, '""');
              return s.includes(",") ? `"${s}"` : s;
            })
            .join(",")
        )
        .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "duplicate_or_error_rows.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Upload Form */}
        <div className="flex-1 bg-white rounded-2xl shadow p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CSV File */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600">📁</span>
                Select CSV File
              </h2>
              <input
                type="file"
                name="csv_file"
                accept=".csv"
                required
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition cursor-pointer"
              />
            </section>

            {/* Column Mapping */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600">🔗</span>
                Column Mapping
              </h2>
              <p className="text-sm text-gray-600">
                Enter column numbers for each field
              </p>
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
                  <div key={name} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="text-lg">{icon}</span>
                      {label}
                    </label>
                    <input
                      type="number"
                      name={name}
                      placeholder="Column #"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Configuration */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600">⚙️</span>
                Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="text-lg">🏢</span>
                    Select Branch
                  </label>
                  <select
                    name="branch_id"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                  >
                    <option value="">Choose a branch…</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="text-lg">🔖</span>
                    Lead Source ID
                  </label>
                  <input
                    type="text"
                    name="lead_source_id"
                    defaultValue="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* Submit */}
            <button
              type="submit"
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition"
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-5 h-5" />
                  Upload CSV
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Results */}
        <div className="w-full lg:w-96 bg-white rounded-2xl shadow p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-blue-600">📊</span> Upload Summary
          </h2>

          {!uploadResult ? (
            <div className="text-center text-gray-500 mt-12">
              <Database className="mx-auto mb-4 w-16 h-16 text-gray-300" />
              <p className="font-medium">No upload results yet</p>
              <p className="text-sm">Submit a CSV to see the summary here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex justify-between mb-3">
                  <span className="font-semibold text-green-800">Success Rate</span>
                  <span className="text-2xl font-bold text-green-600">
                    {uploadResult.total_rows
                      ? Math.round(
                          (uploadResult.successful_uploads /
                            uploadResult.total_rows) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                {[
                  ["Total Rows", uploadResult.total_rows],
                  ["Successfully Uploaded", uploadResult.successful_uploads],
                  ["Duplicates Skipped", uploadResult.duplicates_skipped],
                  ["Errors", uploadResult.errors?.length],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex justify-between text-sm text-gray-700"
                  >
                    <span>{label}</span>
                    <span className="font-semibold">
                      {val ?? 0}
                    </span>
                  </div>
                ))}
              </div>

              {/* Errors */}
              {uploadResult.errors?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <h3 className="flex items-center gap-2 font-semibold text-red-800 mb-2">
                    ⚠️ Error Details
                  </h3>
                  <ul className="max-h-48 overflow-y-auto space-y-2 text-sm text-gray-700">
                    {uploadResult.errors.map((err) => (
                      <li key={err.row} className="flex gap-2">
                        <span className="font-semibold text-red-600">
                          Row {err.row}:
                        </span>
                        <span>
                          {Array.isArray(err.errors)
                            ? err.errors.join(", ")
                            : err.errors || "Unknown error"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={downloadErrorsAsCSV}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-yellow-400 text-yellow-900 py-2 rounded-lg hover:bg-yellow-500 transition"
                  >
                    <ArrowDownToLine className="w-5 h-5" />
                    Download Errors CSV
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
