"use client";

import React, { useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";
import { useTheme } from "@/context/ThemeContext";

function ExportXlsxModal({ onClose }) {
  const { themeConfig } = useTheme();
  const [loading, setLoading] = useState(false);
  const [researchers, setResearchers] = useState([]);
  const [recTypes, setRecTypes] = useState([]);
  const [statuses] = useState([
    "OPEN","TARGET1_HIT","TARGET2_HIT","TARGET3_HIT","STOP_LOSS_HIT","CLOSED",
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axiosInstance.get("/users/", {
          params: { skip: 0, limit: 100, active_only: false, role: "RESEARCHER" },
        });
        const data = Array.isArray(res?.data?.data) ? res.data.data : [];
        if (alive) setResearchers(data);
      } catch { if (alive) setResearchers([]); }

      try {
        const res = await axiosInstance.get("/profile-role/recommendation-type");
        const items = Array.isArray(res?.data) ? res.data : [];
        if (alive) setRecTypes(items);
      } catch { if (alive) setRecTypes([]); }
    })();
    return () => { alive = false; };
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v != null)
      );

      const res = await axiosInstance.get("/recommendations/xlsx/export", {
        params,
        responseType: "arraybuffer", // safest for XLSX
      });

      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i);
      const filename = match ? decodeURIComponent(match[2]) : "recommendations.xlsx";

      const contentType =
        res.headers?.["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
      onClose?.();
    }
  };

  const inputCls =
    "rounded px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]";
  const inputStyle = {
    background: "var(--theme-input-background)",
    color: "var(--theme-text)",
    borderColor: "var(--theme-border)",
    accentColor: "var(--theme-primary)",
  };

  return (
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
        <button onClick={() => onClose?.()}
                className="absolute top-3 right-4 text-xl"
                style={{ color: "var(--theme-text-muted)" }}
                title="Close">
          &times;
        </button>

        <h2 className="text-lg font-semibold mb-4">Export Recommendations (XLSX)</h2>

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
            {statuses.map((st) => (<option key={st} value={st}>{st}</option>))}
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

          <select name="sort_order" value={filters.sort_order}
                  onChange={handleChange} className={inputCls} style={inputStyle} required>
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => onClose?.()}
                  className="px-4 py-2 rounded-md border"
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
                    background: "var(--theme-primary)",
                    color: "var(--theme-primary-contrast)",
                  }}
                  disabled={loading}>
            {loading ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportXlsxModal;
