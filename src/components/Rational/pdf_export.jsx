"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownToLine } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import { useTheme } from "@/context/ThemeContext";

const ExportPdfModal = ({ open, onClose }) => {
  const { themeConfig } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [researchers, setResearchers] = useState([]);
  const [recTypes, setRecTypes] = useState([]);
  const [statuses] = useState([
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

  // keep internal open state in sync with parent
  useEffect(() => setIsOpen(!!open), [open]);

  // preload dropdowns when opened
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;

    (async () => {
      try {
        const res = await axiosInstance.get("/users/", {
          params: { skip: 0, limit: 100, active_only: false, role: "RESEARCHER" },
        });
        const data = Array.isArray(res?.data?.data) ? res.data.data : [];
        if (alive) setResearchers(data);
      } catch {
        if (alive) setResearchers([]);
      }
      try {
        const res = await axiosInstance.get("/profile-role/recommendation-type");
        const items = Array.isArray(res?.data) ? res.data : [];
        if (alive) setRecTypes(items);
      } catch {
        if (alive) setRecTypes([]);
      }
    })();

    return () => { alive = false; };
  }, [isOpen]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v != null)
      );

      const res = await axiosInstance.get("/recommendations/pdfs/export", {
        params,
        responseType: "arraybuffer", // more robust across browsers
      });

      // filename
      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i);
      const filename = match ? decodeURIComponent(match[2]) : "recommendations.zip";

      // blob + download
      const contentType = res.headers?.["content-type"] || "application/zip";
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleClose = () => { setIsOpen(false); onClose?.(); };

  const inputCls =
    "rounded px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]";
  const inputStyle = {
    background: "var(--theme-input-background)",
    color: "var(--theme-text)",
    borderColor: "var(--theme-border)",
    accentColor: "var(--theme-primary)",
  };

  return (
    <>
      {/* Optional trigger for standalone use */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-2 py-2 rounded-md w-auto whitespace-nowrap transition-colors"
        style={{ background: "var(--theme-primary)", color: "var(--theme-primary-contrast)" }}
      >
        <div className="flex items-center gap-1">
          <ArrowDownToLine className="h-4" />
          <span>PDF</span>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
             style={{ background: "var(--theme-backdrop)" }}>
          <div
            className="rounded-2xl p-6 max-w-3xl w-full relative border"
            style={{
              background: "var(--theme-card-bg)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-text)",
              boxShadow: `0 10px 25px ${themeConfig.shadow}`,
            }}
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-4 text-xl"
              style={{ color: "var(--theme-text-muted)" }}
              title="Close"
            >
              &times;
            </button>

            <h2 className="text-lg font-semibold mb-4">Export Recommendations PDF</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <select name="user_id" value={filters.user_id} onChange={handleChange}
                      className={inputCls} style={inputStyle}>
                <option value="">All Researchers</option>
                {researchers.map((u) => (
                  <option key={u.employee_code} value={u.employee_code}>{u.name}</option>
                ))}
              </select>

              <input type="text" name="stock_name" value={filters.stock_name}
                     onChange={handleChange} placeholder="Stock Name"
                     className={inputCls} style={inputStyle} />

              <select name="status" value={filters.status} onChange={handleChange}
                      className={inputCls} style={inputStyle}>
                <option value="">All Status</option>
                {["OPEN","TARGET1_HIT","TARGET2_HIT","TARGET3_HIT","STOP_LOSS_HIT","CLOSED"]
                  .map((st)=> (<option key={st} value={st}>{st}</option>))}
              </select>

              <select name="recommendation_type" value={filters.recommendation_type}
                      onChange={handleChange} className={inputCls} style={inputStyle}>
                <option value="">All Types</option>
                {recTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>

              <input type="date" name="date_from" value={filters.date_from}
                     onChange={handleChange} className={inputCls} style={inputStyle} />
              <input type="date" name="date_to" value={filters.date_to}
                     onChange={handleChange} className={inputCls} style={inputStyle} />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleClose} className="px-4 py-2 rounded-md border transition-colors"
                      style={{
                        background: "var(--theme-surface)",
                        color: "var(--theme-text)",
                        borderColor: "var(--theme-border)",
                      }}>
                Cancel
              </button>
              <button onClick={handleExport}
                      className="px-4 py-2 rounded-md transition-colors disabled:opacity-60"
                      style={{
                        background: "var(--theme-success, var(--theme-primary))",
                        color: "var(--theme-on-success, var(--theme-primary-contrast))",
                      }}
                      disabled={loading}>
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
