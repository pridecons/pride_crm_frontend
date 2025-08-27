import React, { useState, useEffect } from "react";
import { ArrowDownToLine } from "lucide-react";
import { usePermissions } from '@/context/PermissionsContext';


const  ExportPdfModal = ({ open, onClose }) => {
  const { hasPermission } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [researchers, setResearchers] = useState([]);

  const [filters, setFilters] = useState({
    user_id: "",
    stock_name: "",
    status: "",
    recommendation_type: "",
    date_from: "",
    date_to: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Fix: Update internal state when external prop changes
  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    console.log("Dropdown is now:", isOpen ? "open" : "closed");
  }, [isOpen]);

  // 🔽 Fetch researcher list when modal opens
  useEffect(() => {
    const fetchResearchers = async () => {
      try {
        const res = await fetch(
          "https://crm.24x7techelp.com/api/v1/users/?skip=0&limit=100&active_only=false&role=RESEARCHER",
          {
            headers: {
              accept: "application/json",
            },
          }
        );
        const data = await res.json();

        if (Array.isArray(data.data)) {
          setResearchers(data.data);
        } else {
          setResearchers([]);
          console.warn("Unexpected researcher response shape:", data);
        }
      } catch (error) {
        console.error("Failed to load researchers:", error);
        setResearchers([]);
      }
    };

    if (isOpen) {
      fetchResearchers();
    }
  }, [isOpen]);

  const handleExport = async () => {
    setLoading(true);
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    try {
      const res = await fetch(
        `https://crm.24x7techelp.com/api/v1/recommendations/pdfs/export?${params}`,
        {
          method: "GET",
          headers: {
            Accept: "*/*"
          }
        }
      );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recommendations.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setLoading(false);
      setIsOpen(false);
      if (onClose) onClose(); // Call parent's onClose
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose(); // Call parent's onClose
  };

  return (
    <>
      {hasPermission("rational_export_pdf") && <button
        onClick={() => setIsOpen(true)}
        className="px-2 py-2 bg-blue-600 text-white rounded-md w-auto whitespace-nowrap"
      >
        <div className="flex items-center gap-1">
          <ArrowDownToLine className="h-4" />
          <span>PDF</span>
        </div>
      </button>}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-lg relative">
            <button
              onClick={handleClose}
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>

            <h2 className="text-lg font-semibold mb-4">Export Recommendations PDF</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* 🔽 Researcher Dropdown */}
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

              <input
                type="text"
                name="stock_name"
                value={filters.stock_name}
                onChange={handleChange}
                placeholder="Stock Name"
                className="border rounded px-3 py-2 text-sm"
              />

              <select
                name="status"
                value={filters.status}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="TARGET1_HIT">TARGET1_HIT</option>
                <option value="TARGET2_HIT">TARGET2_HIT</option>
                <option value="TARGET3_HIT">TARGET3_HIT</option>
                <option value="STOP_LOSS_HIT">STOP_LOSS_HIT</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              <select
                name="recommendation_type"
                value={filters.recommendation_type}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="Equity Cash">Equity Cash</option>
                <option value="Stock Future">Stock Future</option>
                <option value="Index Future">Index Future</option>
                <option value="Stock Option">Stock Option</option>
                <option value="MCX Bullion">MCX Bullion</option>
                <option value="MCX Base Metal">MCX Base Metal</option>
                <option value="MCX Energy">MCX Energy</option>
              </select>

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
}


export default ExportPdfModal;
