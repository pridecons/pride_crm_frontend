"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownToLine } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { axiosInstance } from "@/api/Axios";

const ExportPdfModal = ({ open, onClose }) => {
  const { hasPermission } = usePermissions();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [researchers, setResearchers] = useState([]);
  const [recTypes, setRecTypes] = useState([]);
  const [statuses, setStatuses] = useState([
    // fallback list, replaced if API returns dynamic statuses
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // keep internal state in sync with parent
  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  // load researchers when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    const loadResearchers = async () => {
      try {
        const res = await axiosInstance.get(
          "/users/",
          {
            params: {
              skip: 0,
              limit: 100,
              active_only: false,
              role: "RESEARCHER",
            },
          }
        );
        const data = Array.isArray(res?.data?.data) ? res.data.data : [];
        if (alive) setResearchers(data);
      } catch (err) {
        console.error("Failed to load researchers:", err);
        if (alive) setResearchers([]);
      }
    };

    const loadRecTypes = async () => {
      try {
        const res = await axiosInstance.get(
          "/profile-role/recommendation-type"
        );
        const items = Array.isArray(res?.data) ? res.data : [];
        if (alive) setRecTypes(items);
      } catch (err) {
        console.error("Failed to load recommendation types:", err);
        if (alive) setRecTypes([]);
      }
    };

    // const loadStatuses = async () => {
    //   try {
    //     // If you have a proper API for statuses, keep this.
    //     // If not, it will just keep the fallback list above.
    //     const res = await axiosInstance.get("/recommendations/statuses");
    //     const items = Array.isArray(res?.data) ? res.data : [];
    //     if (items.length && alive) setStatuses(items);
    //   } catch {
    //     /* noop: fallback stays */
    //   }
    // };

    loadResearchers();
    loadRecTypes();
    // loadStatuses();

    return () => {
      alive = false;
    };
  }, [isOpen]);

  const handleExport = async () => {
    setLoading(true);

    try {
      const res = await axiosInstance.get(
        "/recommendations/pdfs/export",
        {
          params: Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v !== "" && v != null)
          ),
          responseType: "blob",
        }
      );

      // determine filename from Content-Disposition, else default
      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i);
      const filename = match ? decodeURIComponent(match[2]) : "recommendations.zip";

      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setLoading(false);
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      {hasPermission("rational_export_pdf") && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-2 py-2 bg-blue-600 text-white rounded-md w-auto whitespace-nowrap"
        >
          <div className="flex items-center gap-1">
            <ArrowDownToLine className="h-4" />
            <span>PDF</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-lg relative">
            <button
              onClick={handleClose}
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>

            <h2 className="text-lg font-semibold mb-4">
              Export Recommendations PDF
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Researchers */}
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

              {/* Status (dynamic if API available) */}
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

              {/* Recommendation Types (dynamic) */}
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
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-300 rounded-md"
              >
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
      )}
    </>
  );
};

export default ExportPdfModal;