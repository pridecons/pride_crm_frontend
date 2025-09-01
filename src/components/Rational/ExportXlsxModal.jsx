"use client";

import React, { useState, useEffect } from "react";
import { usePermissions } from "@/context/PermissionsContext";
import { axiosInstance } from "@/api/Axios";

function ExportXlsxModal({ onClose }) {
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(false);

  const [researchers, setResearchers] = useState([]);
  const [recTypes, setRecTypes] = useState([]);
  const [statuses, setStatuses] = useState([
    // fallback; will be replaced if API provides a list
    "OPEN",
    "TARGET1_HIT",
    "TARGET2_HIT",
    "TARGET3_HIT",
    "STOP_LOSS_HIT",
    "CLOSED",
  ]);

  const [filters, setFilters] = useState({
    user_id: "",
    stock_name: "",
    status: "",
    recommendation_type: "",
    date_from: "",
    date_to: "",
    sort_order: "desc",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Load dropdown data on mount
  useEffect(() => {
    let alive = true;

    const loadResearchers = async () => {
      try {
        const res = await axiosInstance.get("/users/", {
          params: { skip: 0, limit: 100, active_only: false, role: "RESEARCHER" },
        });
        const data = Array.isArray(res?.data?.data) ? res.data.data : [];
        if (alive) setResearchers(data);
      } catch (error) {
        console.error("Failed to load researchers:", error);
        if (alive) setResearchers([]);
      }
    };

    const loadRecTypes = async () => {
      try {
        const res = await axiosInstance.get("/profile-role/recommendation-type");
        const items = Array.isArray(res?.data) ? res.data : [];
        if (alive) setRecTypes(items);
      } catch (error) {
        console.error("Failed to load recommendation types:", error);
        if (alive) setRecTypes([]);
      }
    };

    // const loadStatuses = async () => {
    //   try {
    //     // If you have a dedicated statuses endpoint, keep this call.
    //     // const res = await axiosInstance.get("/recommendations/statuses");
    //     const items = Array.isArray(res?.data) ? res.data : [];
    //     if (items.length && alive) setStatuses(items);
    //   } catch {
    //     // keep fallback
    //   }
    // };

    loadResearchers();
    loadRecTypes();
    // loadStatuses();

    return () => {
      alive = false;
    };
  }, []);

  const handleExport = async () => {
    if (!filters.sort_order) {
      alert("Please select a sort order.");
      return;
    }

    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v != null)
      );

      const res = await axiosInstance.get("/recommendations/xlsx/export", {
        params,
        responseType: "blob",
      });

      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i);
      const filename = match ? decodeURIComponent(match[2]) : "recommendations.xlsx";

      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
      onClose?.();
    }
  };

  const handleClose = () => onClose?.();

  if (!hasPermission("rational_export_xlsx")) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-lg relative">
        <button
          onClick={handleClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
        >
          &times;
        </button>

        <h2 className="text-lg font-semibold mb-4">Export Recommendations (XLSX)</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Researchers (dynamic) */}
          <select
            name="user_id"
            value={filters.user_id}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Researchers</option>
            {researchers.map((user) => (
              <option key={user.employee_code} value={user.employee_code}>
                {user.name}
              </option>
            ))}
          </select>

          {/* Stock Name */}
          <input
            type="text"
            name="stock_name"
            value={filters.stock_name}
            onChange={handleChange}
            placeholder="Stock Name"
            className="border rounded px-3 py-2 text-sm"
          />

          {/* Status (dynamic if endpoint exists; else fallback above) */}
          <select
            name="status"
            value={filters.status}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Recommendation Type (dynamic) */}
          <select
            name="recommendation_type"
            value={filters.recommendation_type}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {recTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Dates */}
          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          />

          {/* Sort order */}
          <select
            name="sort_order"
            value={filters.sort_order}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
            required
          >
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={handleClose} className="px-4 py-2 bg-gray-300 rounded-md">
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md"
            disabled={loading}
          >
            {loading ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportXlsxModal;